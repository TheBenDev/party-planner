package quest

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log/slog"

	model "github.com/BBruington/party-planner/api/internal/models"
	"github.com/BBruington/party-planner/api/internal/pg"
)

// DB wraps a [sql.DB] connection for quest queries.
type DB struct {
	conn pg.Querier
	raw  *sql.DB
}

// NewDB creates a new quest DB wrapping the given connection.
func NewDB(conn *sql.DB) *DB {
	return &DB{conn: conn, raw: conn}
}

// ── Quest ─────────────────────────────────────────────────────────────────────

const questColumns = `id, campaign_id, title, status, description, quest_giver_id, reward, completed_at, deleted_at, created_at, updated_at, type`

func scanQuest(row interface{ Scan(...any) error }) (*model.Quest, error) {
	var q model.Quest
	var rewardBytes []byte
	var questType sql.NullString
	err := row.Scan(
		&q.ID, &q.CampaignID, &q.Title, &q.Status, &q.Description, &q.QuestGiverID,
		&rewardBytes, &q.CompletedAt, &q.DeletedAt, &q.CreatedAt, &q.UpdatedAt, &questType,
	)
	if err != nil {
		return nil, err
	}
	if rewardBytes != nil {
		var reward model.QuestReward
		if err := json.Unmarshal(rewardBytes, &reward); err == nil {
			q.Reward = &reward
		}
	}
	if questType.Valid {
		t := model.QuestType(questType.String)
		q.Type = &t
	}
	return &q, nil
}

func marshalReward(reward *model.QuestReward) ([]byte, error) {
	if reward == nil {
		return nil, nil
	}
	return json.Marshal(reward)
}

func (db *DB) CreateQuest(ctx context.Context, req *model.CreateQuestRequest) (*model.Quest, error) {
	rewardBytes, err := marshalReward(req.Reward)
	if err != nil {
		return nil, fmt.Errorf("marshal reward: %w", err)
	}
	row := db.conn.QueryRowContext(ctx, `
		INSERT INTO quest (campaign_id, title, status, description, quest_giver_id, reward, type)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING `+questColumns,
		req.CampaignID, req.Title, req.Status, req.Description, req.QuestGiverID, rewardBytes, req.Type,
	)
	return scanQuest(row)
}

func (db *DB) GetQuest(ctx context.Context, id, campaignID string) (*model.Quest, error) {
	row := db.conn.QueryRowContext(ctx,
		`SELECT `+questColumns+` FROM quest WHERE id = $1 AND campaign_id = $2 AND deleted_at IS NULL LIMIT 1`,
		id, campaignID,
	)
	return scanQuest(row)
}

func (db *DB) ListQuestsByCampaign(ctx context.Context, campaignID string) ([]*model.Quest, error) {
	rows, err := db.conn.QueryContext(ctx, `SELECT `+questColumns+` FROM quest WHERE campaign_id = $1 AND deleted_at IS NULL`, campaignID)
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

func (db *DB) UpdateQuest(ctx context.Context, req *model.UpdateQuestRequest) (*model.Quest, error) {
	rewardBytes, err := marshalReward(req.Reward)
	if err != nil {
		return nil, fmt.Errorf("marshal reward: %w", err)
	}
	row := db.conn.QueryRowContext(ctx, `
		UPDATE quest SET
			title       = COALESCE($1, title),
			status      = COALESCE($2, status),
			description = $3,
			type        = COALESCE($6, type),
			reward      = COALESCE($7, reward),
			updated_at  = NOW()
		WHERE id = $4 AND campaign_id = $5 AND deleted_at IS NULL
		RETURNING `+questColumns,
		req.Title, req.Status, req.Description, req.ID, req.CampaignID, req.Type, rewardBytes,
	)
	return scanQuest(row)
}

func (db *DB) CompleteQuest(ctx context.Context, id, campaignID string) (*model.Quest, error) {
	row := db.conn.QueryRowContext(ctx, `
		UPDATE quest SET
			status       = 'COMPLETED',
			completed_at = NOW(),
			updated_at   = NOW()
		WHERE id = $1 AND campaign_id = $2 AND deleted_at IS NULL
		RETURNING `+questColumns,
		id, campaignID,
	)
	return scanQuest(row)
}

func (db *DB) RemoveQuest(ctx context.Context, id, campaignID string) error {
	_, err := db.conn.ExecContext(ctx,
		`UPDATE quest SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND campaign_id = $2 AND deleted_at IS NULL`,
		id, campaignID,
	)
	if err != nil {
		return fmt.Errorf("remove quest: %w", err)
	}
	return nil
}
