package service

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/BBruington/party-planner/api/internal/db"
	"github.com/BBruington/party-planner/api/internal/lib"
	model "github.com/BBruington/party-planner/api/internal/models"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

type GoogleCalendarConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURI  string
}

type GoogleCalendarService struct {
	Config        GoogleCalendarConfig
	DB            *db.DB
	EncryptionKey []byte
	Log           *slog.Logger
}

func (s *GoogleCalendarService) refreshTokenIfNeeded(ctx context.Context, userID string, meta model.GoogleCalendarTokenMetadata) (*oauth2.Token, error) {
	current := &oauth2.Token{
		AccessToken:  meta.AccessToken,
		RefreshToken: meta.RefreshToken,
		Expiry:       time.UnixMilli(meta.TokenExpiry),
	}

	// will get current token if valid or new one if expired
	refreshed, err := s.oauthConfig().TokenSource(ctx, current).Token()
	if err != nil {
		return nil, fmt.Errorf("refresh oauth token: %w", err)
	}

	if refreshed.AccessToken != current.AccessToken {
		refreshToken := refreshed.RefreshToken
		if refreshToken == "" {
			refreshToken = meta.RefreshToken
		}
		updated := model.GoogleCalendarTokenMetadata{
			AccessToken:  refreshed.AccessToken,
			RefreshToken: refreshToken,
			TokenExpiry:  refreshed.Expiry.UnixMilli(),
		}
		metaJSON, err := json.Marshal(updated)
		if err != nil {
			return nil, fmt.Errorf("marshal refreshed token: %w", err)
		}
		encrypted, err := lib.Encrypt(s.EncryptionKey, metaJSON)
		if err != nil {
			return nil, fmt.Errorf("encrypt refreshed token: %w", err)
		}
		if _, err = s.DB.UpsertUserIntegration(&model.UpsertUserIntegrationRequest{
			UserID:   userID,
			Source:   model.IntegrationSourceGoogleCalendar,
			Metadata: []byte(encrypted),
		}); err != nil {
			return nil, fmt.Errorf("persist refreshed token: %w", err)
		}
		refreshed.RefreshToken = refreshToken
	}

	return refreshed, nil
}

func (s *GoogleCalendarService) decryptMeta(raw []byte) (model.GoogleCalendarTokenMetadata, error) {
	plainJSON, err := lib.Decrypt(s.EncryptionKey, string(raw))
	if err != nil {
		return model.GoogleCalendarTokenMetadata{}, fmt.Errorf("decrypt google calendar metadata: %w", err)
	}
	var meta model.GoogleCalendarTokenMetadata
	if err := json.Unmarshal(plainJSON, &meta); err != nil {
		return model.GoogleCalendarTokenMetadata{}, fmt.Errorf("unmarshal google calendar metadata: %w", err)
	}
	return meta, nil
}

func (s *GoogleCalendarService) oauthConfig() *oauth2.Config {
	return &oauth2.Config{
		ClientID:     s.Config.ClientID,
		ClientSecret: s.Config.ClientSecret,
		RedirectURL:  s.Config.RedirectURI,
		Scopes: []string{
			"https://www.googleapis.com/auth/calendar.events",
			"https://www.googleapis.com/auth/calendar.readonly",
		},
		Endpoint: google.Endpoint,
	}
}

func (s *GoogleCalendarService) getHTTPClient(ctx context.Context, userID string) (*http.Client, error) {
	integration, err := s.DB.GetUserIntegration(userID, model.IntegrationSourceGoogleCalendar)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrUserIntegrationNotFound
		}
		return nil, fmt.Errorf("get user integration: %w", err)
	}
	meta, err := s.decryptMeta(integration.Metadata)
	if err != nil {
		return nil, fmt.Errorf("decrypt google calendar metadata: %w", err)
	}
	token, err := s.refreshTokenIfNeeded(ctx, userID, meta)
	if err != nil {
		return nil, fmt.Errorf("refresh google calendar token: %w", err)
	}
	return s.oauthConfig().Client(ctx, token), nil
}

func (s *GoogleCalendarService) Connect(ctx context.Context, userID, code string) error {
	token, err := s.oauthConfig().Exchange(ctx, code)
	if err != nil {
		return fmt.Errorf("google oauth exchange: %w", err)
	}
	if token.AccessToken == "" || token.RefreshToken == "" {
		return errors.New("google oauth did not return required tokens")
	}

	meta := model.GoogleCalendarTokenMetadata{
		AccessToken:  token.AccessToken,
		RefreshToken: token.RefreshToken,
		TokenExpiry:  token.Expiry.UnixMilli(),
	}
	metaJSON, err := json.Marshal(meta)
	if err != nil {
		return fmt.Errorf("marshal google calendar metadata: %w", err)
	}
	encrypted, err := lib.Encrypt(s.EncryptionKey, metaJSON)
	if err != nil {
		return fmt.Errorf("encrypt google calendar metadata: %w", err)
	}

	_, err = s.DB.UpsertUserIntegration(&model.UpsertUserIntegrationRequest{
		UserID:   userID,
		Source:   model.IntegrationSourceGoogleCalendar,
		Metadata: []byte(encrypted),
	})
	return err
}

func (s *GoogleCalendarService) Disconnect(ctx context.Context, userID string) error {
	return s.DB.DeleteUserIntegration(userID, model.IntegrationSourceGoogleCalendar)
}

func (s *GoogleCalendarService) GetStatus(ctx context.Context, userID string) (bool, error) {
	result, err := s.DB.GetUserIntegration(userID, model.IntegrationSourceGoogleCalendar)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, fmt.Errorf("get user integration: %w", err)
	}
	return result != nil, nil
}

type freebusyRequest struct {
	TimeMin string              `json:"timeMin"`
	TimeMax string              `json:"timeMax"`
	Items   []map[string]string `json:"items"`
}

type freebusyResponse struct {
	Calendars map[string]struct {
		Busy []struct {
			Start string `json:"start"`
			End   string `json:"end"`
		} `json:"busy"`
	} `json:"calendars"`
}

func (s *GoogleCalendarService) CheckConflicts(ctx context.Context, campaignID string, startsAt time.Time, durationMinutes int32) ([]model.CalendarConflict, error) {
	members, err := s.DB.ListUserIntegrationsByCampaign(campaignID, model.IntegrationSourceGoogleCalendar)
	if err != nil {
		return nil, fmt.Errorf("list campaign member integrations: %w", err)
	}

	startTime := startsAt.UTC()
	endTime := startTime.Add(time.Duration(durationMinutes) * time.Minute)

	conf := s.oauthConfig()
	var conflicts []model.CalendarConflict

	for _, m := range members {
		meta, err := s.decryptMeta(m.Metadata)
		if err != nil {
			s.Log.WarnContext(ctx, "failed to decrypt google calendar metadata", "userId", m.UserID, "error", err)
			continue
		}

		token, err := s.refreshTokenIfNeeded(ctx, m.UserID, meta)
		if err != nil {
			s.Log.WarnContext(ctx, "failed to refresh google calendar token", "userId", m.UserID, "error", err)
			continue
		}
		httpClient := conf.Client(ctx, token)

		busy, err := s.queryFreebusy(ctx, httpClient, startTime, endTime)
		if err != nil {
			s.Log.WarnContext(ctx, "failed to query google calendar freebusy", "userId", m.UserID, "error", err)
			continue
		}
		if len(busy) > 0 {
			slots := make([]model.CalendarEventWindow, 0, len(busy))
			for _, b := range busy {
				slots = append(slots, model.CalendarEventWindow{Start: b.Start, End: b.End})
			}
			conflicts = append(conflicts, model.CalendarConflict{
				UserID:    m.UserID,
				BusySlots: slots,
			})
		}
	}
	return conflicts, nil
}

type calendarEventTime struct {
	DateTime string `json:"dateTime"`
	TimeZone string `json:"timeZone,omitempty"`
}

type calendarEventRequest struct {
	Summary     string            `json:"summary"`
	Description string            `json:"description,omitempty"`
	Start       calendarEventTime `json:"start"`
	End         calendarEventTime `json:"end"`
	Recurrence  []string          `json:"recurrence,omitempty"`
}

type calendarEventResponse struct {
	ID string `json:"id"`
}

func (s *GoogleCalendarService) SyncSession(ctx context.Context, userID string, series model.SessionSeries, exceptions []time.Time) (string, error) {
	startTime, err := buildStartTime(series)
	if err != nil {
		return "", err
	}
	endTime := startTime.Add(time.Duration(series.DurationMinutes) * time.Minute)

	description := ""
	if series.Description.Valid {
		description = series.Description.String
	}

	recurrence := buildRecurrence(series, exceptions)

	eventID, err := s.createCalendarEvent(ctx, userID, startTime, endTime, series.Timezone, series.Title, description, recurrence)
	if err != nil {
		if errors.Is(err, errInsufficientCalendarScope) {
			s.Log.WarnContext(ctx, "skipping calendar sync: token lacks write scope, user must reconnect", "userId", userID)
			return "", errInsufficientCalendarScope
		}
		return "", fmt.Errorf("create calendar event: %w", err)
	}
	return eventID, nil
}

func buildStartTime(series model.SessionSeries) (time.Time, error) {
	if !series.StartTime.Valid || series.StartTime.String == "" {
		return time.Time{}, ErrSeriesMissingStartTime
	}
	loc, err := time.LoadLocation(series.Timezone)
	if err != nil {
		return time.Time{}, fmt.Errorf("load series timezone %q: %w", series.Timezone, err)
	}
	var hour, minute int
	if _, err := fmt.Sscanf(series.StartTime.String, "%d:%d", &hour, &minute); err != nil {
		return time.Time{}, fmt.Errorf("parse series start time %q: %w", series.StartTime.String, err)
	}
	startDate := series.SeriesStartDate.In(loc)
	return time.Date(startDate.Year(), startDate.Month(), startDate.Day(), hour, minute, 0, 0, time.UTC), nil
}

func buildRecurrence(series model.SessionSeries, exceptions []time.Time) []string {
	if !series.RRule.Valid || series.RRule.String == "" {
		return nil
	}
	rruleStr := series.RRule.String
	if !strings.HasPrefix(rruleStr, "RRULE:") {
		rruleStr = "RRULE:" + rruleStr
	}
	recurrence := []string{rruleStr}
	for _, exception := range exceptions {
		recurrence = append(recurrence, "EXDATE:"+exception.UTC().Format("20060102T150405")+"Z")
	}
	return recurrence
}

var errInsufficientCalendarScope = errors.New("google calendar token lacks write scope — user must reconnect")

func (s *GoogleCalendarService) createCalendarEvent(ctx context.Context, userID string, start, end time.Time, timezone, title, description string, recurrence []string) (string, error) {

	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	client, err := s.getHTTPClient(ctx, userID)
	if err != nil {
		return "", err
	}

	loc, err := time.LoadLocation(timezone)
	if err != nil {
		return "", fmt.Errorf("load timezone %q: %w", timezone, err)
	}

	body, err := json.Marshal(calendarEventRequest{
		Summary:     title,
		Description: description,
		Start:       calendarEventTime{DateTime: start.In(loc).Format(time.RFC3339), TimeZone: timezone},
		End:         calendarEventTime{DateTime: end.In(loc).Format(time.RFC3339), TimeZone: timezone},
		Recurrence:  recurrence,
	})
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://www.googleapis.com/calendar/v3/calendars/primary/events",
		strings.NewReader(string(body)),
	)
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer func() {
		if closeErr := resp.Body.Close(); closeErr != nil {
			s.Log.Warn("failed to close calendar event response body", "error", closeErr)
		}
	}()

	if resp.StatusCode == http.StatusForbidden || resp.StatusCode == http.StatusUnauthorized {
		return "", errInsufficientCalendarScope
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("calendar events insert returned status %d", resp.StatusCode)
	}

	var calResp calendarEventResponse
	if err := json.NewDecoder(resp.Body).Decode(&calResp); err != nil {
		return "", fmt.Errorf("decode calendar event response: %w", err)
	}
	return calResp.ID, nil
}

func (s *GoogleCalendarService) RemoveCalendarEvent(ctx context.Context, userID, calendarEventID string) error {
	if err := s.deleteCalendarEvent(ctx, userID, calendarEventID); err != nil {
		if errors.Is(err, errInsufficientCalendarScope) {
			s.Log.WarnContext(ctx, "skipping calendar remove: token lacks write scope, user must reconnect", "userId", userID)
			return errInsufficientCalendarScope
		}
		return fmt.Errorf("delete calendar event: %w", err)
	}
	return nil
}

func (s *GoogleCalendarService) deleteCalendarEvent(ctx context.Context, userID, calendarEventID string) error {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	client, err := s.getHTTPClient(ctx, userID)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodDelete,
		"https://www.googleapis.com/calendar/v3/calendars/primary/events/"+calendarEventID,
		nil,
	)
	if err != nil {
		return err
	}

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer func() {
		if closeErr := resp.Body.Close(); closeErr != nil {
			s.Log.Warn("failed to close delete calendar event response body", "error", closeErr)
		}
	}()

	if resp.StatusCode == http.StatusForbidden || resp.StatusCode == http.StatusUnauthorized {
		return errInsufficientCalendarScope
	}
	if resp.StatusCode != http.StatusNoContent {
		return fmt.Errorf("calendar events delete returned status %d", resp.StatusCode)
	}
	return nil
}

func (s *GoogleCalendarService) queryFreebusy(ctx context.Context, client *http.Client, start, end time.Time) ([]struct{ Start, End time.Time }, error) {
	body, err := json.Marshal(freebusyRequest{
		TimeMin: start.UTC().Format(time.RFC3339),
		TimeMax: end.UTC().Format(time.RFC3339),
		Items:   []map[string]string{{"id": "primary"}},
	})
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://www.googleapis.com/calendar/v3/freeBusy",
		strings.NewReader(string(body)),
	)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer func() {
		if closeErr := resp.Body.Close(); closeErr != nil {
			s.Log.Warn("failed to close freebusy response body", "error", closeErr)
		}
	}()

	if resp.StatusCode == http.StatusForbidden || resp.StatusCode == http.StatusUnauthorized {
		return nil, errInsufficientCalendarScope
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("freebusy returned status %d", resp.StatusCode)
	}

	var fbResp freebusyResponse
	if err := json.NewDecoder(resp.Body).Decode(&fbResp); err != nil {
		return nil, err
	}

	primary, ok := fbResp.Calendars["primary"]
	if !ok {
		return nil, nil
	}

	result := make([]struct{ Start, End time.Time }, 0, len(primary.Busy))
	for _, b := range primary.Busy {
		s, err := time.Parse(time.RFC3339, b.Start)
		if err != nil {
			return nil, fmt.Errorf("parse freebusy start time: %w", err)
		}
		e, err := time.Parse(time.RFC3339, b.End)
		if err != nil {
			return nil, fmt.Errorf("parse freebusy end time: %w", err)
		}
		result = append(result, struct{ Start, End time.Time }{s.UTC(), e.UTC()})
	}
	return result, nil
}
