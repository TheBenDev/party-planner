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
}

type calendarEventRequest struct {
	Summary     string            `json:"summary"`
	Description string            `json:"description,omitempty"`
	Start       calendarEventTime `json:"start"`
	End         calendarEventTime `json:"end"`
}

func (s *GoogleCalendarService) SyncSession(ctx context.Context, userID string, startsAt time.Time, durationMinutes int32, title, description string) (bool, error) {
	integration, err := s.DB.GetUserIntegration(userID, model.IntegrationSourceGoogleCalendar)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, fmt.Errorf("get user integration: %w", err)
	}

	meta, err := s.decryptMeta(integration.Metadata)
	if err != nil {
		return false, fmt.Errorf("decrypt google calendar metadata: %w", err)
	}

	token, err := s.refreshTokenIfNeeded(ctx, userID, meta)
	if err != nil {
		return false, fmt.Errorf("refresh google calendar token: %w", err)
	}

	startTime := startsAt.UTC()
	endTime := startTime.Add(time.Duration(durationMinutes) * time.Minute)

	httpClient := s.oauthConfig().Client(ctx, token)

	busy, err := s.queryFreebusy(ctx, httpClient, startTime, endTime)
	if err != nil {
		return false, fmt.Errorf("check freebusy: %w", err)
	}
	if len(busy) > 0 {
		return false, nil
	}

	if err := s.createCalendarEvent(ctx, httpClient, startTime, endTime, title, description); err != nil {
		if errors.Is(err, errInsufficientCalendarScope) {
			s.Log.WarnContext(ctx, "skipping calendar sync: token lacks write scope, user must reconnect", "userId", userID)
			return false, nil
		}
		return false, fmt.Errorf("create calendar event: %w", err)
	}
	return true, nil
}

var errInsufficientCalendarScope = errors.New("google calendar token lacks write scope — user must reconnect")

func (s *GoogleCalendarService) createCalendarEvent(ctx context.Context, client *http.Client, start, end time.Time, title, description string) error {
	body, err := json.Marshal(calendarEventRequest{
		Summary:     title,
		Description: description,
		Start:       calendarEventTime{DateTime: start.UTC().Format(time.RFC3339)},
		End:         calendarEventTime{DateTime: end.UTC().Format(time.RFC3339)},
	})
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://www.googleapis.com/calendar/v3/calendars/primary/events",
		strings.NewReader(string(body)),
	)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer func() {
		if closeErr := resp.Body.Close(); closeErr != nil {
			s.Log.Warn("failed to close calendar event response body", "error", closeErr)
		}
	}()

	if resp.StatusCode == http.StatusForbidden || resp.StatusCode == http.StatusUnauthorized {
		return errInsufficientCalendarScope
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("calendar events insert returned status %d", resp.StatusCode)
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
