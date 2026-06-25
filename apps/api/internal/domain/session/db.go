package session

import (
	"database/sql"
	"fmt"
	"log/slog"

	model "github.com/BBruington/party-planner/api/internal/models"
)

type querier interface {
	Exec(query string, args ...any) (sql.Result, error)
	QueryRow(query string, args ...any) *sql.Row
	Query(query string, args ...any) (*sql.Rows, error)
}

// DB wraps a [sql.DB] connection for session queries.
type DB struct {
	conn querier
	raw  *sql.DB
}

// NewDB creates a new session DB wrapping the given connection.
func NewDB(conn *sql.DB) *DB {
	return &DB{conn: conn, raw: conn}
}

// ── Session ───────────────────────────────────────────────────────────────────

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

func (db *DB) CreateSession(req *model.CreateSessionRequest) (*model.Session, error) {
	row := db.conn.QueryRow(`
		INSERT INTO session (campaign_id, title, description, scheduled_at, series_id, duration_minutes)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING `+sessionColumns,
		req.CampaignID, req.Title, req.Description, req.ScheduledAt,
		req.SeriesID, req.DurationMinutes,
	)
	return scanSession(row)
}

func (db *DB) UpsertSessionForSeries(req *model.CreateSessionRequest) (*model.Session, error) {
	row := db.conn.QueryRow(`
		INSERT INTO session (campaign_id, title, description, scheduled_at, series_id, duration_minutes)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (series_id, scheduled_at) WHERE series_id IS NOT NULL AND scheduled_at IS NOT NULL
		DO UPDATE SET title = EXCLUDED.title, updated_at = NOW()
		RETURNING `+sessionColumns,
		req.CampaignID, req.Title, req.Description, req.ScheduledAt,
		req.SeriesID, req.DurationMinutes,
	)
	return scanSession(row)
}

func (db *DB) GetSession(id, campaignID string) (*model.Session, error) {
	row := db.conn.QueryRow(`SELECT `+sessionColumns+` FROM session WHERE id = $1 AND campaign_id = $2 LIMIT 1`, id, campaignID)
	return scanSession(row)
}

func (db *DB) ListOneOffSessionsByCampaign(campaignID string) ([]*model.Session, error) {
	rows, err := db.conn.Query(`SELECT `+sessionColumns+` FROM session WHERE campaign_id = $1 AND series_id IS NULL`, campaignID)
	if err != nil {
		return nil, fmt.Errorf("list one-off sessions: %w", err)
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

func (db *DB) ListSeriesSessionsByCampaign(campaignID string) ([]*model.Session, error) {
	rows, err := db.conn.Query(`SELECT `+sessionColumns+` FROM session WHERE campaign_id = $1 AND series_id IS NOT NULL`, campaignID)
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

func (db *DB) GetNextSessionByCampaign(campaignID string) (*model.Session, error) {
	row := db.conn.QueryRow(`
		SELECT `+sessionColumns+` FROM session
		WHERE campaign_id = $1 AND scheduled_at > NOW()
		ORDER BY scheduled_at ASC LIMIT 1`, campaignID)
	return scanSession(row)
}

func (db *DB) RemoveSession(id, campaignID string) error {
	_, err := db.conn.Exec(`DELETE FROM session WHERE id = $1 AND campaign_id = $2`, id, campaignID)
	if err != nil {
		return fmt.Errorf("remove session: %w", err)
	}
	return nil
}

func (db *DB) UpdateSession(req *model.UpdateSessionRequest) (*model.Session, error) {
	row := db.conn.QueryRow(`
		UPDATE session SET title = COALESCE($1, title), description = COALESCE($2, description),
		recap = COALESCE($3, recap), updated_at = NOW()
		WHERE id = $4 AND campaign_id = $5
		RETURNING `+sessionColumns,
		req.Title, req.Description, req.Recap, req.ID, req.CampaignID)
	return scanSession(row)
}
