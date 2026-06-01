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
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("Failed to load config", "error", err)
		os.Exit(1)
	}
	logger.Init(cfg.Environment)

	mux := http.NewServeMux()

	database, err := db.New(cfg.DatabaseUrl, logger.Logger)
	if err != nil {
		logger.Error("failed to open database", "error", err)
		os.Exit(1)
	}

	apiClient := api.NewClient(cfg.AppURL, cfg.APIKey)
	botDeps := &commands.BotDeps{
		Client: apiClient,
		NpcSvc: &service.NpcService{DB: database, Log: logger.Logger},
		IntegrationSvc: &service.CampaignIntegrationService{DB: database, Log: logger.Logger},
		DB: database,
	}
	session, err := bot.Start(cfg.DiscordToken, botDeps)
	if err != nil {
		slog.Error("Failed to start Discord bot", "error", err)
		os.Exit(1)
	}
	defer func() {
		if err := session.Close(); err != nil {
			slog.Error("Failed to close Discord session", "error", err)
		}
	}()

	discordService := &service.DiscordService{
		Session: session,
		Log:     logger.Logger,
		DB:      database,
		Config: service.DiscordConfig{
			ClientID:     cfg.DiscordClientID,
			ClientSecret: cfg.DiscordClientSecret,
			RedirectURI:  cfg.DiscordRedirectURI,
		},
	}

	rateLimiter := middleware.NewRateLimitInterceptor()
	interceptors := connect.WithInterceptors(validate.NewInterceptor(), rateLimiter, logger.NewLoggingInterceptor(logger.Logger))

	healthPath, healthHandler := plannerv1connect.NewHealthServiceHandler(&rpc.HealthServer{}, interceptors)
	mux.Handle(healthPath, healthHandler)

	sessionPath, sessionHandler := plannerv1connect.NewSessionServiceHandler(
		&rpc.SessionServer{
			Session: &service.SessionService{
				DB:      database,
				Discord: discordService,
				Log:     logger.Logger,
			},
			Log: logger.Logger,
		},
		interceptors,
	)
	mux.Handle(sessionPath, sessionHandler)

	sessionSeriesPath, sessionSeriesHandler := plannerv1connect.NewSessionSeriesServiceHandler(
		&rpc.SessionSeriesServer{
			SessionSeries: &service.SessionSeriesService{DB: database, Log: logger.Logger},
			Log:           logger.Logger,
		},
		interceptors,
	)
	mux.Handle(sessionSeriesPath, sessionSeriesHandler)

	campaignPath, campaignHandler := plannerv1connect.NewCampaignServiceHandler(&rpc.CampaignServer{Campaign: &service.CampaignService{DB: database, Log: logger.Logger}, Log: logger.Logger}, interceptors)
	mux.Handle(campaignPath, campaignHandler)

	campaignIntegrationPath, campaignIntegrationHandler := plannerv1connect.NewCampaignIntegrationServiceHandler(&rpc.CampaignIntegrationServer{CampaignIntegration: &service.CampaignIntegrationService{DB: database, Log: logger.Logger, Discord: discordService}, Log: logger.Logger}, interceptors)
	mux.Handle(campaignIntegrationPath, campaignIntegrationHandler)

	memberPath, memberHandler := plannerv1connect.NewMemberServiceHandler(&rpc.MemberServer{Member: &service.MemberService{DB: database, Log: logger.Logger}, Log: logger.Logger}, interceptors)
	mux.Handle(memberPath, memberHandler)

	npcPath, npcHandler := plannerv1connect.NewNonPlayerCharacterServiceHandler(&rpc.NpcServer{Npc: &service.NpcService{DB: database, Log: logger.Logger}, Log: logger.Logger}, interceptors)
	mux.Handle(npcPath, npcHandler)

	questPath, questHandler := plannerv1connect.NewQuestServiceHandler(&rpc.QuestServer{Quest: &service.QuestService{DB: database, Log: logger.Logger}, Log: logger.Logger}, interceptors)
	mux.Handle(questPath, questHandler)

	locationPath, locationHandler := plannerv1connect.NewLocationServiceHandler(&rpc.LocationServer{Location: &service.LocationService{DB: database, Log: logger.Logger}, Log: logger.Logger}, interceptors)
	mux.Handle(locationPath, locationHandler)

	userPath, userHandler := plannerv1connect.NewUserServiceHandler(&rpc.UserServer{User: &service.UserService{DB: database, Log: logger.Logger}, Log: logger.Logger}, interceptors)
	mux.Handle(userPath, userHandler)

	mux.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		if _, err := w.Write([]byte(`{"status":"ok","service":"party-planner-api"}`)); err != nil {
			slog.Error("failed to write health check response", "error", err)
		}
	})

	handler := middleware.WithCORS(cfg.CORSAllowedOrigins, middleware.WithInternalAPIKey(cfg.InternalAPIKey, logger.Logger, mux))

	srv := server.New(cfg.Port, handler)
	go server.Start(srv)

	slog.Info("beny-bot is running.")

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop
	signal.Stop(stop)

	slog.Info("Shutting down")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("Failed to shut down HTTP server gracefully", "error", err)
	}
}
