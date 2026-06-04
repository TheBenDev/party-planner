package service

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/BBruington/party-planner/api/internal/db"
	model "github.com/BBruington/party-planner/api/internal/models"
)

var (
	ErrSessionSeriesNotFound        = errors.New("session series not found")
	ErrSessionSeriesAlreadyExists   = errors.New("session series already exists")
	ErrSessionSeriesInvalidCampaign = errors.New("campaign does not exist")
)

type SessionSeriesService struct {
	DB      *db.DB
	Log     *slog.Logger
	Session *SessionService
}

func (s *SessionSeriesService) Create(ctx context.Context, req *model.CreateSessionSeriesRequest) (*model.SessionSeries, error) {
	var created *model.SessionSeries
	var firstSession *model.Session

	firstOccurrence := computeFirstOccurrence(req.SeriesStartDate, req.StartTime, req.Timezone)

	err := s.DB.RunInTx(func(tx *db.DB) error {
		var err error
		created, err = tx.CreateSessionSeries(req)
		if err != nil {
			if mapped := mapSessionSeriesPgError(err); mapped != err {
				return mapped
			}
			return fmt.Errorf("create session series error: %w", err)
		}

		if s.Session != nil && firstOccurrence != nil {
			firstSession, err = tx.CreateSession(&model.CreateSessionRequest{
				CampaignID:       req.CampaignID,
				Title:            req.Title,
				Description:      req.Description,
				SeriesID:         sql.NullString{String: created.ID, Valid: true},
				OriginalStartsAt: sql.NullTime{Time: *firstOccurrence, Valid: true},
				Status:           model.SessionStatusDraft,
				StartsAt:         sql.NullTime{Time: *firstOccurrence, Valid: true},
			})
			if err != nil {
				return fmt.Errorf("create first session for series: %w", err)
			}
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	// Discord sync is best-effort and runs after the transaction commits
	if firstSession != nil && firstSession.SeriesID.Valid && firstSession.StartsAt.Valid && firstSession.StartsAt.Time.After(time.Now()) {
		integration, intErr := s.DB.GetCampaignIntegration(created.CampaignID, model.IntegrationSourceDiscord)
		if intErr == nil {
			eventID, eventErr := s.Session.Discord.CreateScheduledEvent(ctx, integration.ExternalID, firstSession)
			if eventErr != nil {
				s.Log.WarnContext(ctx, "failed to create discord event for series session",
					"session_id", firstSession.ID,
					"error", eventErr,
				)
			} else if eventID != "" {
				if err := s.DB.SetSessionDiscordEventID(firstSession.ID, firstSession.CampaignID, eventID); err != nil {
					s.Log.WarnContext(ctx, "failed to persist discord_event_id for series session",
						"session_id", firstSession.ID,
						"event_id", eventID,
						"error", err,
					)
				}
			}
		}
	}

	return created, nil
}

func (s *SessionSeriesService) Get(id, campaignId string) (*model.SessionSeries, error) {
	series, err := s.DB.GetSessionSeries(id, campaignId)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrSessionSeriesNotFound
		}
		return nil, fmt.Errorf("get session series error: %w", err)
	}
	return series, nil
}

func (s *SessionSeriesService) ListByCampaign(campaignID string) ([]*model.SessionSeries, error) {
	series, err := s.DB.ListSessionSeriesByCampaign(campaignID)
	if err != nil {
		return nil, fmt.Errorf("list session series by campaign error: %w", err)
	}
	return series, nil
}

func (s *SessionSeriesService) Update(req *model.UpdateSessionSeriesRequest) (*model.SessionSeries, error) {
	if _, err := s.Get(req.ID, req.CampaignID); err != nil {
		return nil, err
	}
	updated, err := s.DB.UpdateSessionSeries(req)
	if err != nil {
		if mapped := mapSessionSeriesPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("update session series error: %w", err)
	}
	return updated, nil
}

func (s *SessionSeriesService) Remove(id, campaignID string) error {
	if _, err := s.Get(id, campaignID); err != nil {
		return err
	}
	if err := s.DB.RemoveSessionSeries(id, campaignID); err != nil {
		return fmt.Errorf("remove session series error: %w", err)
	}
	return nil
}

func (s *SessionSeriesService) AddException(seriesID, campaignID string, excludedDate time.Time) error {
	if _, err := s.Get(seriesID, campaignID); err != nil {
		return err
	}
	if err := s.DB.AddSeriesException(seriesID, campaignID, excludedDate); err != nil {
		return fmt.Errorf("add series exception error: %w", err)
	}
	return nil
}

func (s *SessionSeriesService) RemoveException(seriesID, campaignID string, excludedDate time.Time) error {
	if _, err := s.Get(seriesID, campaignID); err != nil {
		return err
	}
	if err := s.DB.RemoveSeriesException(seriesID, campaignID, excludedDate); err != nil {
		return fmt.Errorf("remove series exception error: %w", err)
	}
	return nil
}

func mapSessionSeriesPgError(err error) error {
	if isPgError(err, pgErrForeignKeyViolation) {
		switch pgConstraint(err) {
		case "fk_session_series_campaign_id":
			return ErrSessionSeriesInvalidCampaign
		}
	}
	return err
}

func computeFirstOccurrence(seriesStartDate time.Time, startTime string, timezone string) *time.Time {
	loc, err := time.LoadLocation(timezone)
	if err != nil {
		loc = time.UTC
	}

	h, m, sec, ok := parseStartTime(startTime)
	if !ok {
		return nil
	}

	year, month, day := seriesStartDate.In(loc).Date()
	t := time.Date(year, month, day, h, m, sec, 0, loc)
	return &t
}

func parseStartTime(s string) (h, m, sec int, ok bool) {
	if _, err := fmt.Sscanf(s, "%d:%d:%d", &h, &m, &sec); err == nil {
		return h, m, sec, true
	}
	if _, err := fmt.Sscanf(s, "%d:%d", &h, &m); err == nil {
		return h, m, 0, true
	}
	return 0, 0, 0, false
}
