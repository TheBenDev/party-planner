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
	"golang.org/x/sync/errgroup"
)

var (
	ErrSessionSeriesNotFound            = errors.New("session series not found")
	ErrSessionSeriesAlreadyExists       = errors.New("session series already exists")
	ErrSessionSeriesInvalidCampaign     = errors.New("campaign does not exist")
	ErrSeriesExceptionAlreadyExists     = errors.New("series exception already exists")
	ErrSeriesMissingStartTime           = errors.New("series has no start time set")
	ErrSeriesDiscordIntegrationNotFound = errors.New("campaign has no discord integration")
	ErrSeriesPollNotFound               = errors.New("series has no active poll")
	ErrSeriesAlreadyPolling             = errors.New("series already has an active poll")
	ErrSeriesDiscordEventAlreadyExists  = errors.New("series already has a discord event attached to it")
)

type SessionSeriesService struct {
	DB      *db.DB
	Log     *slog.Logger
	Discord *DiscordService
}

func (s *SessionSeriesService) Create(ctx context.Context, req *model.CreateSessionSeriesRequest) (*model.SessionSeries, error) {
	created, err := s.DB.CreateSessionSeries(req)
	if err != nil {
		if mapped := mapSessionSeriesPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("create session series error: %w", err)
	}
	return created, nil
}

func (s *SessionSeriesService) GetDiscordEvent(ctx context.Context, campaignID, seriesID, discordEventID string) (*model.DiscordEventInfo, error) {
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
		integration, err = s.DB.GetCampaignIntegration(campaignID, model.IntegrationSourceDiscord)
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

func (s *SessionSeriesService) AnnounceToDiscord(ctx context.Context, seriesID, campaignID string) (*model.SessionSeries, error) {
	integration, err := s.DB.GetCampaignIntegration(campaignID, model.IntegrationSourceDiscord)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrSeriesDiscordIntegrationNotFound
	}
	if err != nil {
		return nil, err
	}

	var newEventID string
	var lockedSeries *model.SessionSeries

	if err := s.DB.RunInTx(func(txDB *db.DB) error {
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
			msg := fmt.Sprintf("📅 **%s** is scheduled for <t:%d:F> (<t:%d:R>). See you there!", lockedSeries.Title, firstOccurrence.Unix(), firstOccurrence.Unix())
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

func (s *SessionSeriesService) ListByCampaign(campaignID string) ([]*model.SessionSeriesWithDetails, error) {
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

func (s *SessionSeriesService) Remove(ctx context.Context, id, campaignID string) error {
	series, err := s.Get(id, campaignID)
	if err != nil {
		return err
	}
	if err := s.DB.RemoveSessionSeries(id, campaignID); err != nil {
		return fmt.Errorf("remove session series error: %w", err)
	}
	if series.DiscordEventID.Valid {
		integration, err := s.DB.GetCampaignIntegration(campaignID, model.IntegrationSourceDiscord)
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
	return nil
}

func (s *SessionSeriesService) ExcludeFromSeries(ctx context.Context, seriesID, campaignID string, excludedDate time.Time) error {
	if err := s.DB.AddSeriesException(seriesID, campaignID, excludedDate); err != nil {
		if isPgError(err, pgErrUniqueViolation) {
			return ErrSeriesExceptionAlreadyExists
		}
		return fmt.Errorf("exclude from series: %w", err)
	}

	if s.Discord != nil {
		var integration *model.CampaignIntegration
		var series *model.SessionSeries

		var g errgroup.Group
		g.Go(func() error {
			var err error
			integration, err = s.DB.GetCampaignIntegration(campaignID, model.IntegrationSourceDiscord)
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

func (s *SessionSeriesService) GetPoll(ctx context.Context, seriesID, campaignID string) (*model.Poll, error) {
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
		integration, err = s.DB.GetCampaignIntegration(campaignID, model.IntegrationSourceDiscord)
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

func (s *SessionSeriesService) CreateDiscordPoll(ctx context.Context, seriesID, campaignID string, options []time.Time) error {
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
		integration, err = s.DB.GetCampaignIntegration(campaignID, model.IntegrationSourceDiscord)
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

	pollProps, err := s.Discord.PollSeries(ctx, integration, series, options)
	if err != nil {
		return fmt.Errorf("poll series: %w", err)
	}

	if err := s.DB.SetSeriesPollID(series.ID, campaignID, pollProps.ID); err != nil {
		return fmt.Errorf("poll series: persist poll id: %w", err)
	}

	return nil
}

func (s *SessionSeriesService) NotifyUpcomingOccurrences(ctx context.Context) {
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

	for _, ss := range seriesList {
		next := computeNextValidOccurrence(ss, exceptions[ss.ID])
		if next == nil || next.Before(now) || next.After(window) {
			continue
		}

		integration, err := s.DB.GetCampaignIntegration(ss.CampaignID, model.IntegrationSourceDiscord)
		if err != nil {
			s.Log.WarnContext(ctx, "notify upcoming occurrences: no discord integration",
				"series_id", ss.ID,
				"campaign_id", ss.CampaignID,
				"error", err,
			)
			continue
		}

		channelID := s.Discord.GetNotificationChannelID(integration)
		if channelID == "" {
			continue
		}

		s.Discord.NotifyUpcomingOccurrence(ctx, channelID, ss, *next)
	}
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
