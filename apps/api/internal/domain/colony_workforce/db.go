package colony_workforce

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"strings"

	model "github.com/BBruington/party-planner/api/internal/models"
	"github.com/BBruington/party-planner/api/internal/pg"
)

// DB wraps a [sql.DB] connection for colony workforce queries.
type DB struct {
	conn pg.Querier
	raw  *sql.DB
}

// NewDB creates a new colony workforce DB wrapping the given connection.
func NewDB(conn *sql.DB) *DB {
	return &DB{conn: conn, raw: conn}
}

const workforceColumns = `id, colony_id, worker_type, count, created_at, updated_at`

func scanColonyWorkforce(row interface{ Scan(...any) error }) (*model.ColonyWorkforce, error) {
	var w model.ColonyWorkforce
	err := row.Scan(&w.ID, &w.ColonyID, &w.WorkerType, &w.Count, &w.CreatedAt, &w.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &w, nil
}

func (db *DB) GetColonyByCampaign(ctx context.Context, colonyID, campaignID string) error {
	var id string
	return db.conn.QueryRowContext(ctx,
		`SELECT id FROM colony WHERE id = $1 AND campaign_id = $2 LIMIT 1`,
		colonyID, campaignID,
	).Scan(&id)
}

func (db *DB) ListWorkforceByColony(ctx context.Context, colonyID string) ([]*model.ColonyWorkforce, error) {
	rows, err := db.conn.QueryContext(ctx,
		`SELECT `+workforceColumns+` FROM colony_workforce WHERE colony_id = $1`,
		colonyID,
	)
	if err != nil {
		return nil, fmt.Errorf("list workforce: %w", err)
	}
	defer func() {
		if err := rows.Close(); err != nil {
			slog.Error("failed to close rows", "error", err)
		}
	}()

	var workforce []*model.ColonyWorkforce
	for rows.Next() {
		w, err := scanColonyWorkforce(rows)
		if err != nil {
			return nil, fmt.Errorf("scan workforce: %w", err)
		}
		workforce = append(workforce, w)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list workforce rows: %w", err)
	}
	return workforce, nil
}

func (db *DB) SeedWorkforce(ctx context.Context, colonyID string) error {
	_, err := db.conn.ExecContext(ctx, `
		INSERT INTO colony_workforce (colony_id, worker_type, count) VALUES
			($1, 'FARMER', 0),
			($1, 'HEALER', 0),
			($1, 'BLACKSMITH', 0),
			($1, 'SOLDIER', 0),
			($1, 'MINER', 0),
			($1, 'BUILDER', 0),
			($1, 'SCHOLAR', 0),
			($1, 'MAGE', 0)
		ON CONFLICT (colony_id, worker_type) DO NOTHING
	`, colonyID)
	return err
}

func (db *DB) UpsertColonyWorkforces(ctx context.Context, req *model.UpsertColonyWorkforceRequest) ([]*model.ColonyWorkforce, error) {
	updatedWorkforces := make([]string, len(req.Workforces))
	args := make([]any, 0, len(req.Workforces)*3)
	for i, w := range req.Workforces {
		updatedWorkforces[i] = fmt.Sprintf("($%d, $%d, $%d)", i*3+1, i*3+2, i*3+3)
		args = append(args, req.ColonyID, w.WorkerType, w.Count)
	}
	rows, err := db.conn.QueryContext(ctx, `
		INSERT INTO colony_workforce (colony_id, worker_type, count)
		VALUES `+strings.Join(updatedWorkforces, ", ")+`
		ON CONFLICT (colony_id, worker_type) DO UPDATE
			SET count = EXCLUDED.count, updated_at = NOW()
		RETURNING `+workforceColumns,
		args...,
	)
	if err != nil {
		return nil, fmt.Errorf("upsert workforce: %w", err)
	}
	defer func() {
		if err := rows.Close(); err != nil {
			slog.Error("failed to close rows", "error", err)
		}
	}()
	var workforces []*model.ColonyWorkforce
	for rows.Next() {
		w, err := scanColonyWorkforce(rows)
		if err != nil {
			return nil, fmt.Errorf("scan workforce: %w", err)
		}
		workforces = append(workforces, w)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("upsert workforce rows: %w", err)
	}
	return workforces, nil
}
