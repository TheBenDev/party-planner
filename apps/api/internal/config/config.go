package config

import (
	"fmt"
	"log/slog"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	APIKey              string
	AppURL              string
	CORSAllowedOrigins  []string
	DatabaseUrl         string
	DiscordClientID     string
	DiscordClientSecret string
	DiscordRedirectURI  string
	DiscordToken        string
	Environment         string
	InternalAPIKey      string
	ClerkSecretKey      string
	ClerkWebhookSecret  string
	APIPort             string
	WebhookPort         string
}

func Load() (*Config, error) {

	// Load environment variables
	if err := godotenv.Load(); err != nil {
		slog.Info("Env file not loaded.")
	}
	rawOrigins := os.Getenv("CORS_ALLOWED_ORIGINS")
	var origins []string
	for _, o := range strings.Split(rawOrigins, ",") {
		o = strings.TrimSpace(o)
		if o != "" {
			origins = append(origins, o)
		}
	}
	if len(origins) == 0 {
		return nil, fmt.Errorf("CORS_ALLOWED_ORIGINS is required")
	}

	cfg := &Config{
		APIKey:              os.Getenv("API_KEY"),
		AppURL:              os.Getenv("APP_URL"),
		CORSAllowedOrigins:  origins,
		DatabaseUrl:         os.Getenv("DATABASE_URL"),
		DiscordClientID:     os.Getenv("DISCORD_CLIENT_ID"),
		DiscordClientSecret: os.Getenv("DISCORD_CLIENT_SECRET"),
		DiscordRedirectURI:  os.Getenv("DISCORD_REDIRECT_URI"),
		DiscordToken:        os.Getenv("DISCORD_TOKEN"),
		Environment:         os.Getenv("ENVIRONMENT"),
		InternalAPIKey:     os.Getenv("INTERNAL_API_KEY"),
		ClerkSecretKey:     os.Getenv("CLERK_SECRET_KEY"),
		ClerkWebhookSecret: os.Getenv("CLERK_WEBHOOK_SECRET"),
		APIPort:            os.Getenv("API_PORT"),
		WebhookPort:        os.Getenv("WEBHOOK_PORT"),
	}

	if cfg.APIKey == "" {
		return nil, fmt.Errorf("API_KEY is required")
	}
	if cfg.AppURL == "" {
		return nil, fmt.Errorf("APP_URL is required")
	}
	if cfg.DiscordClientID == "" {
		return nil, fmt.Errorf("DISCORD_CLIENT_ID is required")
	}
	if cfg.DiscordClientSecret == "" {
		return nil, fmt.Errorf("DISCORD_CLIENT_SECRET is required")
	}
	if cfg.DiscordRedirectURI == "" {
		return nil, fmt.Errorf("DISCORD_REDIRECT_URI is required")
	}
	if cfg.DiscordToken == "" {
		return nil, fmt.Errorf("DISCORD_TOKEN is required")
	}
	if cfg.ClerkSecretKey == "" {
		return nil, fmt.Errorf("CLERK_SECRET_KEY is required")
	}
	if cfg.ClerkWebhookSecret == "" {
		return nil, fmt.Errorf("CLERK_WEBHOOK_SECRET is required")
	}
	if cfg.DatabaseUrl == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}
	if cfg.APIPort == "" {
		cfg.APIPort = "8000"
	}
	if cfg.WebhookPort == "" {
		cfg.WebhookPort = os.Getenv("PORT")
	}
	if cfg.WebhookPort == "" {
		cfg.WebhookPort = "8001"
	}

	return cfg, nil
}
