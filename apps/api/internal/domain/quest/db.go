package quest

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log/slog"

	model "github.com/BBruington/party-planner/api/internal/models"
)

type querier interface {
	Exec(query string, args ...any) (sql.Result, error)
	QueryRow(query string, args ...any) *sql.Row
	Query(query string, args ...any) (*sql.Rows, error)
}

// DB wraps a [sql.DB] connection for quest queries.
type DB struct {
	conn querier
	raw  *sql.DB
}

// NewDB creates a new quest DB wrapping the given connection.
func NewDB(conn *sql.DB) *DB {
	return &DB{conn: conn, raw: conn}
}

// ── Quest ─────────────────────────────────────────────────────────────────────

const questColumns = `id, campaign_id, title, status, description, quest_giver_id, reward, completed_at, deleted_at, created_at, updated_at`

func scanQuest(row interface{ Scan(...any) error }) (*model.Quest, error) {
	var q model.Quest
	var reward []byte
	err := row.Scan(
		&q.ID, &q.CampaignID, &q.Title, &q.Status, &q.Description, &q.QuestGiverID,
		&reward, &q.CompletedAt, &q.DeletedAt, &q.CreatedAt, &q.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	if reward != nil {
		q.Reward = json.RawMessage(reward)
	}
	return &q, nil
}

func (db *DB) CreateQuest(req *model.CreateQuestRequest) (*model.Quest, error) {
	row := db.conn.QueryRow(`
		INSERT INTO quest (campaign_id, title, status, description, quest_giver_id, reward)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING `+questColumns,
		req.CampaignID, req.Title, req.Status, req.Description, req.QuestGiverID, req.Reward,
	)
	return scanQuest(row)
}

func (db *DB) GetQuest(id, campaignID string) (*model.Quest, error) {
	row := db.conn.QueryRow(
		`SELECT `+questColumns+` FROM quest WHERE id = $1 AND campaign_id = $2 AND deleted_at IS NULL LIMIT 1`,
		id, campaignID,
	)
	return scanQuest(row)
}

func (db *DB) ListQuestsByCampaign(campaignID string) ([]*model.Quest, error) {
	rows, err := db.conn.Query(`SELECT `+questColumns+` FROM quest WHERE campaign_id = $1 AND deleted_at IS NULL`, campaignID)
	if err != nil {
		return nil, fmt.Errorf("list quests: %w", err)
	}
	defer func() {
		if err := rows.Close(); err != nil {
			slog.Error("failed to close rows", "error", err)
		}
	}()

	var quests []*model.Quest
	for rows.Next() {
		quest, err := scanQuest(rows)
		if err != nil {
			return nil, fmt.Errorf("scan quest: %w", err)
		}
		quests = append(quests, quest)
	}
	return quests, rows.Err()
}

func (db *DB) UpdateQuest(req *model.UpdateQuestRequest) (*model.Quest, error) {
	row := db.conn.QueryRow(`
		UPDATE quest SET
			title       = COALESCE($1, title),
			status      = COALESCE($2, status),
			description = $3,
			updated_at  = NOW()
		WHERE id = $4 AND campaign_id = $5 AND deleted_at IS NULL
		RETURNING `+questColumns,
		req.Title, req.Status, req.Description, req.ID, req.CampaignID,
	)
	return scanQuest(row)
}

func (db *DB) RemoveQuest(id, campaignID string) error {
	_, err := db.conn.Exec(
		`UPDATE quest SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND campaign_id = $2 AND deleted_at IS NULL`,
		id, campaignID,
	)
	if err != nil {
		return fmt.Errorf("remove quest: %w", err)
	}
	return nil
}
