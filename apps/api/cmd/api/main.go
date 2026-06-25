package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"encoding/base64"

	"connectrpc.com/connect"
	"connectrpc.com/validate"
	"github.com/BBruington/party-planner/api/gen/planner/v1/plannerv1connect"
	"github.com/BBruington/party-planner/api/internal/api"
	"github.com/BBruington/party-planner/api/internal/bot"
	"github.com/BBruington/party-planner/api/internal/bot/commands"
	"github.com/BBruington/party-planner/api/internal/config"
	"github.com/BBruington/party-planner/api/internal/db"
	campaignDomain "github.com/BBruington/party-planner/api/internal/domain/campaign"
	campaignIntegrationDomain "github.com/BBruington/party-planner/api/internal/domain/campaign_integration"
	discordDomain "github.com/BBruington/party-planner/api/internal/adapter/discord"
	googleDomain "github.com/BBruington/party-planner/api/internal/adapter/google_calendar"
	locationDomain "github.com/BBruington/party-planner/api/internal/domain/location"
	memberDomain "github.com/BBruington/party-planner/api/internal/domain/member"
	npcDomain "github.com/BBruington/party-planner/api/internal/domain/npc"
	questDomain "github.com/BBruington/party-planner/api/internal/domain/quest"
	sessionDomain "github.com/BBruington/party-planner/api/internal/domain/session"
	seriesDomain "github.com/BBruington/party-planner/api/internal/domain/session_series"
	userDomain "github.com/BBruington/party-planner/api/internal/domain/user"
	userIntegrationDomain "github.com/BBruington/party-planner/api/internal/domain/user_integration"
	"github.com/BBruington/party-planner/api/internal/logger"
	"github.com/BBruington/party-planner/api/internal/middleware"
	"github.com/BBruington/party-planner/api/internal/server"
	"github.com/BBruington/party-planner/api/internal/webhook"
	discordgo "github.com/bwmarrin/discordgo"
	cron "github.com/robfig/cron/v3"
)

type appServices struct {
	Session             *sessionDomain.Service
	SessionSeries       *seriesDomain.Service
	Campaign            *campaignDomain.Service
	CampaignIntegration *campaignIntegrationDomain.Service
	Member              *memberDomain.Service
	Npc                 *npcDomain.Service
	Quest               *questDomain.Service
	Location            *locationDomain.Service
	User                *userDomain.Service
	UserIntegration     *userIntegrationDomain.Service
}

func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("Failed to load config", "error", err)
		os.Exit(1)
	}
	logger.Init(cfg.Environment)

	database, err := db.New(cfg.DatabaseUrl, logger.Logger)
	if err != nil {
		logger.Error("failed to open database", "error", err)
		os.Exit(1)
	}

	botSession, discordSvc := startBenyBot(cfg, database)
	defer func() {
		if err := botSession.Close(); err != nil {
			slog.Error("Failed to close Discord session", "error", err)
		}
	}()

	svcs, err := buildServices(database, discordSvc, cfg)
	if err != nil {
		logger.Error("build services error", "error", err)
		os.Exit(1)
	}

	rateLimiter := middleware.NewRateLimitInterceptor()
	interceptors := connect.WithInterceptors(validate.NewInterceptor(), rateLimiter, logger.NewLoggingInterceptor(logger.Logger))

	mux := http.NewServeMux()
	registerHandlers(mux, svcs, interceptors)

	handler := middleware.WithCORS(cfg.CORSAllowedOrigins, middleware.WithInternalAPIKey(cfg.InternalAPIKey, logger.Logger, mux))
	srv := server.New(cfg.APIPort, handler)
	go server.Start(srv)

	webhook.SetClerkKey(cfg.ClerkSecretKey)
	clerkHandler := &webhook.ClerkWebhookHandler{User: &userDomain.Service{DB: userDomain.NewDB(database.Raw()), Log: logger.Logger}, Secret: cfg.ClerkWebhookSecret}
	webhookMux := http.NewServeMux()
	webhookMux.Handle("POST /webhooks/clerk", clerkHandler)
	webhookMux.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	webhookSrv := server.New(cfg.WebhookPort, webhookMux)
	go server.Start(webhookSrv)

	c := startCronJobs(svcs)

	slog.Info("beny-bot is running.")

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop
	signal.Stop(stop)

	slog.Info("Shutting down")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cronCtx := c.Stop()
	select {
	case <-cronCtx.Done():
	case <-shutdownCtx.Done():
	}

	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("Failed to shut down HTTP server gracefully", "error", err)
	}
	if err := webhookSrv.Shutdown(shutdownCtx); err != nil {
		slog.Error("Failed to shut down webhook server gracefully", "error", err)
	}
}

func startBenyBot(cfg *config.Config, database *db.DB) (*discordgo.Session, *discordDomain.Service) {
	apiClient := api.NewClient(cfg.AppURL, cfg.APIKey)
	botDeps := &commands.BotDeps{
		Client:         apiClient,
		NpcSvc:         &npcDomain.Service{DB: npcDomain.NewDB(database.Raw()), Log: logger.Logger},
		IntegrationSvc: &campaignIntegrationDomain.Service{DB: campaignIntegrationDomain.NewDB(database.Raw()), Log: logger.Logger},
		DB:             database,
	}
	session, err := bot.Start(cfg.DiscordToken, botDeps)
	if err != nil {
		slog.Error("Failed to start Discord bot", "error", err)
		os.Exit(1)
	}

	discordSvc := &discordDomain.Service{
		Session: session,
		Log:     logger.Logger,
		Config: discordDomain.Config{
			ClientID:     cfg.DiscordClientID,
			ClientSecret: cfg.DiscordClientSecret,
			RedirectURI:  cfg.DiscordRedirectURI,
		},
	}
	return session, discordSvc
}

func buildServices(database *db.DB, discord *discordDomain.Service, cfg *config.Config) (*appServices, error) {
	integrationKey, err := base64.StdEncoding.DecodeString(cfg.IntegrationEncryptionKey)
	if err != nil || len(integrationKey) != 32 {
		slog.Error("INTEGRATION_ENCRYPTION_KEY is missing or invalid — Google Calendar token encryption will fail at runtime")
		return nil, fmt.Errorf("INTEGRATION_ENCRYPTION_KEY is missing or invalid (must be 32-byte base64): %w", err)

	}
	googleSvc := googleDomain.Service{
		Log: logger.Logger,
		Config: googleDomain.Config{
			ClientID:     cfg.GoogleClientID,
			ClientSecret: cfg.GoogleClientSecret,
			RedirectURI:  cfg.WebURL + "/settings/google-calendar/callback",
		},
	}
	userIntegrationSvc := &userIntegrationDomain.Service{
		DB:            userIntegrationDomain.NewDB(database.Raw()),
		Google:        &googleSvc,
		EncryptionKey: integrationKey,
		Log:           logger.Logger,
	}
	sessionSvc := &sessionDomain.Service{DB: sessionDomain.NewDB(database.Raw()), Log: logger.Logger}
	sessionSeriesSvc := &seriesDomain.Service{DB: seriesDomain.NewDB(database.Raw()), Log: logger.Logger, Discord: *discord, UserIntegration: userIntegrationSvc}
	return &appServices{
		Session:             sessionSvc,
		SessionSeries:       sessionSeriesSvc,
		Campaign:            &campaignDomain.Service{DB: campaignDomain.NewDB(database.Raw()), Log: logger.Logger},
		CampaignIntegration: &campaignIntegrationDomain.Service{DB: campaignIntegrationDomain.NewDB(database.Raw()), Log: logger.Logger, Discord: *discord},
		Member:              &memberDomain.Service{DB: memberDomain.NewDB(database.Raw()), Log: logger.Logger},
		Npc:                 &npcDomain.Service{DB: npcDomain.NewDB(database.Raw()), Log: logger.Logger},
		Quest:               &questDomain.Service{DB: questDomain.NewDB(database.Raw()), Log: logger.Logger},
		Location:            &locationDomain.Service{DB: locationDomain.NewDB(database.Raw()), Log: logger.Logger},
		User:                &userDomain.Service{DB: userDomain.NewDB(database.Raw()), Log: logger.Logger},
		UserIntegration:     userIntegrationSvc,
	}, nil
}

func registerHandlers(mux *http.ServeMux, svcs *appServices, interceptors connect.Option) {

	sessionPath, sessionHandler := plannerv1connect.NewSessionServiceHandler(
		&sessionDomain.Server{Session: svcs.Session, Log: logger.Logger}, interceptors)
	mux.Handle(sessionPath, sessionHandler)

	sessionSeriesPath, sessionSeriesHandler := plannerv1connect.NewSessionSeriesServiceHandler(
		&seriesDomain.Server{SessionSeries: svcs.SessionSeries, Log: logger.Logger}, interceptors)
	mux.Handle(sessionSeriesPath, sessionSeriesHandler)

	campaignPath, campaignHandler := plannerv1connect.NewCampaignServiceHandler(
		&campaignDomain.Server{Campaign: svcs.Campaign, Log: logger.Logger}, interceptors)
	mux.Handle(campaignPath, campaignHandler)

	campaignIntegrationPath, campaignIntegrationHandler := plannerv1connect.NewCampaignIntegrationServiceHandler(
		&campaignIntegrationDomain.Server{CampaignIntegration: svcs.CampaignIntegration, Log: logger.Logger}, interceptors)
	mux.Handle(campaignIntegrationPath, campaignIntegrationHandler)

	userIntegrationPath, userIntegrationHandler := plannerv1connect.NewUserIntegrationServiceHandler(
		&userIntegrationDomain.Server{Service: svcs.UserIntegration, Log: logger.Logger}, interceptors)
	mux.Handle(userIntegrationPath, userIntegrationHandler)

	memberPath, memberHandler := plannerv1connect.NewMemberServiceHandler(
		&memberDomain.Server{Member: svcs.Member, Log: logger.Logger}, interceptors)
	mux.Handle(memberPath, memberHandler)

	npcPath, npcHandler := plannerv1connect.NewNonPlayerCharacterServiceHandler(
		&npcDomain.Server{Npc: svcs.Npc, Log: logger.Logger}, interceptors)
	mux.Handle(npcPath, npcHandler)

	questPath, questHandler := plannerv1connect.NewQuestServiceHandler(
		&questDomain.Server{Quest: svcs.Quest, Log: logger.Logger}, interceptors)
	mux.Handle(questPath, questHandler)

	locationPath, locationHandler := plannerv1connect.NewLocationServiceHandler(
		&locationDomain.Server{Location: svcs.Location, Log: logger.Logger}, interceptors)
	mux.Handle(locationPath, locationHandler)

	userPath, userHandler := plannerv1connect.NewUserServiceHandler(
		&userDomain.Server{User: svcs.User, Log: logger.Logger}, interceptors)
	mux.Handle(userPath, userHandler)

	mux.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		if _, err := w.Write([]byte(`{"status":"ok","service":"party-planner-api"}`)); err != nil {
			slog.Error("failed to write health check response", "error", err)
		}
	})
}

func startCronJobs(svcs *appServices) *cron.Cron {
	c := cron.New(cron.WithChain(cron.SkipIfStillRunning(cron.DefaultLogger)))

	if _, err := c.AddFunc("@daily", func() {
		svcs.SessionSeries.NotifyUpcomingOccurrences(context.Background())
	}); err != nil {
		logger.Error("failed to register notify next session cron job", "error", err)
		os.Exit(1)
	}
	c.Start()
	return c
}
