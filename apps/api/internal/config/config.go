package config

import (
	"fmt"
	"log/slog"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	APIKey             string
	AppURL             string
	CORSAllowedOrigins []string
	DatabaseUrl        string
	DiscordToken       string
	Environment        string
	Port               string
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
		APIKey:             os.Getenv("API_KEY"),
		AppURL:             os.Getenv("APP_URL"),
		CORSAllowedOrigins: origins,
		DatabaseUrl:        os.Getenv("DATABASE_URL"),
		DiscordToken:       os.Getenv("DISCORD_TOKEN"),
		Environment:        os.Getenv("ENVIRONMENT"),
		Port:               os.Getenv("PORT"),
	}

	if cfg.APIKey == "" {
		return nil, fmt.Errorf("API_KEY is required")
	}
	if cfg.AppURL == "" {
		return nil, fmt.Errorf("APP_URL is required")
	}
	if cfg.DiscordToken == "" {
		return nil, fmt.Errorf("DISCORD_TOKEN is required")
	}
	if cfg.DatabaseUrl == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}
	if cfg.Port == "" {
		cfg.Port = "8000"
	}

	return cfg, nil
}
