package config

import (
	"fmt"
	"log/slog"
	"os"
	"strings"

	"github.com/go-playground/validator/v10"
	"github.com/joho/godotenv"
)

type Config struct {
	APIKey                   string   `validate:"required"`
	AppURL                   string   `validate:"required"`
	WebURL                   string   `validate:"required"`
	CORSAllowedOrigins       []string `validate:"required,min=1"`
	DatabaseUrl              string   `validate:"required"`
	DiscordClientID          string   `validate:"required"`
	DiscordClientSecret      string   `validate:"required"`
	DiscordRedirectURI       string   `validate:"required"`
	DiscordToken             string   `validate:"required"`
	Environment              string
	ClerkSecretKey           string `validate:"required"`
	ClerkWebhookSecret       string `validate:"required"`
	APIPort                  string
	WebhookPort              string
	GoogleClientID           string `validate:"required"`
	GoogleClientSecret       string `validate:"required"`
	IntegrationEncryptionKey string `validate:"required"`
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
		APIKey:                   os.Getenv("API_KEY"),
		AppURL:                   os.Getenv("APP_URL"),
		WebURL:                   os.Getenv("WEB_URL"),
		CORSAllowedOrigins:       origins,
		DatabaseUrl:              os.Getenv("DATABASE_URL"),
		DiscordClientID:          os.Getenv("DISCORD_CLIENT_ID"),
		DiscordClientSecret:      os.Getenv("DISCORD_CLIENT_SECRET"),
		DiscordRedirectURI:       os.Getenv("DISCORD_REDIRECT_URI"),
		DiscordToken:             os.Getenv("DISCORD_TOKEN"),
		Environment:              os.Getenv("ENVIRONMENT"),
		ClerkSecretKey:           os.Getenv("CLERK_SECRET_KEY"),
		ClerkWebhookSecret:       os.Getenv("CLERK_WEBHOOK_SECRET"),
		APIPort:                  os.Getenv("API_PORT"),
		WebhookPort:              os.Getenv("WEBHOOK_PORT"),
		GoogleClientID:           os.Getenv("GOOGLE_CLIENT_ID"),
		GoogleClientSecret:       os.Getenv("GOOGLE_CLIENT_SECRET"),
		IntegrationEncryptionKey: os.Getenv("INTEGRATION_ENCRYPTION_KEY"),
	}

	validate := validator.New()
	err := validate.Struct(cfg)

	if err != nil {
		return nil, fmt.Errorf("config validation error. missing %w", err)
	}

	if cfg.APIPort == "" {
		cfg.APIPort = "8000"
	}
	if cfg.WebhookPort == "" {
		cfg.WebhookPort = "8001"
	}

	return cfg, nil
}
