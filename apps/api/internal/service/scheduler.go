package service

import (
	"context"
	"database/sql"
	"log/slog"
	"strconv"
	"strings"
	"time"

	"github.com/BBruington/party-planner/api/internal/db"
	model "github.com/BBruington/party-planner/api/internal/models"
)

type SeriesScheduler struct {
	DB      *db.DB
	Session *SessionService
	Log     *slog.Logger
}

func (s *SeriesScheduler) CheckAndScheduleSessions(ctx context.Context) {
	s.Log.InfoContext(ctx, "series scheduler: running")

	series, err := s.DB.ListActiveSeriesNeedingSession()
	if err != nil {
		s.Log.ErrorContext(ctx, "series scheduler: failed to list series", "error", err)
		return
	}
	if len(series) == 0 {
		s.Log.InfoContext(ctx, "series scheduler: no series need a new session")
		return
	}

	ids := make([]string, len(series))
	for i, ss := range series {
		ids[i] = ss.ID
	}

	exceptions, err := s.DB.ListExceptionsForSeries(ids)
	if err != nil {
		s.Log.ErrorContext(ctx, "series scheduler: failed to list exceptions", "error", err)
		return
	}

	for _, ss := range series {
		next := computeNextValidOccurrence(ss, exceptions[ss.ID])
		if next == nil {
			s.Log.WarnContext(ctx, "series scheduler: no valid next occurrence",
				"series_id", ss.ID,
			)
			continue
		}

		_, err := s.Session.Create(ctx, &model.CreateSessionRequest{
			CampaignID:       ss.CampaignID,
			Title:            ss.Title,
			Description:      ss.Description,
			SeriesID:         sql.NullString{String: ss.ID, Valid: true},
			OriginalStartsAt: sql.NullTime{Time: *next, Valid: true},
			Status:           model.SessionStatusConfirmed,
			StartsAt:         sql.NullTime{Time: *next, Valid: true},
		})
		if err != nil {
			s.Log.ErrorContext(ctx, "series scheduler: failed to create session",
				"series_id", ss.ID,
				"starts_at", next,
				"error", err,
			)
			continue
		}

		s.Log.InfoContext(ctx, "series scheduler: created session",
			"series_id", ss.ID,
			"starts_at", next,
		)
	}
}

func computeNextValidOccurrence(series *model.SessionSeries, exceptions []time.Time) *time.Time {
	h, m, sec, ok := parseStartTime(series.StartTime)
	if !ok {
		return nil
	}

	advance, ok := rruleAdvanceFn(series.RRule)
	if !ok {
		return nil
	}

	year, month, day := series.SeriesStartDate.UTC().Date()
	candidate := time.Date(year, month, day, h, m, sec, 0, time.UTC)

	now := time.Now().UTC()
	exceptionDates := make(map[string]bool, len(exceptions))
	for _, e := range exceptions {
		exceptionDates[e.UTC().Format("2006-01-02")] = true
	}

	for !candidate.After(now.Add(time.Hour)) {
		candidate = advance(candidate)
	}

	for exceptionDates[candidate.UTC().Format("2006-01-02")] {
		candidate = advance(candidate)
		if series.SeriesEndDate.Valid && candidate.After(series.SeriesEndDate.Time) {
			return nil
		}
	}

	if series.SeriesEndDate.Valid && candidate.After(series.SeriesEndDate.Time) {
		return nil
	}

	return &candidate
}

// rruleAdvanceFn parses FREQ and INTERVAL from an rrule string and returns a
// function that advances a time by one recurrence interval.
func rruleAdvanceFn(rruleStr string) (func(time.Time) time.Time, bool) {
	freq := ""
	interval := 1

	for _, part := range strings.Split(rruleStr, ";") {
		kv := strings.SplitN(part, "=", 2)
		if len(kv) != 2 {
			continue
		}
		switch strings.ToUpper(kv[0]) {
		case "FREQ":
			freq = strings.ToUpper(kv[1])
		case "INTERVAL":
			if n, err := strconv.Atoi(kv[1]); err == nil && n > 0 {
				interval = n
			}
		}
	}

	switch freq {
	case "DAILY":
		n := interval
		return func(t time.Time) time.Time { return t.AddDate(0, 0, n) }, true
	case "WEEKLY":
		n := interval * 7
		return func(t time.Time) time.Time { return t.AddDate(0, 0, n) }, true
	case "MONTHLY":
		n := interval
		return func(t time.Time) time.Time { return t.AddDate(0, n, 0) }, true
	default:
		return nil, false
	}
}
