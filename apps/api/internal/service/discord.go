package service

import (
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"

	"github.com/BBruington/party-planner/api/internal/db"
	model "github.com/BBruington/party-planner/api/internal/models"
	"github.com/bwmarrin/discordgo"
)

type DiscordService struct {
	Session *discordgo.Session
	Log     *slog.Logger
	DB      *db.DB
}

func (s *DiscordService) AnnounceSession(
	integration *model.CampaignIntegration,
	session *model.Session,
) error {
	var metadata struct {
		ChannelID string `json:"channelId"`
	}

	if err := json.Unmarshal(integration.Metadata, &metadata); err != nil {
		return fmt.Errorf("failed to parse discord integration metadata: %w", err)
	}

	if metadata.ChannelID == "" {
		return errors.New("discord integration missing channel_id in metadata")
	}

	msg := formatAnnounceMessage(session)

	if _, err := s.Session.ChannelMessageSend(metadata.ChannelID, msg); err != nil {
		return fmt.Errorf("discord send error: %w", err)
	}

	return nil
}

func formatAnnounceMessage(session *model.Session) string {
	if !session.StartsAt.Valid {
		return fmt.Sprintf("📅 **%s** has been scheduled — date TBD.", session.Title)
	}

	t := session.StartsAt.Time
	// e.g. "Saturday, June 21 at 7:00 PM"
	dateStr := t.Format("Monday, January 2 at 3:04 PM")

	return fmt.Sprintf("📅 **%s** is scheduled for **%s**. See you there!", session.Title, dateStr)
}
