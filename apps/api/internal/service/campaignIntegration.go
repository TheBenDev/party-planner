package service

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"

	"github.com/BBruington/party-planner/api/internal/db"
	model "github.com/BBruington/party-planner/api/internal/models"
	"github.com/bwmarrin/discordgo"
)

var (
	ErrCampaignIntegrationInvalidCampaign = errors.New("campaign does not exist")
	ErrCampaignIntegrationNotFound        = errors.New("campaign integration not found")
	ErrCampaignIntegrationAlreadyExists   = errors.New("campaign integration already exists")
	ErrCampaignIntegrationInvalidChannel  = errors.New("channel does not belong to the integration's Discord server")
	ErrCampaignIntegrationChannelNotFound = errors.New("discord channel not found")
)

type CampaignIntegrationService struct {
	DB      *db.DB
	Discord *DiscordService
	Log     *slog.Logger
}

func (s *CampaignIntegrationService) GetByCampaign(campaignId string, source model.IntegrationSource) (*model.CampaignIntegration, error) {
	integration, err := s.DB.GetCampaignIntegration(campaignId, source)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get campaign error: %w", err)
	}

	return integration, nil
}

func (s *CampaignIntegrationService) Create(integration *model.CreateCampaignIntegrationRequest) (*model.CampaignIntegration, error) {
	created, err := s.DB.CreateCampaignIntegration(integration)

	if err != nil {
		if mapped := mapCampaignIntegrationPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("create campaign integration error: %w", err)
	}

	return created, nil
}

func (s *CampaignIntegrationService) CreateDiscordIntegration(ctx context.Context, req *model.CreateDiscordCampaignIntegrationRequest) (*model.CampaignIntegration, error) {
	tokenRes, err := s.Discord.ExchangeCode(ctx, req.Code)
	if err != nil {
		return nil, fmt.Errorf("discord token exchange failed: %w", err)
	}

	serverName := ""
	if guild, err := s.Discord.Session.Guild(tokenRes.GuildID, discordgo.WithContext(ctx)); err == nil {
		serverName = guild.Name
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

func (s *CampaignIntegrationService) ListByCampaign(campaignId string) ([]*model.CampaignIntegration, error) {
	integrations, err := s.DB.ListCampaignIntegrationsByCampaign(campaignId)
	if err != nil {
		return nil, fmt.Errorf("list campaign integrations error: %w", err)
	}
	return integrations, nil
}

func (s *CampaignIntegrationService) UpdateIntegration(ctx context.Context, req *model.UpdateCampaignIntegrationRequest) (*model.CampaignIntegration, error) {
	switch req.Source {
	case model.IntegrationSourceDiscord:
		if req.Discord == nil {
			return nil, fmt.Errorf("discord params required")
		}
		existing, err := s.DB.GetCampaignIntegration(req.CampaignID, model.IntegrationSourceDiscord)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return nil, ErrCampaignIntegrationNotFound
			}
			return nil, fmt.Errorf("get campaign integration: %w", err)
		}
		if existing == nil {
			return nil, ErrCampaignIntegrationNotFound
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
				return nil, ErrCampaignIntegrationNotFound
			}
			return nil, fmt.Errorf("update campaign integration: %w", err)
		}
		return updated, nil
	default:
		return nil, fmt.Errorf("unsupported integration source: %s", req.Source)
	}
}

func (s *CampaignIntegrationService) Remove(campaignId string, source model.IntegrationSource) error {
	err := s.DB.RemoveCampaignIntegration(campaignId, source)
	if err != nil {
		return fmt.Errorf("remove campaign integration error: %w", err)
	}
	return nil
}

func (s *CampaignIntegrationService) resolveDiscordChannelName(ctx context.Context, channelID, guildID, fallback string) (string, error) {
	ch, err := s.Discord.Session.Channel(channelID, discordgo.WithContext(ctx))
	if err != nil {
		s.Log.WarnContext(ctx, "could not verify discord channel", "channel_id", channelID, "error", err)
		return fallback, nil
	}
	if ch.GuildID != guildID {
		return "", ErrCampaignIntegrationInvalidChannel
	}
	return ch.Name, nil
}

func mapCampaignIntegrationPgError(err error) error {
	if isPgError(err, pgErrUniqueViolation) {
		return ErrCampaignIntegrationAlreadyExists
	}
	if isPgError(err, pgErrForeignKeyViolation) {
		switch pgConstraint(err) {
		case "fk_integration_campaign_id":
			return ErrCampaignIntegrationInvalidCampaign
		}
	}
	return err
}
