package user_integration

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	googlecalendar "github.com/BBruington/party-planner/api/internal/adapter/google_calendar"
	"github.com/BBruington/party-planner/api/internal/lib"
	model "github.com/BBruington/party-planner/api/internal/models"
	"golang.org/x/oauth2"
)

// Domain errors.
var (
	ErrUserIntegrationNotFound   = errors.New("user integration not found")
	ErrInsufficientCalendarScope = errors.New("google calendar token lacks write scope — user must reconnect")
	ErrSeriesMissingStartTime    = errors.New("series missing start time")
)

type Store interface {
	GetUserIntegration(ctx context.Context, userID string, source model.IntegrationSource) (*model.UserIntegration, error)
	UpsertUserIntegration(ctx context.Context, req *model.UpsertUserIntegrationRequest) (*model.UserIntegration, error)
	DeleteUserIntegration(ctx context.Context, userID string, source model.IntegrationSource) error
	ListUserIntegrationsByCampaign(ctx context.Context, campaignID string, source model.IntegrationSource) ([]*model.CampaignMemberIntegration, error)
	GetCampaignIntegration(ctx context.Context, campaignID string, source model.IntegrationSource) (*model.CampaignIntegration, error)
}

// GoogleCalendarAdapter is the subset of the Google Calendar adapter used by this service.
type GoogleCalendarAdapter interface {
	ExchangeCode(ctx context.Context, code string) (*oauth2.Token, error)
	RefreshTokenIfNeeded(ctx context.Context, meta model.GoogleCalendarTokenMetadata) (*oauth2.Token, bool, error)
	NewHTTPClient(ctx context.Context, token *oauth2.Token) *http.Client
	SyncSession(ctx context.Context, client *http.Client, series model.SessionSeries, exceptions []time.Time) (string, error)
	RemoveCalendarEvent(ctx context.Context, client *http.Client, calendarEventID string) error
	QueryFreebusy(ctx context.Context, client *http.Client, start, end time.Time) ([]struct{ Start, End time.Time }, error)
}

type Service struct {
	DB            Store
	Google        GoogleCalendarAdapter
	EncryptionKey []byte
	Log           *slog.Logger
}

func (s *Service) Connect(ctx context.Context, userID, code string) error {
	token, err := s.Google.ExchangeCode(ctx, code)
	if err != nil {
		return err
	}

	encrypted, err := s.encryptMeta(model.GoogleCalendarTokenMetadata{
		AccessToken:  token.AccessToken,
		RefreshToken: token.RefreshToken,
		TokenExpiry:  token.Expiry.UnixMilli(),
	})
	if err != nil {
		return err
	}

	_, err = s.DB.UpsertUserIntegration(ctx, &model.UpsertUserIntegrationRequest{
		UserID:   userID,
		Source:   model.IntegrationSourceGoogleCalendar,
		Metadata: encrypted,
	})
	return err
}

func (s *Service) Disconnect(ctx context.Context, userID string) error {
	return s.DB.DeleteUserIntegration(ctx, userID, model.IntegrationSourceGoogleCalendar)
}

func (s *Service) GetStatus(ctx context.Context, userID string) (bool, error) {
	result, err := s.DB.GetUserIntegration(ctx, userID, model.IntegrationSourceGoogleCalendar)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return false, nil
		}
		return false, fmt.Errorf("get user integration: %w", err)
	}
	return result != nil, nil
}

func (s *Service) CheckConflicts(ctx context.Context, campaignID string, startsAt time.Time, durationMinutes int32) ([]model.CalendarConflict, error) {
	members, err := s.DB.ListUserIntegrationsByCampaign(ctx, campaignID, model.IntegrationSourceGoogleCalendar)
	if err != nil {
		return nil, fmt.Errorf("list campaign member integrations: %w", err)
	}

	startTime := startsAt.UTC()
	endTime := startTime.Add(time.Duration(durationMinutes) * time.Minute)

	var conflicts []model.CalendarConflict

	for _, member := range members {
		meta, err := s.decryptMeta(member.Metadata)
		if err != nil {
			s.Log.WarnContext(ctx, "failed to decrypt google calendar metadata", "userId", member.UserID, "error", err)
			continue
		}

		token, wasRefreshed, err := s.Google.RefreshTokenIfNeeded(ctx, meta)
		if err != nil {
			s.Log.WarnContext(ctx, "failed to refresh google calendar token", "userId", member.UserID, "error", err)
			continue
		}

		if wasRefreshed {
			if upsertErr := s.upsertToken(ctx, member.UserID, token); upsertErr != nil {
				s.Log.WarnContext(ctx, "failed to persist refreshed token", "userId", member.UserID, "error", upsertErr)
			}
		}

		client := s.Google.NewHTTPClient(ctx, token)
		busy, err := s.Google.QueryFreebusy(ctx, client, startTime, endTime)
		if err != nil {
			s.Log.WarnContext(ctx, "failed to query google calendar freebusy", "userId", member.UserID, "error", err)
			continue
		}
		if len(busy) > 0 {
			slots := make([]model.CalendarEventWindow, 0, len(busy))
			for _, b := range busy {
				slots = append(slots, model.CalendarEventWindow{Start: b.Start, End: b.End})
			}
			conflicts = append(conflicts, model.CalendarConflict{
				UserID:    member.UserID,
				BusySlots: slots,
			})
		}
	}
	return conflicts, nil
}

func (s *Service) SyncSession(ctx context.Context, userID string, series model.SessionSeries, exceptions []time.Time) (string, error) {
	client, err := s.getAuthenticatedClient(ctx, userID)
	if err != nil {
		return "", err
	}
	eventID, err := s.Google.SyncSession(ctx, client, series, exceptions)
	if errors.Is(err, googlecalendar.ErrInsufficientCalendarScope) {
		s.Log.WarnContext(ctx, "skipping calendar sync: token lacks write scope, user must reconnect", "userId", userID)
		return "", ErrInsufficientCalendarScope
	}
	if errors.Is(err, googlecalendar.ErrSeriesMissingStartTime) {
		return "", ErrSeriesMissingStartTime
	}
	return eventID, err
}

func (s *Service) RemoveCalendarEvent(ctx context.Context, userID, calendarEventID string) error {
	client, err := s.getAuthenticatedClient(ctx, userID)
	if err != nil {
		return err
	}
	err = s.Google.RemoveCalendarEvent(ctx, client, calendarEventID)
	if errors.Is(err, googlecalendar.ErrInsufficientCalendarScope) {
		s.Log.WarnContext(ctx, "skipping calendar remove: token lacks write scope, user must reconnect", "userId", userID)
		return ErrInsufficientCalendarScope
	}
	return err
}

// getAuthenticatedClient fetches the stored token, refreshes it if expired, and returns a ready-to-use HTTP client.
func (s *Service) getAuthenticatedClient(ctx context.Context, userID string) (*http.Client, error) {
	integration, err := s.DB.GetUserIntegration(ctx, userID, model.IntegrationSourceGoogleCalendar)
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

	token, wasRefreshed, err := s.Google.RefreshTokenIfNeeded(ctx, meta)
	if err != nil {
		return nil, fmt.Errorf("refresh google calendar token: %w", err)
	}

	if wasRefreshed {
		if err := s.upsertToken(ctx, userID, token); err != nil {
			return nil, fmt.Errorf("persist refreshed token: %w", err)
		}
	}

	return s.Google.NewHTTPClient(ctx, token), nil
}

func (s *Service) upsertToken(ctx context.Context, userID string, token *oauth2.Token) error {
	encrypted, err := s.encryptMeta(model.GoogleCalendarTokenMetadata{
		AccessToken:  token.AccessToken,
		RefreshToken: token.RefreshToken,
		TokenExpiry:  token.Expiry.UnixMilli(),
	})
	if err != nil {
		return err
	}
	_, err = s.DB.UpsertUserIntegration(ctx, &model.UpsertUserIntegrationRequest{
		UserID:   userID,
		Source:   model.IntegrationSourceGoogleCalendar,
		Metadata: encrypted,
	})
	return err
}

func (s *Service) decryptMeta(raw []byte) (model.GoogleCalendarTokenMetadata, error) {
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

func (s *Service) encryptMeta(meta model.GoogleCalendarTokenMetadata) (json.RawMessage, error) {
	metaJSON, err := json.Marshal(meta)
	if err != nil {
		return nil, fmt.Errorf("marshal google calendar metadata: %w", err)
	}
	encrypted, err := lib.Encrypt(s.EncryptionKey, metaJSON)
	if err != nil {
		return nil, fmt.Errorf("encrypt google calendar metadata: %w", err)
	}
	return json.RawMessage(encrypted), nil
}
