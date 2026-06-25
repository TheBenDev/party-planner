package discord

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"

	model "github.com/BBruington/party-planner/api/internal/models"
	"github.com/bwmarrin/discordgo"
)

var ErrDiscordEventNotFound = errors.New("discord scheduled event not found")

type Service struct {
	Session *discordgo.Session
	Log     *slog.Logger
	Config  Config
}

type Config struct {
	ClientID     string
	ClientSecret string
	RedirectURI  string
}

type tokenResponse struct {
	GuildID string
}

type tokenAPIResponse struct {
	Guild struct {
		ID string `json:"id"`
	} `json:"guild"`
}

func (s *Service) ExchangeOAuthCode(ctx context.Context, code string) (*tokenResponse, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
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

	var apiRes tokenAPIResponse
	if err := json.NewDecoder(resp.Body).Decode(&apiRes); err != nil {
		return nil, fmt.Errorf("failed to decode discord token response: %w", err)
	}
	if apiRes.Guild.ID == "" {
		return nil, errors.New("discord response missing guild id")
	}

	return &tokenResponse{GuildID: apiRes.Guild.ID}, nil
}

type discordScheduledEventPayload struct {
	Name               string                 `json:"name"`
	Description        string                 `json:"description,omitempty"`
	ScheduledStartTime time.Time              `json:"scheduled_start_time"`
	ScheduledEndTime   time.Time              `json:"scheduled_end_time"`
	PrivacyLevel       int                    `json:"privacy_level"`
	EntityType         int                    `json:"entity_type"`
	EntityMetadata     map[string]string      `json:"entity_metadata"`
	Status             int                    `json:"status"`
	RecurrenceRule     *discordRecurrenceRule `json:"recurrence_rule,omitempty"`
}

type discordScheduledEventResponse struct {
	ID string `json:"id"`
}

func (s *Service) CreateScheduledEvent(
	ctx context.Context,
	guildID string,
	series *model.SessionSeries,
) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	startTime := computeFirstOccurrence(series.SeriesStartDate, series.StartTime)
	if startTime == nil {
		return "", errors.New("valid start time is required to create discord event")
	}

	endTime := startTime.Add(roundDownTo15(series.DurationMinutes))

	description := ""
	if series.Description.Valid {
		description = series.Description.String
	}

	var seriesEnd *time.Time
	if series.SeriesEndDate.Valid {
		t := series.SeriesEndDate.Time.UTC()
		seriesEnd = &t
	}
	// discord go does not support events that use the frequency setting so i decided that a raw http request was required.
	payload := discordScheduledEventPayload{
		Name:               series.Title,
		Description:        description,
		ScheduledStartTime: *startTime,
		ScheduledEndTime:   endTime,
		PrivacyLevel:       2,
		EntityType:         3,
		EntityMetadata:     map[string]string{"location": "Forge + Discord Voice"},
		Status:             1,
		RecurrenceRule:     rruleToDiscordRecurrence(series.RRule, *startTime, seriesEnd),
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("discord event marshal error: %w", err)
	}

	apiURL := fmt.Sprintf("https://discord.com/api/v10/guilds/%s/scheduled-events", guildID)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, apiURL, bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("discord event request build error: %w", err)
	}
	req.Header.Set("Authorization", s.Session.Token)
	req.Header.Set("Content-Type", "application/json")

	httpClient := &http.Client{Timeout: 10 * time.Second}
	resp, err := httpClient.Do(req)

	if err != nil {
		return "", fmt.Errorf("discord scheduled event create error: %w", err)
	}
	defer func() {
		if closeErr := resp.Body.Close(); closeErr != nil {
			s.Log.Error("failed to close discord event response body", "error", closeErr)
		}
	}()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("discord scheduled event create returned status %d", resp.StatusCode)
	}

	var created discordScheduledEventResponse
	if err := json.NewDecoder(resp.Body).Decode(&created); err != nil {
		return "", fmt.Errorf("failed to decode discord event response: %w", err)
	}
	return created.ID, nil
}

func (s *Service) GetGuild(ctx context.Context, guildId string) (name string, err error) {
	ch, err := s.Session.Guild(guildId, discordgo.WithContext(ctx))
	if err != nil {
		s.Log.WarnContext(ctx, "could not verify discord channel", "guild_id", guildId, "error", err)
		return "", err
	}
	return ch.Name, nil
}
func (s *Service) GetChannel(ctx context.Context, channelID string) (name, guildID string, err error) {
	ch, err := s.Session.Channel(channelID, discordgo.WithContext(ctx))
	if err != nil {
		s.Log.WarnContext(ctx, "could not verify discord channel", "channel_id", channelID, "error", err)
		return "", "", err
	}
	return ch.Name, ch.GuildID, nil
}

func (s *Service) GetScheduledEvent(ctx context.Context, guildID, eventID string) (*model.DiscordEventInfo, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	event, err := s.Session.GuildScheduledEvent(guildID, eventID, false, discordgo.WithContext(ctx))
	if err != nil {
		var restErr *discordgo.RESTError
		if errors.As(err, &restErr) && restErr.Response != nil && restErr.Response.StatusCode == http.StatusNotFound {
			return nil, ErrDiscordEventNotFound
		}
		return nil, fmt.Errorf("get discord scheduled event: %w", err)
	}

	info := &model.DiscordEventInfo{
		GuildID:   event.GuildID,
		EventID:   event.ID,
		Name:      event.Name,
		StartTime: event.ScheduledStartTime,
		Status:    int(event.Status),
	}
	if event.ScheduledEndTime != nil {
		info.EndTime = event.ScheduledEndTime
	}
	return info, nil
}

func (s *Service) GetNotificationChannelID(integration *model.CampaignIntegration) string {
	var settings model.DiscordIntegrationSettings
	if err := json.Unmarshal(integration.Settings, &settings); err == nil && settings.SessionReminderChannel != nil {
		return settings.SessionReminderChannel.ID
	}
	var metadata model.DiscordIntegrationMetadata
	if err := json.Unmarshal(integration.Metadata, &metadata); err == nil {
		return metadata.DefaultChannel.ID
	}
	return ""
}

func (s *Service) DeleteScheduledEvent(ctx context.Context, guildID, eventID string) error {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	if err := s.Session.GuildScheduledEventDelete(guildID, eventID, discordgo.WithContext(ctx)); err != nil {
		return fmt.Errorf("delete discord scheduled event: %w", err)
	}
	return nil
}

func (s *Service) UpdateScheduledEvent(
	ctx context.Context,
	guildID string,
	eventID string,
	series *model.SessionSeries,
) error {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	startTime := computeFirstOccurrence(series.SeriesStartDate, series.StartTime)
	if startTime == nil {
		return errors.New("valid start time is required to update discord event")
	}

	endTime := startTime.Add(roundDownTo15(series.DurationMinutes))
	_, err := s.Session.GuildScheduledEventEdit(guildID, eventID, &discordgo.GuildScheduledEventParams{
		Name: series.Title,
		Description: func() string {
			if series.Description.Valid {
				return series.Description.String
			}
			return ""
		}(),
		ScheduledStartTime: startTime,
		ScheduledEndTime:   &endTime,
	}, discordgo.WithContext(ctx))
	if err != nil {
		var restErr *discordgo.RESTError
		if errors.As(err, &restErr) && restErr.Response != nil && restErr.Response.StatusCode == http.StatusNotFound {
			return ErrDiscordEventNotFound
		}
		return fmt.Errorf("discord scheduled event update error: %w", err)
	}
	return nil
}

func (s *Service) GetPoll(ctx context.Context, channelId, pollId string) (*model.Poll, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
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

func (s *Service) PollSeries(
	ctx context.Context,
	integration *model.CampaignIntegration,
	series *model.SessionSeries,
	options []time.Time,
) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	if integration == nil {
		return "", errors.New("campaign integration is required")
	}
	if series == nil {
		return "", errors.New("series is required")
	}
	if len(options) == 0 {
		return "", errors.New("at least one poll option is required")
	}
	if len(options) > 10 {
		return "", errors.New("discord can only support up to 10 options in a poll")
	}

	var integrationMetadata model.DiscordIntegrationMetadata
	if err := json.Unmarshal(integration.Metadata, &integrationMetadata); err != nil {
		return "", fmt.Errorf("failed to parse discord integration metadata: %w", err)
	}
	if integrationMetadata.DefaultChannel.ID == "" {
		return "", errors.New("discord integration missing default channel")
	}

	var integrationSettings model.DiscordIntegrationSettings
	pollLocation := time.UTC
	if err := json.Unmarshal(integration.Settings, &integrationSettings); err != nil {
		s.Log.Warn("failed to parse discord integration settings, using UTC",
			"integrationID", integration.ID,
			"externalID", integration.ExternalID,
			"error", err,
		)
	} else if integrationSettings.Timezone != "" {
		if loc, err := time.LoadLocation(integrationSettings.Timezone); err == nil {
			pollLocation = loc
		}
	}

	pollAnswers := make([]discordgo.PollAnswer, 0, len(options))
	for _, opt := range options {
		pollAnswers = append(pollAnswers, discordgo.PollAnswer{
			Media: &discordgo.PollMedia{
				Text: opt.In(pollLocation).Format("Mon Jan 2, 2006 3:04 PM MST"),
			},
		})
	}

	poll, err := s.Session.ChannelMessageSendComplex(integrationMetadata.DefaultChannel.ID, &discordgo.MessageSend{
		Poll: &discordgo.Poll{
			Question: discordgo.PollMedia{
				Text: fmt.Sprintf("📅 When can you make it for %s?", series.Title),
			},
			Answers:          pollAnswers,
			Duration:         24,
			AllowMultiselect: true,
		},
	}, discordgo.WithContext(ctx))
	if err != nil {
		return "", fmt.Errorf("discord poll send error: %w", err)
	}
	_, err = s.Session.ChannelMessageSend(integrationMetadata.DefaultChannel.ID, formatPollTimestamps(series.Title, options), discordgo.WithContext(ctx))
	if err != nil {
		s.Log.WarnContext(ctx, "failed to send poll timestamp message",
			"channel_id", integrationMetadata.DefaultChannel.ID,
			"poll_id", poll.ID,
			"series_title", series.Title,
			"error", err,
		)
	}

	return poll.ID, nil
}

func (s *Service) ClosePoll(ctx context.Context, channelId, pollId string) error {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	if _, err := s.Session.PollExpire(channelId, pollId); err != nil {
		s.Log.WarnContext(ctx, "failed to close discord poll",
			"channel_id", channelId,
			"poll_id", pollId,
			"error", err,
		)
		return err
	}
	return nil
}

func (s *Service) NotifyPollCancelled(ctx context.Context, channelId, pollId, sessionTitle string) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
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

func (s *Service) SendDiscordMessage(ctx context.Context, channelId, message string) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	discordMessage, err := s.Session.ChannelMessageSend(channelId, message, discordgo.WithContext(ctx))
	if err != nil {
		return "", fmt.Errorf("discord message send error: %w", err)
	}
	return discordMessage.ID, nil
}

func (s *Service) NotifyUpcomingOccurrence(ctx context.Context, channelID string, series *model.SessionSeries, occurrenceTime time.Time) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	unix := occurrenceTime.Unix()
	msg := fmt.Sprintf("Reminder: **%s** is coming up <t:%d:R> (<t:%d:F>). Don't forget!", series.Title, unix, unix)
	if _, err := s.Session.ChannelMessageSend(channelID, msg, discordgo.WithContext(ctx)); err != nil {
		s.Log.WarnContext(ctx, "failed to send occurrence reminder",
			"channel_id", channelID,
			"series_id", series.ID,
			"error", err,
		)
	}
}
