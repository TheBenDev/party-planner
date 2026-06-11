package db

import (
	"fmt"
	"log/slog"
	"strings"
	"time"

	model "github.com/BBruington/party-planner/api/internal/models"
)

const sessionSeriesColumns = `id, campaign_id, title, description, rrule, start_time, series_start_date, series_end_date, created_at, updated_at, timezone, duration_minutes`

func scanSessionSeries(row interface{ Scan(...any) error }) (*model.SessionSeries, error) {
	var s model.SessionSeries
	err := row.Scan(
		&s.ID, &s.CampaignID, &s.Title, &s.Description, &s.RRule, &s.StartTime,
		&s.SeriesStartDate, &s.SeriesEndDate, &s.CreatedAt, &s.UpdatedAt, &s.Timezone, &s.DurationMinutes,
	)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (db *DB) CreateSessionSeries(req *model.CreateSessionSeriesRequest) (*model.SessionSeries, error) {
	row := db.conn.QueryRow(`
		INSERT INTO session_series (campaign_id, title, description, rrule, start_time, series_start_date, series_end_date, timezone, duration_minutes)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING `+sessionSeriesColumns,
		req.CampaignID, req.Title, req.Description, req.RRule, req.StartTime,
		req.SeriesStartDate, req.SeriesEndDate, req.Timezone, req.DurationMinutes,
	)
	return scanSessionSeries(row)
}

func (db *DB) GetSessionSeries(id, campaignId string) (*model.SessionSeries, error) {
	row := db.conn.QueryRow(`SELECT `+sessionSeriesColumns+` FROM session_series WHERE id = $1 AND campaign_id = $2 LIMIT 1`, id, campaignId)
	return scanSessionSeries(row)
}

func (db *DB) ListSessionSeriesByCampaign(campaignID string) ([]*model.SessionSeries, error) {
	rows, err := db.conn.Query(`SELECT `+sessionSeriesColumns+` FROM session_series WHERE campaign_id = $1`, campaignID)
	if err != nil {
		return nil, fmt.Errorf("list session series: %w", err)
	}
	defer func() {
		if err := rows.Close(); err != nil {
			slog.Error("failed to close rows", "error", err)
		}
	}()

	var series []*model.SessionSeries
	for rows.Next() {
		s, err := scanSessionSeries(rows)
		if err != nil {
			return nil, fmt.Errorf("scan session series: %w", err)
		}
		series = append(series, s)
	}
	return series, rows.Err()
}

func (db *DB) UpdateSessionSeries(req *model.UpdateSessionSeriesRequest) (*model.SessionSeries, error) {
	row := db.conn.QueryRow(`
		UPDATE session_series SET
			title           = COALESCE($1, title),
			description     = $2,
			rrule           = COALESCE($3, rrule),
			start_time      = COALESCE($4, start_time),
			series_end_date = $5,
			timezone        = COALESCE($6, timezone),
			updated_at      = NOW()
		WHERE id = $7 AND campaign_id = $8
		RETURNING `+sessionSeriesColumns,
		req.Title, req.Description, req.RRule, req.StartTime, req.SeriesEndDate, req.Timezone, req.ID, req.CampaignID,
	)
	return scanSessionSeries(row)
}

func (db *DB) RemoveSessionSeries(id, campaignID string) error {
	_, err := db.conn.Exec(`DELETE FROM session_series WHERE id = $1 AND campaign_id = $2`, id, campaignID)
	if err != nil {
		return fmt.Errorf("remove session series: %w", err)
	}
	return nil
}

func (db *DB) AddSeriesException(seriesID, campaignID string, excludedDate time.Time) error {
	_, err := db.conn.Exec(`
		INSERT INTO session_exceptions (series_id, excluded_date)
		SELECT $1, $2 FROM session_series WHERE id = $1 AND campaign_id = $3
		ON CONFLICT (series_id, excluded_date) DO NOTHING`,
		seriesID, excludedDate, campaignID,
	)
	if err != nil {
		return fmt.Errorf("add series exception: %w", err)
	}
	return nil
}

func (db *DB) ListActiveSeriesNeedingSession() ([]*model.SessionSeries, error) {
	rows, err := db.conn.Query(`
		SELECT ` + sessionSeriesColumns + ` FROM session_series ss
		WHERE (ss.series_end_date IS NULL OR ss.series_end_date > NOW())
		AND NOT EXISTS (
			SELECT 1 FROM session s
			WHERE s.series_id = ss.id
			AND s.starts_at > NOW() + INTERVAL '1 hour'
		)`)
	if err != nil {
		return nil, fmt.Errorf("list active series needing session: %w", err)
	}
	defer func() {
		if err := rows.Close(); err != nil {
			slog.Error("failed to close rows", "error", err)
		}
	}()

	var series []*model.SessionSeries
	for rows.Next() {
		s, err := scanSessionSeries(rows)
		if err != nil {
			return nil, fmt.Errorf("scan session series: %w", err)
		}
		series = append(series, s)
	}
	return series, rows.Err()
}

func (db *DB) ListExceptionsForSeries(seriesIDs []string) (map[string][]time.Time, error) {
	result := make(map[string][]time.Time)
	if len(seriesIDs) == 0 {
		return result, nil
	}

	placeholders := make([]string, len(seriesIDs))
	args := make([]any, len(seriesIDs))
	for i, id := range seriesIDs {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
		args[i] = id
	}

	rows, err := db.conn.Query(
		`SELECT series_id, excluded_date FROM session_exceptions WHERE series_id IN (`+strings.Join(placeholders, ",")+`)`,
		args...,
	)
	if err != nil {
		return nil, fmt.Errorf("list exceptions for series: %w", err)
	}
	defer func() {
		if err := rows.Close(); err != nil {
			slog.Error("failed to close rows", "error", err)
		}
	}()

	for rows.Next() {
		var seriesID string
		var excludedDate time.Time
		if err := rows.Scan(&seriesID, &excludedDate); err != nil {
			return nil, fmt.Errorf("scan series exception: %w", err)
		}
		result[seriesID] = append(result[seriesID], excludedDate)
	}
	return result, rows.Err()
}

func (db *DB) RemoveSeriesException(seriesID, campaignID string, excludedDate time.Time) error {
	_, err := db.conn.Exec(`
		DELETE FROM session_exceptions
		WHERE series_id = $1 AND excluded_date = $2
		AND EXISTS (SELECT 1 FROM session_series WHERE id = $1 AND campaign_id = $3)`,
		seriesID, excludedDate, campaignID,
	)
	if err != nil {
		return fmt.Errorf("remove series exception: %w", err)
	}
	return nil
}
