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
	session, err := s.Get(sessionId, campaignId)
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

	eventID, err := s.Discord.AnnounceSession(ctx, integration, session)
	if err != nil {
		return fmt.Errorf("announce discord session error: %w", err)
	}

	if _, err := s.DB.MarkSessionAnnounced(sessionId, campaignId); err != nil {
		return fmt.Errorf("mark session announced error: %w", err)
	}

	if eventID != "" {
		if err := s.DB.SetSessionDiscordEventID(sessionId, campaignId, eventID); err != nil {
			s.Log.WarnContext(ctx, "failed to persist discord_event_id after announce",
				"session_id", sessionId,
				"event_id", eventID,
				"error", err,
			)
		}
	}

	return nil
}

func (s *SessionService) Create(ctx context.Context, session *model.CreateSessionRequest) (*model.Session, error) {
	created, err := s.DB.CreateSession(session)
	if err != nil {
		if mapped := mapSessionPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("create session error: %w", err)
	}

	if created.SeriesID.Valid && created.StartsAt.Valid && created.StartsAt.Time.After(time.Now()) {
		integration, intErr := s.DB.GetCampaignIntegration(created.CampaignID, model.IntegrationSourceDiscord)
		if intErr == nil {
			eventID, eventErr := s.Discord.CreateScheduledEvent(ctx, integration.ExternalID, created)
			if eventErr != nil {
				s.Log.WarnContext(ctx, "failed to create discord event for series session",
					"session_id", created.ID,
					"error", eventErr,
				)
			} else if eventID != "" {
				if err := s.DB.SetSessionDiscordEventID(created.ID, created.CampaignID, eventID); err != nil {
					s.Log.WarnContext(ctx, "failed to persist discord_event_id for series session",
						"session_id", created.ID,
						"event_id", eventID,
						"error", err,
					)
				} else {
					created.DiscordEventID = sql.NullString{String: eventID, Valid: true}
				}
			}
		}
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

func (s *SessionService) GetPoll(ctx context.Context, sessionId, campaignId string) (*model.Poll, error) {
	var (
		session     *model.Session
		integration *model.CampaignIntegration
	)

	var g errgroup.Group
	g.Go(func() error {
		var err error
		session, err = s.Get(sessionId, campaignId)
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

	var integrationMetadata model.DiscordIntegrationMetadata
	if err := json.Unmarshal(integration.Metadata, &integrationMetadata); err != nil {
		return nil, fmt.Errorf("failed to parse discord integration metadata: %w", err)
	}
	if integrationMetadata.DefaultChannel.ID == "" {
		return nil, errors.New("discord integration missing default channel")
	}

	poll, err := s.Discord.GetPoll(ctx, integrationMetadata.DefaultChannel.ID, session.PollID.String)
	if err != nil {
		return nil, fmt.Errorf("get discord poll error: %w", err)
	}

	return poll, nil
}

func (s *SessionService) NotifyUpcomingSessions(ctx context.Context) {
	integrations, err := s.DB.ListDiscordIntegrationsWithReminders()
	if err != nil {
		s.Log.ErrorContext(ctx, "failed to list discord integrations for reminders", "error", err)
		return
	}

	var totalReminders, campaignsNotified int
	for _, integration := range integrations {
		var integrationMetadata model.DiscordIntegrationMetadata
		if err := json.Unmarshal(integration.Metadata, &integrationMetadata); err != nil || integrationMetadata.DefaultChannel.ID == "" {
			s.Log.WarnContext(ctx, "skipping reminder: missing default channel in integration metadata",
				"campaign_id", integration.CampaignID,
			)
			continue
		}

		sessions, err := s.DB.ListSessionsInReminderWindow(integration.CampaignID)
		if err != nil {
			s.Log.ErrorContext(ctx, "failed to list sessions in reminder window",
				"campaign_id", integration.CampaignID,
				"error", err,
			)
			continue
		}

		for _, session := range sessions {
			s.Discord.NotifyUpcomingSession(ctx, integrationMetadata.DefaultChannel.ID, session)
			s.Log.InfoContext(ctx, "session reminder dispatched",
				"campaign_id", integration.CampaignID,
				"session_id", session.ID,
				"session_title", session.Title,
			)
			totalReminders++
		}
		if len(sessions) > 0 {
			campaignsNotified++
		}
	}
	s.Log.InfoContext(ctx, "session reminder run complete",
		"reminders_sent", totalReminders,
		"campaigns_notified", campaignsNotified,
	)
}

func (s *SessionService) ListOneOffByCampaign(campaignId string) ([]*model.Session, error) {
	sessions, err := s.DB.ListOneOffSessionsByCampaign(campaignId)
	if err != nil {
		return nil, fmt.Errorf("list one-off sessions by campaign error: %w", err)
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
		session, err = s.Get(sessionId, campaignId)
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
		ID:         sessionId,
		Status:     model.SessionStatusPolling,
		PollId:     sql.NullString{String: poll.ID, Valid: true},
		CampaignID: campaignId,
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

func (s *SessionService) Remove(id, campaignID string) error {
	session, err := s.Get(id, campaignID)
	if err != nil {
		return err
	}
	if session.PollID.Valid || session.DiscordEventID.Valid {
		integration, intErr := s.DB.GetCampaignIntegration(session.CampaignID, model.IntegrationSourceDiscord)
		if intErr == nil {
			ctx := context.Background()
			var integrationMetadata model.DiscordIntegrationMetadata
			_ = json.Unmarshal(integration.Metadata, &integrationMetadata)

			if session.PollID.Valid && integrationMetadata.DefaultChannel.ID != "" {
				if err := s.Discord.ClosePoll(ctx, integrationMetadata.DefaultChannel.ID, session.PollID.String); err == nil {
					sessionInFuture := !session.StartsAt.Valid || session.StartsAt.Time.After(time.Now())
					if sessionInFuture {
						s.Discord.NotifyPollCancelled(ctx, integrationMetadata.DefaultChannel.ID, session.PollID.String, session.Title)
					}
				}
			}

			if session.DiscordEventID.Valid {
				if err := s.Discord.DeleteScheduledEvent(ctx, integration.ExternalID, session.DiscordEventID.String); err != nil {
					s.Log.WarnContext(ctx, "failed to delete discord scheduled event",
						"session_id", id,
						"event_id", session.DiscordEventID.String,
						"error", err,
					)
				}
			}
		}
	}
	if err := s.DB.RemoveSession(id, campaignID); err != nil {
		return fmt.Errorf("remove session error: %w", err)
	}
	return nil
}

func (s *SessionService) Update(ctx context.Context, req *model.UpdateSessionRequest) (*model.Session, error) {
	session, err := s.Get(req.ID, req.CampaignID)
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

	// If an existing session starttime was updated from null to a date, make sure to close the discord poll
	if !session.StartsAt.Valid && session.PollID.Valid && req.StartsAt.Valid {
		integration, err := s.DB.GetCampaignIntegration(session.CampaignID, model.IntegrationSourceDiscord)
		if err == nil {
			var integrationMetadata model.DiscordIntegrationMetadata
			if err := json.Unmarshal(integration.Metadata, &integrationMetadata); err == nil && integrationMetadata.DefaultChannel.ID != "" {
				_ = s.Discord.ClosePoll(ctx, integrationMetadata.DefaultChannel.ID, session.PollID.String)
			}
		}
	}

	// Sync Discord event if startsAt changed
	startsAtChanged := req.StartsAt.Valid && (!session.StartsAt.Valid || !session.StartsAt.Time.Equal(req.StartsAt.Time))
	if startsAtChanged && session.DiscordEventID.Valid {
		integration, intErr := s.DB.GetCampaignIntegration(session.CampaignID, model.IntegrationSourceDiscord)
		if intErr == nil {
			updateErr := s.Discord.UpdateScheduledEvent(ctx, integration.ExternalID, session.DiscordEventID.String, updated)
			if updateErr != nil {
				if errors.Is(updateErr, ErrDiscordEventNotFound) {
					if clearErr := s.DB.ClearSessionDiscordEventID(session.ID, session.CampaignID); clearErr != nil {
						s.Log.WarnContext(ctx, "failed to clear stale discord_event_id",
							"session_id", session.ID,
							"error", clearErr,
						)
					} else {
						updated.DiscordEventID = sql.NullString{}
					}
				} else {
					s.Log.WarnContext(ctx, "failed to update discord scheduled event",
						"session_id", session.ID,
						"event_id", session.DiscordEventID.String,
						"error", updateErr,
					)
				}
			}
		}
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
