package service

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/BBruington/party-planner/api/internal/db"
	model "github.com/BBruington/party-planner/api/internal/models"
	"golang.org/x/sync/errgroup"
)

var (
	ErrSessionNotFound        = errors.New("session not found")
	ErrSessionAlreadyExists   = errors.New("session already exists")
	ErrSessionAlreadyPolling  = errors.New("session is already polling")
	ErrSessionInvalidCampaign = errors.New("campaign does not exist")
	ErrSessionNotConfirmed    = errors.New("session isn't confirmed")
	ErrSessionPollNotFound    = errors.New("session poll not found")
)

type SessionService struct {
	DB      *db.DB
	Discord *DiscordService
	Log     *slog.Logger
}

func (s *SessionService) Announce(ctx context.Context, sessionId string, campaignId string) error {
	session, err := s.Get(sessionId)
	if err != nil {
		return err
	}

	if session.CampaignID != campaignId {
		return ErrSessionInvalidCampaign
	}

	if session.Status != model.SessionStatusConfirmed {
		return ErrSessionNotConfirmed
	}

	integration, err := s.DB.GetCampaignIntegration(campaignId, model.IntegrationSourceDiscord)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrCampaignIntegrationNotFound
		}
		return fmt.Errorf("get campaign integration error: %w", err)
	}

	if err := s.Discord.AnnounceSession(ctx, integration, session); err != nil {
		return fmt.Errorf("announce discord session error: %w", err)
	}

	if _, err := s.DB.MarkSessionAnnounced(sessionId); err != nil {
		return fmt.Errorf("mark session announced error: %w", err)
	}

	return nil
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

func (s *SessionService) GetPoll(ctx context.Context, sessionId, campaignId string) (*model.Poll, error) {
	var (
		session     *model.Session
		integration *model.CampaignIntegration
	)

	var g errgroup.Group
	g.Go(func() error {
		var err error
		session, err = s.Get(sessionId)
		if err != nil {
			return err
		}
		if session.CampaignID != campaignId {
			return ErrSessionInvalidCampaign
		}
		if !session.PollID.Valid {
			return ErrSessionPollNotFound
		}
		return nil
	})

	g.Go(func() error {
		var err error
		integration, err = s.DB.GetCampaignIntegration(campaignId, model.IntegrationSourceDiscord)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return ErrCampaignIntegrationNotFound
			}
			return fmt.Errorf("get campaign integration error: %w", err)
		}
		return nil
	})

	if err := g.Wait(); err != nil {
		return nil, err
	}

	var metadata struct {
		ChannelID string `json:"channelId"`
	}
	if err := json.Unmarshal(integration.Metadata, &metadata); err != nil {
		return nil, fmt.Errorf("failed to parse discord integration metadata: %w", err)
	}
	if metadata.ChannelID == "" {
		return nil, errors.New("discord integration missing channel_id in metadata")
	}

	poll, err := s.Discord.GetPoll(ctx, metadata.ChannelID, session.PollID.String)
	if err != nil {
		return nil, fmt.Errorf("get discord poll error: %w", err)
	}

	return poll, nil
}

func (s *SessionService) ListByCampaign(campaignId string) ([]*model.Session, error) {
	sessions, err := s.DB.ListSessionsByCampaign(campaignId)
	if err != nil {
		return nil, fmt.Errorf("list sessions by campaign error: %w", err)
	}
	return sessions, nil
}

func (s *SessionService) Poll(ctx context.Context, sessionId string, campaignId string, options []time.Time) error {
	var (
		session     *model.Session
		integration *model.CampaignIntegration
	)

	var g errgroup.Group

	g.Go(func() error {
		var err error
		session, err = s.Get(sessionId)
		if err != nil {
			return err
		}
		if session.CampaignID != campaignId {
			return ErrSessionInvalidCampaign
		}
		if session.Status == model.SessionStatusPolling {
			return ErrSessionAlreadyPolling
		}
		return nil
	})

	g.Go(func() error {
		var err error
		integration, err = s.DB.GetCampaignIntegration(campaignId, model.IntegrationSourceDiscord)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return ErrCampaignIntegrationNotFound
			}
			return fmt.Errorf("get campaign integration error: %w", err)
		}
		return nil
	})

	if err := g.Wait(); err != nil {
		return err
	}

	poll, err := s.Discord.PollSession(ctx, integration, session, options)
	if err != nil {
		return fmt.Errorf("poll discord session error: %w", err)
	}

	if _, err := s.DB.UpdateSession(&model.UpdateSessionRequest{
		ID:     sessionId,
		Status: model.SessionStatusPolling,
		PollId: sql.NullString{String: poll.ID, Valid: true},
	}); err != nil {
		// If this fails the poll exists on Discord but is untracked; log enough
		// context for manual recovery.
		s.Log.ErrorContext(ctx, "failed to persist poll_id; Discord poll may be orphaned",
			"session_id", sessionId,
			"poll_id", poll.ID,
			"error", err,
		)
		return fmt.Errorf("update session poll_id error: %w", err)
	}

	return nil
}

func (s *SessionService) Remove(id string) error {
	session, err := s.Get(id)
	if err != nil {
		return err
	}
	if session.PollID.Valid {
		integration, err := s.DB.GetCampaignIntegration(session.CampaignID, model.IntegrationSourceDiscord)
		if err == nil {
			var metadata struct {
				ChannelID string `json:"channelId"`
			}
			if err := json.Unmarshal(integration.Metadata, &metadata); err == nil && metadata.ChannelID != "" {
				s.Discord.ClosePoll(context.Background(), metadata.ChannelID, session.PollID.String, session.Title)
			}
		}
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
