package session_series

import (
	"context"
	"strconv"
	"strings"
	"time"

	model "github.com/BBruington/party-planner/api/internal/models"
)

// SeriesScheduler drives periodic notifications for upcoming session occurrences.
type SeriesScheduler struct {
	Series *Service
}

func (s *SeriesScheduler) NotifyNextSession(ctx context.Context) {
	s.Series.NotifyUpcomingOccurrences(ctx)
}

func computeNextValidOccurrence(series *model.SessionSeries, exceptions []time.Time) *time.Time {
	if !series.StartTime.Valid || !series.RRule.Valid {
		return nil
	}
	h, m, sec, ok := parseStartTime(series.StartTime.String)
	if !ok {
		return nil
	}

	advance, ok := rruleAdvanceFn(series.RRule.String)
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
