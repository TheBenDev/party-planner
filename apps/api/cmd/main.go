package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/BBruington/party-planner/api/internal/api"
	"github.com/BBruington/party-planner/api/internal/bot"
	"github.com/BBruington/party-planner/api/internal/config"
	"github.com/BBruington/party-planner/api/internal/server"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("Failed to load config", "error", err)
		os.Exit(1)
	}

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

	srv := server.New(cfg.Port)
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
