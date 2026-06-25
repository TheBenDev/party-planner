package session_series

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"
	"time"

	discord_domain "github.com/BBruington/party-planner/api/internal/adapter/discord"
	userIntegrationDomain "github.com/BBruington/party-planner/api/internal/domain/user_integration"
	model "github.com/BBruington/party-planner/api/internal/models"
	"github.com/BBruington/party-planner/api/internal/pg"
	"golang.org/x/sync/errgroup"
)

// Domain errors.
var (
	ErrSessionSeriesNotFound                 = errors.New("session series not found")
	ErrSessionSeriesAlreadyExists            = errors.New("session series already exists")
	ErrSessionSeriesInvalidCampaign          = errors.New("campaign does not exist")
	ErrSeriesExceptionAlreadyExists          = errors.New("series exception already exists")
	ErrSeriesMissingStartTime                = errors.New("series has no start time set")
	ErrSeriesDiscordIntegrationNotFound      = errors.New("campaign has no discord integration")
	ErrSeriesPollNotFound                    = errors.New("series has no active poll")
	ErrSeriesAlreadyPolling                  = errors.New("series already has an active poll")
	ErrSeriesDiscordEventAlreadyExists       = errors.New("series already has a discord event attached to it")
	ErrSeriesGoogleCalendarAlreadyExists     = errors.New("series already has a google calendar event attached to it")
	ErrSeriesGoogleCalendarNotFound          = errors.New("series has no google calendar event attached to it")
	ErrSeriesGoogleCalendarIntegrationNotSet = errors.New("user has no google calendar integration connected")
	ErrDiscordEventNotFound                  = errors.New("discord scheduled event not found")
)

// Store interface defines all database operations needed for session_series domain.
type Store interface {
	// Session Series CRUD
	CreateSessionSeries(req *model.CreateSessionSeriesRequest) (*model.SessionSeries, error)
	GetSessionSeries(id, campaignID string) (*model.SessionSeries, error)
	GetSessionSeriesForUpdate(id, campaignID string) (*model.SessionSeries, error)
	GetSessionSeriesByDiscordEventID(discordEventID string) (*model.SessionSeries, error)
	ListSessionSeriesByCampaign(campaignID string) ([]*model.SessionSeries, error)
	UpdateSessionSeries(req *model.UpdateSessionSeriesRequest) (*model.SessionSeries, error)
	RemoveSessionSeries(id, campaignID string) error

	// Session Series modifiers
	SetSeriesDiscordEventID(id, campaignID, eventID string) error
	SetSeriesGoogleCalendarEventID(id, campaignID, eventID string) error
	ClearSeriesGoogleCalendarEventID(id, campaignID string) error
	SetSeriesPollID(id, campaignID, pollID string) error

	// Exceptions
	AddSeriesException(seriesID, campaignID string, excludedDate time.Time) error
	ListExceptionsForSeries(seriesIDs []string) (map[string][]time.Time, error)
	RemoveSeriesException(seriesID, campaignID string, excludedDate time.Time) error

	// Active series
	ListActiveSeries() ([]*model.SessionSeries, error)

	// Session upsert (cross-entity)
	UpsertSessionForSeries(session *model.CreateSessionRequest) (*model.Session, error)
	ListSeriesSessionsByCampaign(campaignID string) ([]*model.Session, error)

	// Campaign integrations (cross-entity)
	GetCampaignIntegration(campaignID, source string) (*model.CampaignIntegration, error)

	// Transaction support
	RunInTx(fn func(Store) error) error
}

type Service struct {
	DB              Store
	Log             *slog.Logger
	Discord         discord_domain.Service
	UserIntegration *userIntegrationDomain.Service
}

func (s *Service) Create(ctx context.Context, req *model.CreateSessionSeriesRequest) (*model.SessionSeries, error) {
	created, err := s.DB.CreateSessionSeries(req)
	if err != nil {
		if mapped := mapPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("create session series error: %w", err)
	}
	return created, nil
}

func (s *Service) Get(id, campaignID string) (*model.SessionSeries, error) {
	series, err := s.DB.GetSessionSeries(id, campaignID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrSessionSeriesNotFound
		}
		return nil, fmt.Errorf("get session series error: %w", err)
	}
	return series, nil
}

func (s *Service) ListByCampaign(campaignID string) ([]*model.SessionSeriesWithDetails, error) {
	seriesList, err := s.DB.ListSessionSeriesByCampaign(campaignID)
	if err != nil {
		return nil, fmt.Errorf("list session series by campaign error: %w", err)
	}
	if len(seriesList) == 0 {
		return []*model.SessionSeriesWithDetails{}, nil
	}

	seriesIDs := make([]string, len(seriesList))
	for i, ss := range seriesList {
		seriesIDs[i] = ss.ID
	}

	var sessions []*model.Session
	var exceptions map[string][]time.Time

	var g errgroup.Group
	g.Go(func() error {
		var err error
		sessions, err = s.DB.ListSeriesSessionsByCampaign(campaignID)
		return err
	})
	g.Go(func() error {
		var err error
		exceptions, err = s.DB.ListExceptionsForSeries(seriesIDs)
		return err
	})
	if err := g.Wait(); err != nil {
		return nil, fmt.Errorf("list session series details error: %w", err)
	}

	sessionsBySeriesID := make(map[string][]*model.Session)
	for _, sess := range sessions {
		if sess.SeriesID.Valid {
			sessionsBySeriesID[sess.SeriesID.String] = append(sessionsBySeriesID[sess.SeriesID.String], sess)
		}
	}

	result := make([]*model.SessionSeriesWithDetails, len(seriesList))
	for i, ss := range seriesList {
		result[i] = &model.SessionSeriesWithDetails{
			Series:     ss,
			Sessions:   sessionsBySeriesID[ss.ID],
			Exceptions: exceptions[ss.ID],
		}
	}
	return result, nil
}

func (s *Service) Update(req *model.UpdateSessionSeriesRequest) (*model.SessionSeries, error) {
	if _, err := s.Get(req.ID, req.CampaignID); err != nil {
		return nil, err
	}
	updated, err := s.DB.UpdateSessionSeries(req)
	if err != nil {
		if mapped := mapPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("update session series error: %w", err)
	}
	return updated, nil
}

func (s *Service) Remove(ctx context.Context, id, campaignID, userID string) error {
	series, err := s.Get(id, campaignID)
	if err != nil {
		return err
	}
	if err := s.DB.RemoveSessionSeries(id, campaignID); err != nil {
		return fmt.Errorf("remove session series error: %w", err)
	}
	if series.DiscordEventID.Valid {
		integration, err := s.DB.GetCampaignIntegration(campaignID, "DISCORD")
		if err != nil {
			s.Log.WarnContext(ctx, "failed to fetch discord integration when removing session series",
				"series_id", id,
				"discord_event_id", series.DiscordEventID.String,
				"error", err,
			)
		} else if err = s.Discord.DeleteScheduledEvent(ctx, integration.ExternalID, series.DiscordEventID.String); err != nil {
			s.Log.WarnContext(ctx, "failed to delete discord event when removing session series",
				"series_id", id,
				"discord_event_id", series.DiscordEventID.String,
				"error", err,
			)
		}
	}
	if series.GoogleCalendarEventID.Valid {
		if err := s.UserIntegration.RemoveCalendarEvent(ctx, userID, series.GoogleCalendarEventID.String); err != nil {
			s.Log.WarnContext(ctx, "failed to remove google calendar event when removing session series",
				"series_id", id,
				"google_calendar_event_id", series.GoogleCalendarEventID.String,
				"error", err,
			)
		}
	}
	return nil
}

func (s *Service) ExcludeFromSeries(ctx context.Context, seriesID, campaignID string, excludedDate time.Time) error {
	if err := s.DB.AddSeriesException(seriesID, campaignID, excludedDate); err != nil {
		if pg.IsError(err, pg.UniqueViolation) {
			return ErrSeriesExceptionAlreadyExists
		}
		return fmt.Errorf("exclude from series: %w", err)
	}

	var integration *model.CampaignIntegration
	var series *model.SessionSeries

	var g errgroup.Group
	g.Go(func() error {
		var err error
		integration, err = s.DB.GetCampaignIntegration(campaignID, "DISCORD")
		return err
	})
	g.Go(func() error {
		var err error
		series, err = s.DB.GetSessionSeries(seriesID, campaignID)
		return err
	})
	if err := g.Wait(); err != nil {
		s.Log.WarnContext(ctx, "failed to fetch data for discord series exception notification",
			"series_id", seriesID,
			"error", err,
		)
	} else {
		channelID := s.Discord.GetNotificationChannelID(integration)
		if channelID != "" {
			msg := fmt.Sprintf("❌ **%s** on <t:%d:F> has been cancelled.", series.Title, excludedDate.Unix())
			if _, sendErr := s.Discord.SendDiscordMessage(ctx, channelID, msg); sendErr != nil {
				s.Log.WarnContext(ctx, "failed to notify discord of series exception",
					"series_id", seriesID,
					"excluded_date", excludedDate,
					"error", sendErr,
				)
			}
		}
	}

	return nil
}

func (s *Service) RemoveException(seriesID, campaignID string, excludedDate time.Time) error {
	if _, err := s.Get(seriesID, campaignID); err != nil {
		return err
	}
	if err := s.DB.RemoveSeriesException(seriesID, campaignID, excludedDate); err != nil {
		return fmt.Errorf("remove series exception error: %w", err)
	}
	return nil
}

// GOOGLE CALENDAR ACTIONS

func (s *Service) AddToGoogleCalendar(ctx context.Context, seriesID, campaignID, userID string) (*model.SessionSeries, error) {
	if err := s.DB.RunInTx(func(txDB Store) error {
		var group errgroup.Group
		var sessionSeries *model.SessionSeries
		var exceptions map[string][]time.Time
		group.Go(func() error {
			var err error
			sessionSeries, err = txDB.GetSessionSeriesForUpdate(seriesID, campaignID)
			return err
		})

		group.Go(func() error {
			var err error
			exceptions, err = txDB.ListExceptionsForSeries([]string{seriesID})
			return err
		})
		if err := group.Wait(); err != nil {
			return err
		}

		if sessionSeries.GoogleCalendarEventID.Valid {
			return ErrSeriesGoogleCalendarAlreadyExists
		}

		eventID, err := s.UserIntegration.SyncSession(ctx, userID, *sessionSeries, exceptions[seriesID])
		if err != nil {
			return err
		}

		if err := txDB.SetSeriesGoogleCalendarEventID(seriesID, campaignID, eventID); err != nil {
			return err
		}
		return nil
	}); err != nil {
		return nil, err
	}

	return s.DB.GetSessionSeries(seriesID, campaignID)
}

func (s *Service) RemoveFromGoogleCalendar(ctx context.Context, seriesID, campaignID, userID string) (*model.SessionSeries, error) {
	lockedSeries, err := s.DB.GetSessionSeriesForUpdate(seriesID, campaignID)
	if err != nil {
		return nil, err
	}

	if !lockedSeries.GoogleCalendarEventID.Valid {
		return nil, ErrSeriesGoogleCalendarNotFound
	}

	if err := s.UserIntegration.RemoveCalendarEvent(ctx, userID, lockedSeries.GoogleCalendarEventID.String); err != nil {
		return nil, err
	}

	if err := s.DB.ClearSeriesGoogleCalendarEventID(seriesID, campaignID); err != nil {
		return nil, err
	}

	return s.DB.GetSessionSeries(seriesID, campaignID)
}

// DISCORD ACTIONS

func (s *Service) GetDiscordEvent(ctx context.Context, campaignID, seriesID, discordEventID string) (*model.DiscordEventInfo, error) {
	var series *model.SessionSeries
	var integration *model.CampaignIntegration

	var g errgroup.Group
	g.Go(func() error {
		var err error
		series, err = s.Get(seriesID, campaignID)
		return err
	})
	g.Go(func() error {
		var err error
		integration, err = s.DB.GetCampaignIntegration(campaignID, "DISCORD")
		if errors.Is(err, sql.ErrNoRows) {
			return ErrSeriesDiscordIntegrationNotFound
		}
		return err
	})
	if err := g.Wait(); err != nil {
		return nil, err
	}

	if !series.DiscordEventID.Valid || series.DiscordEventID.String != discordEventID {
		return nil, ErrDiscordEventNotFound
	}

	return s.Discord.GetScheduledEvent(ctx, integration.ExternalID, discordEventID)
}

func (s *Service) CreateDiscordEvent(ctx context.Context, seriesID, campaignID string) (*model.SessionSeries, error) {
	integration, err := s.DB.GetCampaignIntegration(campaignID, "DISCORD")
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrSeriesDiscordIntegrationNotFound
		}
		return nil, err
	}

	var newEventID string
	var lockedSeries *model.SessionSeries

	if err := s.DB.RunInTx(func(txDB Store) error {
		var txErr error
		lockedSeries, txErr = txDB.GetSessionSeriesForUpdate(seriesID, campaignID)
		if txErr != nil {
			return txErr
		}
		if lockedSeries.DiscordEventID.Valid && lockedSeries.DiscordEventID.String != "" {
			_, err := s.Discord.GetScheduledEvent(ctx, integration.ExternalID, lockedSeries.DiscordEventID.String)
			if err == nil {
				return ErrSeriesDiscordEventAlreadyExists
			}
		}
		if computeFirstOccurrence(lockedSeries.SeriesStartDate, lockedSeries.StartTime) == nil {
			return ErrSeriesMissingStartTime
		}
		newEventID, txErr = s.Discord.CreateScheduledEvent(ctx, integration.ExternalID, lockedSeries)
		if txErr != nil {
			return fmt.Errorf("announce series: create discord event: %w", txErr)
		}
		if txErr = txDB.SetSeriesDiscordEventID(lockedSeries.ID, campaignID, newEventID); txErr != nil {
			return fmt.Errorf("announce series: persist discord event id: %w", txErr)
		}
		return nil
	}); err != nil {
		return nil, err
	}

	if newEventID != "" {
		channelID := s.Discord.GetNotificationChannelID(integration)
		if channelID != "" {
			firstOccurrence := computeFirstOccurrence(lockedSeries.SeriesStartDate, lockedSeries.StartTime)
			msg := fmt.Sprintf("**%s** is scheduled for <t:%d:F> (<t:%d:R>).", lockedSeries.Title, firstOccurrence.Unix(), firstOccurrence.Unix())
			if _, sendErr := s.Discord.SendDiscordMessage(ctx, channelID, msg); sendErr != nil {
				s.Log.WarnContext(ctx, "failed to send series announcement message",
					"series_id", lockedSeries.ID,
					"error", sendErr,
				)
			}
		}
	}

	return s.Get(seriesID, campaignID)
}

func (s *Service) GetPoll(ctx context.Context, seriesID, campaignID string) (*model.Poll, error) {
	var series *model.SessionSeries
	var integration *model.CampaignIntegration

	var g errgroup.Group
	g.Go(func() error {
		var err error
		series, err = s.Get(seriesID, campaignID)
		return err
	})
	g.Go(func() error {
		var err error
		integration, err = s.DB.GetCampaignIntegration(campaignID, "DISCORD")
		if errors.Is(err, sql.ErrNoRows) {
			return ErrSeriesDiscordIntegrationNotFound
		}
		return err
	})
	if err := g.Wait(); err != nil {
		return nil, err
	}

	if !series.PollID.Valid {
		return nil, ErrSeriesPollNotFound
	}

	channelID := s.Discord.GetNotificationChannelID(integration)
	if channelID == "" {
		return nil, ErrSeriesDiscordIntegrationNotFound
	}

	return s.Discord.GetPoll(ctx, channelID, series.PollID.String)
}

func (s *Service) CreateDiscordPoll(ctx context.Context, seriesID, campaignID string, options []time.Time) error {
	var series *model.SessionSeries
	var integration *model.CampaignIntegration

	var g errgroup.Group
	g.Go(func() error {
		var err error
		series, err = s.Get(seriesID, campaignID)
		return err
	})
	g.Go(func() error {
		var err error
		integration, err = s.DB.GetCampaignIntegration(campaignID, "DISCORD")
		if errors.Is(err, sql.ErrNoRows) {
			return ErrSeriesDiscordIntegrationNotFound
		}
		return err
	})
	if err := g.Wait(); err != nil {
		return err
	}

	if series.PollID.Valid {
		return ErrSeriesAlreadyPolling
	}

	pollID, err := s.Discord.PollSeries(ctx, integration, series, options)
	if err != nil {
		return fmt.Errorf("poll series: %w", err)
	}

	if err := s.DB.SetSeriesPollID(series.ID, campaignID, pollID); err != nil {
		return fmt.Errorf("poll series: persist poll id: %w", err)
	}

	return nil
}

func (s *Service) NotifyUpcomingOccurrences(ctx context.Context) {
	seriesList, err := s.DB.ListActiveSeries()
	if err != nil {
		s.Log.ErrorContext(ctx, "notify upcoming occurrences: failed to list active series", "error", err)
		return
	}
	if len(seriesList) == 0 {
		s.Log.InfoContext(ctx, "No sessions need notified.")
		return
	}

	seriesIDs := make([]string, len(seriesList))
	for i, ss := range seriesList {
		seriesIDs[i] = ss.ID
	}

	exceptions, err := s.DB.ListExceptionsForSeries(seriesIDs)
	if err != nil {
		s.Log.ErrorContext(ctx, "notify upcoming occurrences: failed to list exceptions", "error", err)
		return
	}

	now := time.Now().UTC()
	window := now.Add(24 * time.Hour)

	for _, sessionSeries := range seriesList {
		next := computeNextValidOccurrence(sessionSeries, exceptions[sessionSeries.ID])
		if next == nil || next.Before(now) || next.After(window) {
			continue
		}

		integration, err := s.DB.GetCampaignIntegration(sessionSeries.CampaignID, "DISCORD")
		if err != nil {
			s.Log.WarnContext(ctx, "notify upcoming occurrences: no discord integration",
				"series_id", sessionSeries.ID,
				"campaign_id", sessionSeries.CampaignID,
				"error", err,
			)
			continue
		}

		channelID := s.Discord.GetNotificationChannelID(integration)
		if channelID == "" {
			continue
		}

		s.Discord.NotifyUpcomingOccurrence(ctx, channelID, sessionSeries, *next)
	}
}

func mapPgError(err error) error {
	if pg.IsError(err, pg.UniqueViolation) {
		switch pg.Constraint(err) {
		case "fk_session_series_campaign_id":
			return ErrSessionSeriesInvalidCampaign
		}
	}
	return err
}

func computeFirstOccurrence(seriesStartDate time.Time, startTime sql.NullString) *time.Time {
	if !startTime.Valid {
		return nil
	}
	h, m, sec, ok := parseStartTime(startTime.String)
	if !ok {
		return nil
	}
	year, month, day := seriesStartDate.UTC().Date()
	t := time.Date(year, month, day, h, m, sec, 0, time.UTC)
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
