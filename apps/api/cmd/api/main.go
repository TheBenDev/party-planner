package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"connectrpc.com/connect"
	"connectrpc.com/validate"
	"github.com/BBruington/party-planner/api/gen/planner/v1/plannerv1connect"
	"github.com/BBruington/party-planner/api/internal/api"
	"github.com/BBruington/party-planner/api/internal/bot"
	"github.com/BBruington/party-planner/api/internal/bot/commands"
	"github.com/BBruington/party-planner/api/internal/config"
	"github.com/BBruington/party-planner/api/internal/db"
	"github.com/BBruington/party-planner/api/internal/logger"
	"github.com/BBruington/party-planner/api/internal/middleware"
	"github.com/BBruington/party-planner/api/internal/rpc"
	"github.com/BBruington/party-planner/api/internal/server"
	"github.com/BBruington/party-planner/api/internal/service"
	"github.com/BBruington/party-planner/api/internal/webhook"
	discordgo "github.com/bwmarrin/discordgo"
	cron "github.com/robfig/cron/v3"
)

type appServices struct {
	Discord             *service.DiscordService
	Session             *service.SessionService
	SessionSeries       *service.SessionSeriesService
	Campaign            *service.CampaignService
	CampaignIntegration *service.CampaignIntegrationService
	Member              *service.MemberService
	Npc                 *service.NpcService
	Quest               *service.QuestService
	Location            *service.LocationService
	User                *service.UserService
	Scheduler           *service.SeriesScheduler
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

	svcs := buildServices(database, discordSvc)

	rateLimiter := middleware.NewRateLimitInterceptor()
	interceptors := connect.WithInterceptors(validate.NewInterceptor(), rateLimiter, logger.NewLoggingInterceptor(logger.Logger))

	mux := http.NewServeMux()
	registerHandlers(mux, svcs, interceptors)

	handler := middleware.WithCORS(cfg.CORSAllowedOrigins, middleware.WithInternalAPIKey(cfg.InternalAPIKey, logger.Logger, mux))
	srv := server.New(cfg.APIPort, handler)
	go server.Start(srv)

	webhook.SetClerkKey(cfg.ClerkSecretKey)
	clerkHandler := &webhook.ClerkWebhookHandler{User: svcs.User, Secret: cfg.ClerkWebhookSecret}
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

func startBenyBot(cfg *config.Config, database *db.DB) (*discordgo.Session, *service.DiscordService) {
	apiClient := api.NewClient(cfg.AppURL, cfg.APIKey)
	botDeps := &commands.BotDeps{
		Client:         apiClient,
		NpcSvc:         &service.NpcService{DB: database, Log: logger.Logger},
		IntegrationSvc: &service.CampaignIntegrationService{DB: database, Log: logger.Logger},
		DB:             database,
	}
	session, err := bot.Start(cfg.DiscordToken, botDeps)
	if err != nil {
		slog.Error("Failed to start Discord bot", "error", err)
		os.Exit(1)
	}

	discordSvc := &service.DiscordService{
		Session: session,
		Log:     logger.Logger,
		DB:      database,
		Config: service.DiscordConfig{
			ClientID:     cfg.DiscordClientID,
			ClientSecret: cfg.DiscordClientSecret,
			RedirectURI:  cfg.DiscordRedirectURI,
		},
	}
	return session, discordSvc
}

func buildServices(database *db.DB, discord *service.DiscordService) *appServices {
	sessionSvc := &service.SessionService{DB: database, Discord: discord, Log: logger.Logger}
	return &appServices{
		Discord:             discord,
		Session:             sessionSvc,
		SessionSeries:       &service.SessionSeriesService{DB: database, Log: logger.Logger, Session: sessionSvc},
		Campaign:            &service.CampaignService{DB: database, Log: logger.Logger},
		CampaignIntegration: &service.CampaignIntegrationService{DB: database, Log: logger.Logger, Discord: discord},
		Member:              &service.MemberService{DB: database, Log: logger.Logger},
		Npc:                 &service.NpcService{DB: database, Log: logger.Logger},
		Quest:               &service.QuestService{DB: database, Log: logger.Logger},
		Location:            &service.LocationService{DB: database, Log: logger.Logger},
		User:                &service.UserService{DB: database, Log: logger.Logger},
		Scheduler:           &service.SeriesScheduler{DB: database, Session: sessionSvc, Log: logger.Logger},
	}
}

func registerHandlers(mux *http.ServeMux, svcs *appServices, interceptors connect.Option) {
	healthPath, healthHandler := plannerv1connect.NewHealthServiceHandler(&rpc.HealthServer{}, interceptors)
	mux.Handle(healthPath, healthHandler)

	sessionPath, sessionHandler := plannerv1connect.NewSessionServiceHandler(
		&rpc.SessionServer{Session: svcs.Session, Log: logger.Logger}, interceptors)
	mux.Handle(sessionPath, sessionHandler)

	sessionSeriesPath, sessionSeriesHandler := plannerv1connect.NewSessionSeriesServiceHandler(
		&rpc.SessionSeriesServer{SessionSeries: svcs.SessionSeries, Log: logger.Logger}, interceptors)
	mux.Handle(sessionSeriesPath, sessionSeriesHandler)

	campaignPath, campaignHandler := plannerv1connect.NewCampaignServiceHandler(
		&rpc.CampaignServer{Campaign: svcs.Campaign, Log: logger.Logger}, interceptors)
	mux.Handle(campaignPath, campaignHandler)

	campaignIntegrationPath, campaignIntegrationHandler := plannerv1connect.NewCampaignIntegrationServiceHandler(
		&rpc.CampaignIntegrationServer{CampaignIntegration: svcs.CampaignIntegration, Log: logger.Logger}, interceptors)
	mux.Handle(campaignIntegrationPath, campaignIntegrationHandler)

	memberPath, memberHandler := plannerv1connect.NewMemberServiceHandler(
		&rpc.MemberServer{Member: svcs.Member, Log: logger.Logger}, interceptors)
	mux.Handle(memberPath, memberHandler)

	npcPath, npcHandler := plannerv1connect.NewNonPlayerCharacterServiceHandler(
		&rpc.NpcServer{Npc: svcs.Npc, Log: logger.Logger}, interceptors)
	mux.Handle(npcPath, npcHandler)

	questPath, questHandler := plannerv1connect.NewQuestServiceHandler(
		&rpc.QuestServer{Quest: svcs.Quest, Log: logger.Logger}, interceptors)
	mux.Handle(questPath, questHandler)

	locationPath, locationHandler := plannerv1connect.NewLocationServiceHandler(
		&rpc.LocationServer{Location: svcs.Location, Log: logger.Logger}, interceptors)
	mux.Handle(locationPath, locationHandler)

	userPath, userHandler := plannerv1connect.NewUserServiceHandler(
		&rpc.UserServer{User: svcs.User, Log: logger.Logger}, interceptors)
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

	if _, err := c.AddFunc("@hourly", func() {
		svcs.Scheduler.CheckAndScheduleSessions(context.Background())
	}); err != nil {
		logger.Error("failed to register series scheduler cron job", "error", err)
		os.Exit(1)
	}
	if _, err := c.AddFunc("@daily", func() {
		svcs.Scheduler.NotifyNextSession(context.Background())
	}); err != nil {
		logger.Error("failed to register notify next session cron job", "error", err)
		os.Exit(1)
	}
	c.Start()
	return c
}
