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

	if metadata.ChannelID != "" {
		if _, err := s.Session.ChannelMessageSend(metadata.ChannelID, msg, discordgo.WithContext(ctx)); err != nil {
			return fmt.Errorf("discord send error: %w", err)
		}
	}

	return nil
}

func (s *DiscordService) GetPoll(ctx context.Context, channelId, pollId string) (*model.Poll, error) {
	msg, err := s.Session.ChannelMessage(channelId, pollId, discordgo.WithContext(ctx))
	if err != nil {
		return nil, fmt.Errorf("failed to fetch discord poll message: %w", err)
	}

	if msg.Poll == nil {
		return nil, errors.New("message does not contain a poll")
	}

	answers := make([]model.PollAnswer, 0, len(msg.Poll.Answers))
	for _, a := range msg.Poll.Answers {
		var text string
		if a.Media != nil {
			text = a.Media.Text
		}
		var voteCount uint32
		if msg.Poll.Results != nil {
			for _, result := range msg.Poll.Results.AnswerCounts {
				if result.ID == a.AnswerID {
					voteCount = uint32(result.Count)
					break
				}
			}
		}
		answers = append(answers, model.PollAnswer{
			Text:      text,
			VoteCount: voteCount,
		})
	}

	return &model.Poll{
		Question:    msg.Poll.Question.Text,
		Answers:     answers,
		IsFinalized: msg.Poll.Results != nil && msg.Poll.Results.Finalized,
	}, nil
}

type PollProps struct {
	ID string
}

func (s *DiscordService) PollSession(
	ctx context.Context,
	integration *model.CampaignIntegration,
	session *model.Session,
	options []time.Time,
) (*PollProps, error) {
	if integration == nil {
		return nil, errors.New("campaign integration is required")
	}
	if session == nil {
		return nil, errors.New("session is required")
	}
	if len(options) == 0 {
		return nil, errors.New("at least one poll option is required")
	}

	var metadata struct {
		ChannelID string `json:"channelId"`
	}
	if err := json.Unmarshal(integration.Metadata, &metadata); err != nil {
		return nil, fmt.Errorf("failed to parse discord integration metadata: %w", err)
	}
	if metadata.ChannelID == "" {
		return nil, errors.New("discord integration missing channel_id in metadata")
	}

	pollAnswers := make([]discordgo.PollAnswer, 0, len(options))
	for _, opt := range options {
		pollAnswers = append(pollAnswers, discordgo.PollAnswer{
			Media: &discordgo.PollMedia{
				Text: opt.UTC().Format("Mon Jan 2, 2006 3:04 PM UTC"),
			},
		})
	}

	poll, err := s.Session.ChannelMessageSendComplex(metadata.ChannelID, &discordgo.MessageSend{
		Poll: &discordgo.Poll{
			Question: discordgo.PollMedia{
				Text: fmt.Sprintf("📅 When can you make it for %s?", session.Title),
			},
			Answers:          pollAnswers,
			Duration:         24,
			AllowMultiselect: true,
		},
	}, discordgo.WithContext(ctx))
	if err != nil {
		return nil, fmt.Errorf("discord poll send error: %w", err)
	}
	_, err = s.Session.ChannelMessageSend(metadata.ChannelID, formatPollTimestamps(session.Title, options), discordgo.WithContext(ctx))
	if err != nil {
		s.Log.WarnContext(ctx, "failed to send poll timestamp message",
			"channel_id", metadata.ChannelID,
			"poll_id", poll.ID,
			"session_title", session.Title,
			"error", err,
		)
	}

	return &PollProps{ID: poll.ID}, nil
}

func (s *DiscordService) ClosePoll(ctx context.Context, channelId, pollId, sessionTitle string) {
	if _, err := s.Session.PollExpire(channelId, pollId); err != nil {
		s.Log.WarnContext(ctx, "failed to close discord poll",
			"channel_id", channelId,
			"poll_id", pollId,
			"error", err,
		)
	}
	msg := fmt.Sprintf("❌ The poll for **%s** has been closed because the session was cancelled.", sessionTitle)
	if _, err := s.Session.ChannelMessageSend(channelId, msg, discordgo.WithContext(ctx)); err != nil {
		s.Log.WarnContext(ctx, "failed to send poll cancellation message",
			"channel_id", channelId,
			"poll_id", pollId,
			"session_title", sessionTitle,
			"error", err,
		)
	}
}

func formatPollTimestamps(title string, options []time.Time) string {
	var sb strings.Builder

	fmt.Fprintf(&sb, "📅 **%s** — options in your local time:\n", title)
	for i, opt := range options {
		fmt.Fprintf(&sb, "%d. <t:%d:F>\n", i+1, opt.Unix())
	}

	return sb.String()
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
