package session

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"

	"github.com/BBruington/party-planner/api/internal/pg"
	model "github.com/BBruington/party-planner/api/internal/models"
)

// Domain errors.
var (
	ErrNotFound        = errors.New("session not found")
	ErrAlreadyExists   = errors.New("session already exists")
	ErrInvalidCampaign = errors.New("campaign does not exist")
)

type Store interface {
	CreateSession(req *model.CreateSessionRequest) (*model.Session, error)
	UpsertSessionForSeries(req *model.CreateSessionRequest) (*model.Session, error)
	GetSession(id, campaignID string) (*model.Session, error)
	ListOneOffSessionsByCampaign(campaignID string) ([]*model.Session, error)
	ListSeriesSessionsByCampaign(campaignID string) ([]*model.Session, error)
	GetNextSessionByCampaign(campaignID string) (*model.Session, error)
	RemoveSession(id, campaignID string) error
	UpdateSession(req *model.UpdateSessionRequest) (*model.Session, error)
}

type Service struct {
	DB  Store
	Log *slog.Logger
}

func (s *Service) Create(ctx context.Context, req *model.CreateSessionRequest) (*model.Session, error) {
	session, err := s.DB.CreateSession(req)
	if err != nil {
		if mapped := mapPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("create session: %w", err)
	}
	return session, nil
}

func (s *Service) UpsertForSeries(ctx context.Context, req *model.CreateSessionRequest) (*model.Session, error) {
	session, err := s.DB.UpsertSessionForSeries(req)
	if err != nil {
		if mapped := mapPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("upsert session for series: %w", err)
	}
	return session, nil
}

func (s *Service) GetByID(id, campaignID string) (*model.Session, error) {
	session, err := s.DB.GetSession(id, campaignID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get session: %w", err)
	}
	return session, nil
}

func (s *Service) ListOneOffSessions(campaignID string) ([]*model.Session, error) {
	sessions, err := s.DB.ListOneOffSessionsByCampaign(campaignID)
	if err != nil {
		return nil, fmt.Errorf("list one-off sessions: %w", err)
	}
	return sessions, nil
}

func (s *Service) ListSeriesSessions(campaignID string) ([]*model.Session, error) {
	sessions, err := s.DB.ListSeriesSessionsByCampaign(campaignID)
	if err != nil {
		return nil, fmt.Errorf("list series sessions: %w", err)
	}
	return sessions, nil
}

func (s *Service) GetNextSession(campaignID string) (*model.Session, error) {
	session, err := s.DB.GetNextSessionByCampaign(campaignID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get next session: %w", err)
	}
	return session, nil
}

func (s *Service) Remove(id, campaignID string) error {
	if err := s.DB.RemoveSession(id, campaignID); err != nil {
		return fmt.Errorf("remove session: %w", err)
	}
	return nil
}

func (s *Service) Update(ctx context.Context, req *model.UpdateSessionRequest) (*model.Session, error) {
	session, err := s.DB.UpdateSession(req)
	if err != nil {
		if mapped := mapPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("update session: %w", err)
	}
	return session, nil
}

func mapPgError(err error) error {
	if pg.IsError(err, pg.UniqueViolation) {
		return ErrAlreadyExists
	}
	if pg.IsError(err, pg.ForeignKeyViolation) && pg.Constraint(err) == "fk_session_campaign_id" {
		return ErrInvalidCampaign
	}
	return err
}
