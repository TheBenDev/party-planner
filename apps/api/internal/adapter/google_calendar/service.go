package googlecalendar

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	model "github.com/BBruington/party-planner/api/internal/models"
	"golang.org/x/oauth2"
)

type Config struct {
	ClientID     string
	ClientSecret string
	RedirectURI  string
}

type Service struct {
	Config Config
	Log    *slog.Logger
}

var (
	ErrInsufficientCalendarScope = errors.New("google calendar token lacks write scope — user must reconnect")
	ErrSeriesMissingStartTime    = errors.New("series has no start time set")
)

// ExchangeCode trades an OAuth authorization code for an access + refresh token pair.
func (s *Service) ExchangeCode(ctx context.Context, code string) (*oauth2.Token, error) {
	token, err := s.oauthConfig().Exchange(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("google oauth exchange: %w", err)
	}
	if token.AccessToken == "" || token.RefreshToken == "" {
		return nil, errors.New("google oauth did not return required tokens")
	}
	return token, nil
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

func (s *Service) SyncSession(ctx context.Context, client *http.Client, series model.SessionSeries, exceptions []time.Time) (string, error) {
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
	return s.createCalendarEvent(ctx, client, startTime, endTime, series.Timezone, series.Title, description, recurrence)
}

func (s *Service) createCalendarEvent(ctx context.Context, client *http.Client, start, end time.Time, timezone, title, description string, recurrence []string) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

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
		return "", ErrInsufficientCalendarScope
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

func (s *Service) RemoveCalendarEvent(ctx context.Context, client *http.Client, calendarEventID string) error {
	return s.deleteCalendarEvent(ctx, client, calendarEventID)
}

func (s *Service) deleteCalendarEvent(ctx context.Context, client *http.Client, calendarEventID string) error {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

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
		return ErrInsufficientCalendarScope
	}
	if resp.StatusCode == http.StatusNotFound {
		return nil
	}
	if resp.StatusCode != http.StatusNoContent {
		return fmt.Errorf("calendar events delete returned status %d", resp.StatusCode)
	}
	return nil
}
