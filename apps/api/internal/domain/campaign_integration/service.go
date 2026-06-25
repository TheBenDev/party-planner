package campaign_integration

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"

	discord_domain "github.com/BBruington/party-planner/api/internal/adapter/discord"
	model "github.com/BBruington/party-planner/api/internal/models"
	"github.com/BBruington/party-planner/api/internal/pg"
)

// Domain errors
var (
	ErrInvalidCampaign = errors.New("campaign does not exist")
	ErrNotFound        = errors.New("campaign integration not found")
	ErrAlreadyExists   = errors.New("campaign integration already exists")
	ErrInvalidChannel  = errors.New("channel does not belong to the integration's Discord server")
	ErrChannelNotFound = errors.New("discord channel not found")
)

// DiscordToken represents the response from Discord OAuth token exchange
type DiscordToken struct {
	GuildID string
}

// Store interface defines database operations
type Store interface {
	CreateCampaignIntegration(req *model.CreateCampaignIntegrationRequest) (*model.CampaignIntegration, error)
	GetCampaignIntegration(campaignID string, source model.IntegrationSource) (*model.CampaignIntegration, error)
	GetCampaignIntegrationByExternalID(externalID string, source model.IntegrationSource) (*model.CampaignIntegration, error)
	ListCampaignIntegrationsByCampaign(campaignID string) ([]*model.CampaignIntegration, error)
	RemoveCampaignIntegration(campaignID string, source model.IntegrationSource) error
	ListDiscordIntegrationsWithReminders() ([]*model.CampaignIntegration, error)
	UpdateCampaignIntegration(req *model.UpdateCampaignIntegrationRequest) (*model.CampaignIntegration, error)
}

// Service handles campaign integration business logic
type Service struct {
	DB      Store
	Discord discord_domain.Service
	Log     *slog.Logger
}

// GetByCampaign retrieves an integration by campaign and source
func (s *Service) GetByCampaign(campaignID string, source model.IntegrationSource) (*model.CampaignIntegration, error) {
	integration, err := s.DB.GetCampaignIntegration(campaignID, source)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get campaign integration: %w", err)
	}
	return integration, nil
}

// Create creates a new campaign integration
func (s *Service) Create(req *model.CreateCampaignIntegrationRequest) (*model.CampaignIntegration, error) {
	created, err := s.DB.CreateCampaignIntegration(req)
	if err != nil {
		if mapped := mapPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("create campaign integration: %w", err)
	}
	return created, nil
}

// CreateDiscord creates a new Discord integration via OAuth code exchange
func (s *Service) CreateDiscord(ctx context.Context, req *model.CreateDiscordCampaignIntegrationRequest) (*model.CampaignIntegration, error) {
	tokenRes, err := s.Discord.ExchangeOAuthCode(ctx, req.Code)
	if err != nil {
		return nil, fmt.Errorf("discord token exchange failed: %w", err)
	}

	serverName := ""
	if guildName, err := s.Discord.GetGuild(ctx, tokenRes.GuildID); err == nil {
		serverName = guildName
	}

	metadata, err := json.Marshal(model.DiscordIntegrationMetadata{
		ServerName: serverName,
		Source:     model.IntegrationSourceDiscord,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to build metadata: %w", err)
	}

	settings, err := json.Marshal(model.DiscordIntegrationSettings{
		EnableSessionReminders:     true,
		SessionCreateAnnouncements: true,
		Source:                     model.IntegrationSourceDiscord,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to build settings: %w", err)
	}

	return s.Create(&model.CreateCampaignIntegrationRequest{
		CampaignID: req.CampaignID,
		ExternalID: tokenRes.GuildID,
		Source:     model.IntegrationSourceDiscord,
		Metadata:   metadata,
		Settings:   settings,
	})
}

// ListByCampaign lists all integrations for a campaign
func (s *Service) ListByCampaign(campaignID string) ([]*model.CampaignIntegration, error) {
	integrations, err := s.DB.ListCampaignIntegrationsByCampaign(campaignID)
	if err != nil {
		return nil, fmt.Errorf("list campaign integrations: %w", err)
	}
	return integrations, nil
}

// Update updates an existing campaign integration
func (s *Service) Update(ctx context.Context, req *model.UpdateCampaignIntegrationRequest) (*model.CampaignIntegration, error) {
	switch req.Source {
	case model.IntegrationSourceDiscord:
		if req.Discord == nil {
			return nil, fmt.Errorf("discord params required")
		}
		existing, err := s.DB.GetCampaignIntegration(req.CampaignID, model.IntegrationSourceDiscord)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return nil, ErrNotFound
			}
			return nil, fmt.Errorf("get campaign integration: %w", err)
		}
		if existing == nil {
			return nil, ErrNotFound
		}
		guildID := existing.ExternalID

		var (
			existingMetadata model.DiscordIntegrationMetadata
			existingSettings model.DiscordIntegrationSettings
		)
		if err := json.Unmarshal(existing.Metadata, &existingMetadata); err != nil {
			return nil, fmt.Errorf("parse existing integration metadata: %w", err)
		}
		if err := json.Unmarshal(existing.Settings, &existingSettings); err != nil {
			return nil, fmt.Errorf("parse existing integration settings: %w", err)
		}

		if req.Discord.DefaultChannel != nil && req.Discord.DefaultChannel.ID != "" {
			name, err := s.resolveDiscordChannelName(ctx, req.Discord.DefaultChannel.ID, guildID, existingMetadata.DefaultChannel.Name)
			if err != nil {
				return nil, err
			}
			req.Discord.DefaultChannel.Name = name
		} else {
			req.Discord.DefaultChannel = &existingMetadata.DefaultChannel
		}

		if req.Discord.RecapChannel != nil && req.Discord.RecapChannel.ID != "" {
			recapFallbackName := ""
			if existingSettings.RecapChannel != nil {
				recapFallbackName = existingSettings.RecapChannel.Name
			}
			name, err := s.resolveDiscordChannelName(ctx, req.Discord.RecapChannel.ID, guildID, recapFallbackName)
			if err != nil {
				return nil, err
			}
			req.Discord.RecapChannel.Name = name
		} else {
			req.Discord.RecapChannel = existingSettings.RecapChannel
		}

		if req.Discord.SessionReminderChannel != nil && req.Discord.SessionReminderChannel.ID != "" {
			reminderFallbackName := ""
			if existingSettings.SessionReminderChannel != nil {
				reminderFallbackName = existingSettings.SessionReminderChannel.Name
			}
			name, err := s.resolveDiscordChannelName(ctx, req.Discord.SessionReminderChannel.ID, guildID, reminderFallbackName)
			if err != nil {
				return nil, err
			}
			req.Discord.SessionReminderChannel.Name = name
		} else {
			req.Discord.SessionReminderChannel = existingSettings.SessionReminderChannel
		}

		updated, err := s.DB.UpdateCampaignIntegration(req)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return nil, ErrNotFound
			}
			return nil, fmt.Errorf("update campaign integration: %w", err)
		}
		return updated, nil
	default:
		return nil, fmt.Errorf("unsupported integration source: %s", req.Source)
	}
}

// Remove removes a campaign integration
func (s *Service) Remove(campaignID string, source model.IntegrationSource) error {
	err := s.DB.RemoveCampaignIntegration(campaignID, source)
	if err != nil {
		return fmt.Errorf("remove campaign integration: %w", err)
	}
	return nil
}

// resolveDiscordChannelName validates and retrieves the name of a Discord channel
func (s *Service) resolveDiscordChannelName(ctx context.Context, channelID, guildID, fallback string) (string, error) {
	name, returnedGuildID, err := s.Discord.GetChannel(ctx, channelID)
	if err != nil {
		s.Log.WarnContext(ctx, "could not verify discord channel", "channel_id", channelID, "error", err)
		return fallback, nil
	}
	if returnedGuildID != guildID {
		return "", ErrInvalidChannel
	}
	return name, nil
}

// mapPgError maps PostgreSQL errors to domain errors
func mapPgError(err error) error {
	if pg.IsError(err, pg.UniqueViolation) {
		return ErrAlreadyExists
	}
	if pg.IsError(err, pg.ForeignKeyViolation) {
		switch pg.Constraint(err) {
		case "fk_integration_campaign_id":
			return ErrInvalidCampaign
		}
	}
	return err
}
