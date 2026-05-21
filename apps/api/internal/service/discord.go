package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/BBruington/party-planner/api/internal/db"
	model "github.com/BBruington/party-planner/api/internal/models"
	"github.com/bwmarrin/discordgo"
)

type DiscordService struct {
	Session *discordgo.Session
	Log     *slog.Logger
	DB      *db.DB
	Config  DiscordConfig
}

type DiscordConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURI  string
}

type discordTokenResponse struct {
	GuildID string
}

type discordTokenAPIResponse struct {
	Guild struct {
		ID string `json:"id"`
	} `json:"guild"`
}

func (s *DiscordService) ExchangeCode(ctx context.Context, code string) (*discordTokenResponse, error) {
	vals := url.Values{
		"client_id":     {s.Config.ClientID},
		"client_secret": {s.Config.ClientSecret},
		"code":          {code},
		"grant_type":    {"authorization_code"},
		"redirect_uri":  {s.Config.RedirectURI},
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://discord.com/api/oauth2/token", strings.NewReader(vals.Encode()))
	if err != nil {
		return nil, fmt.Errorf("discord token request failed: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("discord token request failed: %w", err)
	}

	defer func() {
		if err := resp.Body.Close(); err != nil {
			s.Log.Error("failed to close discord token response body", "error", err)
		}
	}()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("discord returned status %d", resp.StatusCode)
	}

	var apiRes discordTokenAPIResponse
	if err := json.NewDecoder(resp.Body).Decode(&apiRes); err != nil {
		return nil, fmt.Errorf("failed to decode discord token response: %w", err)
	}
	if apiRes.Guild.ID == "" {
		return nil, errors.New("discord response missing guild id")
	}

	return &discordTokenResponse{GuildID: apiRes.Guild.ID}, nil
}

func (s *DiscordService) AnnounceSession(
	ctx context.Context,
	integration *model.CampaignIntegration,
	session *model.Session,
) error {
	var metadata struct {
		ChannelID string `json:"channelId"`
	}

	if integration == nil {
		return errors.New("campaign integration is required")
	}
	if session == nil {
		return errors.New("session is required")
	}

	if !session.StartsAt.Valid {
		return errors.New("valid start time is required to announce session")
	}

	if err := json.Unmarshal(integration.Metadata, &metadata); err != nil {
		return fmt.Errorf("failed to parse discord integration metadata: %w", err)
	}

	if metadata.ChannelID == "" {
		return errors.New("discord integration missing channel_id in metadata")
	}

	endTime := session.StartsAt.Time.Add(2 * time.Hour)
	_, err := s.Session.GuildScheduledEventCreate(integration.ExternalID, &discordgo.GuildScheduledEventParams{
		Name: session.Title,
		Description: func() string {
			if session.Description.Valid {
				return session.Description.String
			}
			return ""
		}(),
		ScheduledStartTime: &session.StartsAt.Time,
		ScheduledEndTime:   &endTime,
		EntityType:         discordgo.GuildScheduledEventEntityTypeExternal,
		// TODO: support additional VTT providers later
		EntityMetadata: &discordgo.GuildScheduledEventEntityMetadata{
			Location: "Forge + Discord Voice",
		},
		PrivacyLevel: discordgo.GuildScheduledEventPrivacyLevelGuildOnly,
		Status:       discordgo.GuildScheduledEventStatusScheduled,
	}, discordgo.WithContext(ctx))

	if err != nil {
		return err
	}

	msg := formatAnnounceMessage(session)

	if _, err := s.Session.ChannelMessageSend(metadata.ChannelID, msg, discordgo.WithContext(ctx)); err != nil {
		return fmt.Errorf("discord send error: %w", err)
	}

	return nil
}

func formatAnnounceMessage(session *model.Session) string {
	if !session.StartsAt.Valid {
		return fmt.Sprintf("📅 **%s** has been scheduled — date TBD.", session.Title)
	}

	timestamp := session.StartsAt.Time.Unix()

	return fmt.Sprintf(
		"📅 **%s** is scheduled for <t:%d:F> (<t:%d:R>). See you there!",
		session.Title,
		timestamp,
		timestamp,
	)
}
