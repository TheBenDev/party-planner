package config

import (
	"fmt"
	"os"
)

type Config struct {
	APIKey       string
	AppURL       string
	DiscordToken string
	Port         string
}

func Load() (*Config, error) {
	cfg := &Config{
		APIKey:       os.Getenv("API_KEY"),
		AppURL:       os.Getenv("APP_URL"),
		DiscordToken: os.Getenv("DISCORD_TOKEN"),
		Port:         os.Getenv("PORT"),
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
	if cfg.Port == "" {
		cfg.Port = "3000"
	}

	return cfg, nil
}
