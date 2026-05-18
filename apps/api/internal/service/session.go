package service

import (
	"database/sql"
	"errors"
	"fmt"
	"log/slog"

	"github.com/BBruington/party-planner/api/internal/db"
	model "github.com/BBruington/party-planner/api/internal/models"
)

var (
	ErrSessionNotFound        = errors.New("session not found")
	ErrSessionAlreadyExists   = errors.New("session already exists")
	ErrSessionInvalidCampaign = errors.New("campaign does not exist")
)

type SessionService struct {
	DB  *db.DB
	Log *slog.Logger
}

func (s *SessionService) Create(session *model.CreateSessionRequest) (*model.Session, error) {
	created, err := s.DB.CreateSession(session)
	if err != nil {
		if mapped := mapSessionPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("create session error: %w", err)
	}
	return created, nil
}

func (s *SessionService) Get(id string) (*model.Session, error) {
	session, err := s.DB.GetSession(id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrSessionNotFound
		}
		return nil, fmt.Errorf("get session error: %w", err)
	}
	return session, nil
}

func (s *SessionService) ListByCampaign(campaignId string) ([]*model.Session, error) {
	sessions, err := s.DB.ListSessionsByCampaign(campaignId)
	if err != nil {
		return nil, fmt.Errorf("list sessions by campaign error: %w", err)
	}
	return sessions, nil
}

func (s *SessionService) Remove(id string) error {
	_, err := s.Get(id)
	if err != nil {
		return err
	}
	if err := s.DB.RemoveSession(id); err != nil {
		return fmt.Errorf("remove session error: %w", err)
	}
	return nil
}

func (s *SessionService) Update(req *model.UpdateSessionRequest) (*model.Session, error) {
	_, err := s.Get(req.ID)
	if err != nil {
		return nil, err
	}
	updated, err := s.DB.UpdateSession(req)
	if err != nil {
		if mapped := mapSessionPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("update session error: %w", err)
	}
	return updated, nil
}

func mapSessionPgError(err error) error {
	if isPgError(err, pgErrUniqueViolation) {
		return ErrSessionAlreadyExists
	}
	if isPgError(err, pgErrForeignKeyViolation) {
		switch pgConstraint(err) {
		case "fk_session_campaign_id":
			return ErrSessionInvalidCampaign
		}
	}
	return err
}
