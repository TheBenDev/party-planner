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
	"github.com/BBruington/party-planner/api/internal/config"
	"github.com/BBruington/party-planner/api/internal/db"
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

	var logger *slog.Logger
	if cfg.Environment == "development" {
		logger = slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))
	} else {
		logger = slog.New(slog.NewJSONHandler(os.Stdout, nil))
	}
	slog.SetDefault(logger)

	mux := http.NewServeMux()

	database, err := db.New(cfg.DatabaseUrl, logger)
	if err != nil {
		logger.Error("failed to open database", "error", err)
		os.Exit(1)
	}

	userPath, userHandler := plannerv1connect.NewUserServiceHandler(&rpc.UserServer{User: &service.UserService{DB: database, Log: logger}}, connect.WithInterceptors(validate.NewInterceptor()))
	mux.Handle(userPath, userHandler)

	healthServer := &rpc.HealthServer{}
	path, healthHandler := plannerv1connect.NewHealthServiceHandler(healthServer, connect.WithInterceptors(validate.NewInterceptor()))
	mux.Handle(path, healthHandler)

	mux.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok","service":"party-planner-api"}`))
	})

	apiClient := api.NewClient(cfg.AppURL, cfg.APIKey)

	session, err := bot.Start(cfg.DiscordToken, apiClient)
	if err != nil {
		slog.Error("Failed to start Discord bot", "error", err)
		os.Exit(1)
	}
	defer func() {
		if err := session.Close(); err != nil {
			slog.Error("Failed to close Discord session", "error", err)
		}
	}()

	srv := server.New(cfg.Port, mux)
	go server.Start(srv)

	slog.Info("beny-bot is running. Press Ctrl+C to exit.")

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
