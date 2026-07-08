package session_series

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	model "github.com/BBruington/party-planner/api/internal/models"
	"github.com/BBruington/party-planner/api/internal/pg"
)

// DB wraps a [sql.DB] connection for session_series queries.
type DB struct {
	conn pg.Querier
	raw  *sql.DB
}

// NewDB creates a new session_series DB wrapping the given connection.
func NewDB(conn *sql.DB) *DB {
	return &DB{conn: conn, raw: conn}
}

// RunInTx executes fn inside a database transaction, rolling back on error.
func (db *DB) RunInTx(ctx context.Context, fn func(context.Context, Store) error) error {
	tx, err := db.raw.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() {
		if err := tx.Rollback(); err != nil && !errors.Is(err, sql.ErrTxDone) {
			slog.Error("failed to rollback transaction", "error", err)
		}
	}()
	txDB := &DB{conn: tx, raw: db.raw}
	if err := fn(ctx, txDB); err != nil {
		return err
	}
	return tx.Commit()
}

// ── Session Series ────────────────────────────────────────────────────────────

const sessionSeriesColumns = `id, campaign_id, title, description, discord_event_id, google_calendar_event_id, poll_id, rrule, start_time, series_start_date, series_end_date, created_at, updated_at, timezone, duration_minutes`

func scanSessionSeries(row interface{ Scan(...any) error }) (*model.SessionSeries, error) {
	var s model.SessionSeries
	err := row.Scan(
		&s.ID, &s.CampaignID, &s.Title, &s.Description,
		&s.DiscordEventID, &s.GoogleCalendarEventID, &s.PollID,
		&s.RRule, &s.StartTime,
		&s.SeriesStartDate, &s.SeriesEndDate, &s.CreatedAt, &s.UpdatedAt, &s.Timezone, &s.DurationMinutes,
	)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (db *DB) CreateSessionSeries(ctx context.Context, req *model.CreateSessionSeriesRequest) (*model.SessionSeries, error) {
	row := db.conn.QueryRowContext(ctx, `
		INSERT INTO session_series (campaign_id, title, description, discord_event_id, google_calendar_event_id, poll_id, rrule, start_time, series_start_date, series_end_date, timezone, duration_minutes)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING `+sessionSeriesColumns,
		req.CampaignID, req.Title, req.Description,
		req.DiscordEventID, req.GoogleCalendarEventID, req.PollID,
		req.RRule, req.StartTime,
		req.SeriesStartDate, req.SeriesEndDate, req.Timezone, req.DurationMinutes,
	)
	return scanSessionSeries(row)
}

func (db *DB) GetSessionSeries(ctx context.Context, id, campaignID string) (*model.SessionSeries, error) {
	row := db.conn.QueryRowContext(ctx, `SELECT `+sessionSeriesColumns+` FROM session_series WHERE id = $1 AND campaign_id = $2 LIMIT 1`, id, campaignID)
	return scanSessionSeries(row)
}

func (db *DB) GetSessionSeriesForUpdate(ctx context.Context, id, campaignID string) (*model.SessionSeries, error) {
	row := db.conn.QueryRowContext(ctx, `SELECT `+sessionSeriesColumns+` FROM session_series WHERE id = $1 AND campaign_id = $2 LIMIT 1 FOR UPDATE`, id, campaignID)
	return scanSessionSeries(row)
}

func (db *DB) GetSessionSeriesByDiscordEventID(ctx context.Context, discordEventID string) (*model.SessionSeries, error) {
	row := db.conn.QueryRowContext(ctx, `SELECT `+sessionSeriesColumns+` FROM session_series WHERE discord_event_id = $1 LIMIT 1`, discordEventID)
	return scanSessionSeries(row)
}

func (db *DB) ListSessionSeriesByCampaign(ctx context.Context, campaignID string) ([]*model.SessionSeries, error) {
	rows, err := db.conn.QueryContext(ctx, `SELECT `+sessionSeriesColumns+` FROM session_series WHERE campaign_id = $1`, campaignID)
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

func (db *DB) UpdateSessionSeries(ctx context.Context, req *model.UpdateSessionSeriesRequest) (*model.SessionSeries, error) {
	row := db.conn.QueryRowContext(ctx, `
		UPDATE session_series SET
			title           = COALESCE($1, title),
			description     = COALESCE($2, description),
			rrule           = COALESCE($3, rrule),
			start_time      = COALESCE($4, start_time),
			series_end_date = COALESCE($5, series_end_date),
			timezone        = COALESCE($6, timezone),
			updated_at      = NOW()
		WHERE id = $7 AND campaign_id = $8
		RETURNING `+sessionSeriesColumns,
		req.Title, req.Description, req.RRule, req.StartTime, req.SeriesEndDate, req.Timezone, req.ID, req.CampaignID,
	)
	return scanSessionSeries(row)
}

func (db *DB) RemoveSessionSeries(ctx context.Context, id, campaignID string) error {
	_, err := db.conn.ExecContext(ctx, `DELETE FROM session_series WHERE id = $1 AND campaign_id = $2`, id, campaignID)
	if err != nil {
		return fmt.Errorf("remove session series: %w", err)
	}
	return nil
}

func (db *DB) SetSeriesDiscordEventID(ctx context.Context, id, campaignID, eventID string) error {
	_, err := db.conn.ExecContext(ctx,
		`UPDATE session_series SET discord_event_id = $1, updated_at = NOW() WHERE id = $2 AND campaign_id = $3`,
		eventID, id, campaignID,
	)
	if err != nil {
		return fmt.Errorf("set series discord event id: %w", err)
	}
	return nil
}

func (db *DB) SetSeriesGoogleCalendarEventID(ctx context.Context, id, campaignID, eventID string) error {
	_, err := db.conn.ExecContext(ctx,
		`UPDATE session_series SET google_calendar_event_id = $1, updated_at = NOW() WHERE id = $2 AND campaign_id = $3`,
		eventID, id, campaignID,
	)
	if err != nil {
		return fmt.Errorf("set series google calendar event id: %w", err)
	}
	return nil
}

func (db *DB) ClearSeriesGoogleCalendarEventID(ctx context.Context, id, campaignID string) error {
	_, err := db.conn.ExecContext(ctx,
		`UPDATE session_series SET google_calendar_event_id = NULL, updated_at = NOW() WHERE id = $1 AND campaign_id = $2`,
		id, campaignID,
	)
	if err != nil {
		return fmt.Errorf("clear series google calendar event id: %w", err)
	}
	return nil
}

func (db *DB) AddSeriesException(ctx context.Context, seriesID, campaignID string, excludedDate time.Time) error {
	result, err := db.conn.ExecContext(ctx, `
		INSERT INTO session_exceptions (series_id, excluded_date)
		SELECT $1, $2 FROM session_series WHERE id = $1 AND campaign_id = $3`,
		seriesID, excludedDate, campaignID,
	)
	if err != nil {
		return fmt.Errorf("add series exception: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("add series exception rows affected: %w", err)
	}
	if rows == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (db *DB) ListExceptionsForSeries(ctx context.Context, seriesIDs []string) (map[string][]time.Time, error) {
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

	rows, err := db.conn.QueryContext(ctx,
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

func (db *DB) SetSeriesPollID(ctx context.Context, id, campaignID, pollID string) error {
	_, err := db.conn.ExecContext(ctx,
		`UPDATE session_series SET poll_id = $1, updated_at = NOW() WHERE id = $2 AND campaign_id = $3`,
		pollID, id, campaignID,
	)
	if err != nil {
		return fmt.Errorf("set series poll id: %w", err)
	}
	return nil
}

func (db *DB) ListActiveSeries(ctx context.Context) ([]*model.SessionSeries, error) {
	rows, err := db.conn.QueryContext(ctx, `
		SELECT `+sessionSeriesColumns+` FROM session_series
		WHERE (series_end_date IS NULL OR series_end_date > NOW())`)
	if err != nil {
		return nil, fmt.Errorf("list active series: %w", err)
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

func (db *DB) RemoveSeriesException(ctx context.Context, seriesID, campaignID string, excludedDate time.Time) error {
	_, err := db.conn.ExecContext(ctx, `
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

// ── Session (cross-entity) ────────────────────────────────────────────────────

const sessionColumns = `id, campaign_id, title, description, scheduled_at, created_at, updated_at, series_id, recap, duration_minutes`

func scanSession(row interface{ Scan(...any) error }) (*model.Session, error) {
	var s model.Session
	err := row.Scan(
		&s.ID, &s.CampaignID, &s.Title, &s.Description, &s.ScheduledAt,
		&s.CreatedAt, &s.UpdatedAt, &s.SeriesID, &s.Recap, &s.DurationMinutes,
	)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (db *DB) UpsertSessionForSeries(ctx context.Context, session *model.CreateSessionRequest) (*model.Session, error) {
	row := db.conn.QueryRowContext(ctx, `
		INSERT INTO session (campaign_id, title, description, scheduled_at, series_id, duration_minutes)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (series_id, scheduled_at) WHERE series_id IS NOT NULL AND scheduled_at IS NOT NULL
		DO UPDATE SET title = EXCLUDED.title, updated_at = NOW()
		RETURNING `+sessionColumns,
		session.CampaignID, session.Title, session.Description, session.ScheduledAt,
		session.SeriesID, session.DurationMinutes,
	)
	return scanSession(row)
}

// ── Campaign Integration (cross-entity) ──────────────────────────────────────

func (db *DB) GetCampaignIntegration(ctx context.Context, campaignID, source string) (*model.CampaignIntegration, error) {
	row := db.conn.QueryRowContext(ctx,
		`SELECT id, campaign_id, external_id, source, metadata, settings, created_at, updated_at FROM campaign_integrations WHERE campaign_id = $1 AND source = $2 LIMIT 1`,
		campaignID, source,
	)
	var ci model.CampaignIntegration
	if err := row.Scan(&ci.ID, &ci.CampaignID, &ci.ExternalID, &ci.Source, &ci.Metadata, &ci.Settings, &ci.CreatedAt, &ci.UpdatedAt); err != nil {
		return nil, err
	}
	return &ci, nil
}

func (db *DB) ListSeriesSessionsByCampaign(ctx context.Context, campaignID string) ([]*model.Session, error) {
	rows, err := db.conn.QueryContext(ctx, `SELECT `+sessionColumns+` FROM session WHERE campaign_id = $1 AND series_id IS NOT NULL`, campaignID)
	if err != nil {
		return nil, fmt.Errorf("list series sessions: %w", err)
	}
	defer func() {
		if err := rows.Close(); err != nil {
			slog.Error("failed to close rows", "error", err)
		}
	}()

	var sessions []*model.Session
	for rows.Next() {
		session, err := scanSession(rows)
		if err != nil {
			return nil, fmt.Errorf("scan session: %w", err)
		}
		sessions = append(sessions, session)
	}
	return sessions, rows.Err()
}
