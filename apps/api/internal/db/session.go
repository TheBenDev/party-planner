package db

import (
	"fmt"
	"log/slog"

	model "github.com/BBruington/party-planner/api/internal/models"
)

const sessionColumns = `id, campaign_id, title, description, starts_at, status, created_at, poll_id, announced_at, updated_at, series_id, original_starts_at, discord_event_id, recap`

func scanSession(row interface{ Scan(...any) error }) (*model.Session, error) {
	var s model.Session
	err := row.Scan(
		&s.ID, &s.CampaignID, &s.Title, &s.Description, &s.StartsAt,
		&s.Status, &s.CreatedAt, &s.PollID, &s.AnnouncedAt, &s.UpdatedAt,
		&s.SeriesID, &s.OriginalStartsAt, &s.DiscordEventID, &s.Recap,
	)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (db *DB) CreateSession(session *model.CreateSessionRequest) (*model.Session, error) {
	row := db.conn.QueryRow(`
		INSERT INTO session (campaign_id, title, description, status, starts_at, series_id, original_starts_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING `+sessionColumns,
		session.CampaignID, session.Title, session.Description, session.Status, session.StartsAt,
		session.SeriesID, session.OriginalStartsAt,
	)
	return scanSession(row)
}

func (db *DB) GetSession(id, campaignId string) (*model.Session, error) {
	row := db.conn.QueryRow(`SELECT `+sessionColumns+` FROM session WHERE id = $1 AND campaign_id = $2 LIMIT 1`, id, campaignId)
	return scanSession(row)
}

func (db *DB) GetNextSessionByCampaign(campaignID string) (*model.Session, error) {
	row := db.conn.QueryRow(`
		SELECT `+sessionColumns+` FROM session
		WHERE campaign_id = $1 AND starts_at > NOW()
		ORDER BY starts_at ASC
		LIMIT 1`, campaignID)
	return scanSession(row)
}

func (db *DB) ListOneOffSessionsByCampaign(campaignId string) ([]*model.Session, error) {
	rows, err := db.conn.Query(`SELECT `+sessionColumns+` FROM session WHERE campaign_id = $1 AND series_id IS NULL`, campaignId)
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

func (db *DB) ListSeriesSessionsByCampaign(campaignId string) ([]*model.Session, error) {
	rows, err := db.conn.Query(`SELECT `+sessionColumns+` FROM session WHERE campaign_id = $1 AND series_id IS NOT NULL`, campaignId)
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

func (db *DB) ListSessionsInReminderWindow(campaignID string) ([]*model.Session, error) {
	rows, err := db.conn.Query(`
		SELECT `+sessionColumns+` FROM session
		WHERE campaign_id = $1
		  AND status = 'CONFIRMED'
		  AND starts_at > NOW() + INTERVAL '24 hours'
		  AND starts_at <= NOW() + INTERVAL '48 hours'`,
		campaignID,
	)
	if err != nil {
		return nil, fmt.Errorf("list sessions in reminder window: %w", err)
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

func (db *DB) RemoveSession(id, campaignID string) error {
	_, err := db.conn.Exec(`DELETE FROM session WHERE id = $1 AND campaign_id = $2`, id, campaignID)
	if err != nil {
		return fmt.Errorf("remove session: %w", err)
	}
	return nil
}

func (db *DB) MarkSessionAnnounced(id, campaignId string) (*model.Session, error) {
	row := db.conn.QueryRow(`
		UPDATE session SET announced_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND campaign_id = $2
		RETURNING `+sessionColumns,
		id, campaignId)
	return scanSession(row)
}

func (db *DB) UpdateSession(session *model.UpdateSessionRequest) (*model.Session, error) {
	row := db.conn.QueryRow(`
		UPDATE session SET title = COALESCE($1, title), description = $2, status = $3, starts_at = $4, poll_id = $5, recap = COALESCE($6, recap), updated_at = NOW()
		WHERE id = $7 AND campaign_id = $8
		RETURNING `+sessionColumns,
		session.Title, session.Description, session.Status, session.StartsAt, session.PollId, session.Recap, session.ID, session.CampaignID)
	return scanSession(row)
}

func (db *DB) SetSessionDiscordEventID(id, campaignID, eventID string) error {
	result, err := db.conn.Exec(
		`UPDATE session SET discord_event_id = $1, updated_at = NOW() WHERE id = $2 AND campaign_id = $3`,
		eventID, id, campaignID,
	)
	if err != nil {
		return fmt.Errorf("set session discord_event_id: %w", err)
	}
	n, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("set session discord_event_id rows affected: %w", err)
	}
	if n == 0 {
		return fmt.Errorf("set session discord_event_id: no session found for id=%s campaignID=%s", id, campaignID)
	}
	return nil
}

func (db *DB) ClearSessionDiscordEventID(id, campaignID string) error {
	result, err := db.conn.Exec(
		`UPDATE session SET discord_event_id = NULL, updated_at = NOW() WHERE id = $1 AND campaign_id = $2`,
		id, campaignID,
	)
	if err != nil {
		return fmt.Errorf("clear session discord_event_id: %w", err)
	}
	n, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("clear session discord_event_id rows affected: %w", err)
	}
	if n == 0 {
		return fmt.Errorf("clear session discord_event_id: no session found for id=%s campaignID=%s", id, campaignID)
	}
	return nil
}
