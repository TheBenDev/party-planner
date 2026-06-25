package googlecalendar

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	model "github.com/BBruington/party-planner/api/internal/models"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

func (s *Service) oauthConfig() *oauth2.Config {
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

// RefreshTokenIfNeeded returns the current token if still valid, or a refreshed one if expired.
// The bool return is true when the token was refreshed — the caller should persist the new token.
func (s *Service) RefreshTokenIfNeeded(ctx context.Context, meta model.GoogleCalendarTokenMetadata) (*oauth2.Token, bool, error) {
	current := &oauth2.Token{
		AccessToken:  meta.AccessToken,
		RefreshToken: meta.RefreshToken,
		Expiry:       time.UnixMilli(meta.TokenExpiry),
	}

	refreshed, err := s.oauthConfig().TokenSource(ctx, current).Token()
	if err != nil {
		return nil, false, fmt.Errorf("refresh oauth token: %w", err)
	}

	if refreshed.AccessToken == current.AccessToken {
		return refreshed, false, nil
	}

	if refreshed.RefreshToken == "" {
		refreshed.RefreshToken = meta.RefreshToken
	}
	return refreshed, true, nil
}

// NewHTTPClient returns an authenticated HTTP client for the given token.
func (s *Service) NewHTTPClient(ctx context.Context, token *oauth2.Token) *http.Client {
	return s.oauthConfig().Client(ctx, token)
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
	return time.Date(startDate.Year(), startDate.Month(), startDate.Day(), hour, minute, 0, 0, loc).UTC(), nil
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

// QueryFreebusy queries the Google Calendar Freebusy API and returns the already-occupied
// time slots in the user's primary calendar that fall within [windowStart, windowEnd].
// An empty slice means the user is free for the entire window.
func (s *Service) QueryFreebusy(ctx context.Context, client *http.Client, windowStart, windowEnd time.Time) ([]struct{ Start, End time.Time }, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	requestBody, err := json.Marshal(freebusyRequest{
		TimeMin: windowStart.UTC().Format(time.RFC3339),
		TimeMax: windowEnd.UTC().Format(time.RFC3339),
		Items:   []map[string]string{{"id": "primary"}},
	})
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://www.googleapis.com/calendar/v3/freeBusy",
		strings.NewReader(string(requestBody)),
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
		return nil, ErrInsufficientCalendarScope
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("freebusy returned status %d", resp.StatusCode)
	}

	var calendarResp freebusyResponse
	if err := json.NewDecoder(resp.Body).Decode(&calendarResp); err != nil {
		return nil, err
	}

	primaryCalendar, found := calendarResp.Calendars["primary"]
	if !found {
		return nil, nil
	}

	busySlots := make([]struct{ Start, End time.Time }, 0, len(primaryCalendar.Busy))
	for _, slot := range primaryCalendar.Busy {
		slotStart, err := time.Parse(time.RFC3339, slot.Start)
		if err != nil {
			return nil, fmt.Errorf("parse freebusy start time: %w", err)
		}
		slotEnd, err := time.Parse(time.RFC3339, slot.End)
		if err != nil {
			return nil, fmt.Errorf("parse freebusy end time: %w", err)
		}
		busySlots = append(busySlots, struct{ Start, End time.Time }{slotStart.UTC(), slotEnd.UTC()})
	}
	return busySlots, nil
}
