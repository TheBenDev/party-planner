package service

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/BBruington/party-planner/api/internal/db"
	model "github.com/BBruington/party-planner/api/internal/models"
)

var (
	ErrSessionNotFound        = errors.New("session not found")
	ErrSessionAlreadyExists   = errors.New("session already exists")
	ErrSessionInvalidCampaign = errors.New("campaign does not exist")
)

type SessionService struct {
	DB *db.DB
}

func (s *SessionService) Create(ctx context.Context, req *model.CreateSessionRequest) (*model.Session, error) {
	created, err := s.DB.CreateSession(req)
	if err != nil {
		if mapped := mapSessionPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("create session error: %w", err)
	}
	return created, nil
}

func (s *SessionService) Get(id, campaignId string) (*model.Session, error) {
	session, err := s.DB.GetSession(id, campaignId)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrSessionNotFound
		}
		return nil, fmt.Errorf("get session error: %w", err)
	}
	return session, nil
}

func (s *SessionService) Remove(id, campaignID string) error {
	if err := s.DB.RemoveSession(id, campaignID); err != nil {
		return fmt.Errorf("remove session error: %w", err)
	}
	return nil
}

func (s *SessionService) Update(ctx context.Context, req *model.UpdateSessionRequest) (*model.Session, error) {
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
