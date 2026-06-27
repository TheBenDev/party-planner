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
	CreateSession(ctx context.Context, req *model.CreateSessionRequest) (*model.Session, error)
	UpsertSessionForSeries(ctx context.Context, req *model.CreateSessionRequest) (*model.Session, error)
	GetSession(ctx context.Context, id, campaignID string) (*model.Session, error)
	ListOneOffSessionsByCampaign(ctx context.Context, campaignID string) ([]*model.Session, error)
	ListSeriesSessionsByCampaign(ctx context.Context, campaignID string) ([]*model.Session, error)
	GetNextSessionByCampaign(ctx context.Context, campaignID string) (*model.Session, error)
	RemoveSession(ctx context.Context, id, campaignID string) error
	UpdateSession(ctx context.Context, req *model.UpdateSessionRequest) (*model.Session, error)
}

type Service struct {
	DB  Store
	Log *slog.Logger
}

func (s *Service) Create(ctx context.Context, req *model.CreateSessionRequest) (*model.Session, error) {
	session, err := s.DB.CreateSession(ctx, req)
	if err != nil {
		if mapped := mapPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("create session: %w", err)
	}
	return session, nil
}

func (s *Service) UpsertForSeries(ctx context.Context, req *model.CreateSessionRequest) (*model.Session, error) {
	session, err := s.DB.UpsertSessionForSeries(ctx, req)
	if err != nil {
		if mapped := mapPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("upsert session for series: %w", err)
	}
	return session, nil
}

func (s *Service) GetByID(ctx context.Context, id, campaignID string) (*model.Session, error) {
	session, err := s.DB.GetSession(ctx, id, campaignID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get session: %w", err)
	}
	return session, nil
}

func (s *Service) ListOneOffSessions(ctx context.Context, campaignID string) ([]*model.Session, error) {
	sessions, err := s.DB.ListOneOffSessionsByCampaign(ctx, campaignID)
	if err != nil {
		return nil, fmt.Errorf("list one-off sessions: %w", err)
	}
	return sessions, nil
}

func (s *Service) ListSeriesSessions(ctx context.Context, campaignID string) ([]*model.Session, error) {
	sessions, err := s.DB.ListSeriesSessionsByCampaign(ctx, campaignID)
	if err != nil {
		return nil, fmt.Errorf("list series sessions: %w", err)
	}
	return sessions, nil
}

func (s *Service) GetNextSession(ctx context.Context, campaignID string) (*model.Session, error) {
	session, err := s.DB.GetNextSessionByCampaign(ctx, campaignID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get next session: %w", err)
	}
	return session, nil
}

func (s *Service) Remove(ctx context.Context, id, campaignID string) error {
	if err := s.DB.RemoveSession(ctx, id, campaignID); err != nil {
		return fmt.Errorf("remove session: %w", err)
	}
	return nil
}

func (s *Service) Update(ctx context.Context, req *model.UpdateSessionRequest) (*model.Session, error) {
	session, err := s.DB.UpdateSession(ctx, req)
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
