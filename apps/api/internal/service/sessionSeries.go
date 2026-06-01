package service

import (
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
	DB  *db.DB
	Log *slog.Logger
}

func (s *SessionSeriesService) Create(req *model.CreateSessionSeriesRequest) (*model.SessionSeries, error) {
	created, err := s.DB.CreateSessionSeries(req)
	if err != nil {
		if mapped := mapSessionSeriesPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("create session series error: %w", err)
	}
	return created, nil
}

func (s *SessionSeriesService) Get(id string) (*model.SessionSeries, error) {
	series, err := s.DB.GetSessionSeries(id)
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
	if _, err := s.Get(req.ID); err != nil {
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

func (s *SessionSeriesService) Remove(id string) error {
	if _, err := s.Get(id); err != nil {
		return err
	}
	if err := s.DB.RemoveSessionSeries(id); err != nil {
		return fmt.Errorf("remove session series error: %w", err)
	}
	return nil
}

func (s *SessionSeriesService) AddException(seriesID string, excludedDate time.Time) error {
	if _, err := s.Get(seriesID); err != nil {
		return err
	}
	if err := s.DB.AddSeriesException(seriesID, excludedDate); err != nil {
		return fmt.Errorf("add series exception error: %w", err)
	}
	return nil
}

func (s *SessionSeriesService) RemoveException(seriesID string, excludedDate time.Time) error {
	if _, err := s.Get(seriesID); err != nil {
		return err
	}
	if err := s.DB.RemoveSeriesException(seriesID, excludedDate); err != nil {
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
