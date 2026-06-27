package location

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"

	model "github.com/BBruington/party-planner/api/internal/models"
	"github.com/BBruington/party-planner/api/internal/pg"
)

// DB wraps a [sql.DB] connection for location queries.
type DB struct {
	conn pg.Querier
	raw  *sql.DB
}

// NewDB creates a new location DB wrapping the given connection.
func NewDB(conn *sql.DB) *DB {
	return &DB{conn: conn, raw: conn}
}

// ── Location ──────────────────────────────────────────────────────────────────

const locationColumns = `id, campaign_id, name, description, notes, dm_notes, deleted_at, created_at, updated_at`

func scanLocation(row interface{ Scan(...any) error }) (*model.Location, error) {
	var l model.Location
	err := row.Scan(
		&l.ID, &l.CampaignID, &l.Name, &l.Description, &l.Notes, &l.DmNotes,
		&l.DeletedAt, &l.CreatedAt, &l.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &l, nil
}

func (db *DB) CreateLocation(ctx context.Context, req *model.CreateLocationRequest) (*model.Location, error) {
	row := db.conn.QueryRowContext(ctx, `
		INSERT INTO location (campaign_id, name, description, notes, dm_notes)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING `+locationColumns,
		req.CampaignID, req.Name, req.Description, req.Notes, req.DmNotes,
	)
	return scanLocation(row)
}

func (db *DB) GetLocation(ctx context.Context, id, campaignID string) (*model.Location, error) {
	row := db.conn.QueryRowContext(ctx,
		`SELECT `+locationColumns+` FROM location WHERE id = $1 AND campaign_id = $2 AND deleted_at IS NULL LIMIT 1`,
		id, campaignID,
	)
	return scanLocation(row)
}

func (db *DB) ListLocationsByCampaign(ctx context.Context, campaignID string) ([]*model.Location, error) {
	rows, err := db.conn.QueryContext(ctx, `SELECT `+locationColumns+` FROM location WHERE campaign_id = $1 AND deleted_at IS NULL`, campaignID)
	if err != nil {
		return nil, fmt.Errorf("list locations: %w", err)
	}
	defer func() {
		if err := rows.Close(); err != nil {
			slog.Error("failed to close rows", "error", err)
		}
	}()

	var locations []*model.Location
	for rows.Next() {
		location, err := scanLocation(rows)
		if err != nil {
			return nil, fmt.Errorf("scan location: %w", err)
		}
		locations = append(locations, location)
	}
	return locations, rows.Err()
}

func (db *DB) UpdateLocation(ctx context.Context, req *model.UpdateLocationRequest) (*model.Location, error) {
	row := db.conn.QueryRowContext(ctx, `
		UPDATE location SET
			name        = COALESCE($1, name),
			description = $2,
			notes       = $3,
			dm_notes    = $4,
			updated_at  = NOW()
		WHERE id = $5 AND campaign_id = $6 AND deleted_at IS NULL
		RETURNING `+locationColumns,
		req.Name, req.Description, req.Notes, req.DmNotes,
		req.ID, req.CampaignID,
	)
	return scanLocation(row)
}

func (db *DB) DeleteLocation(ctx context.Context, id, campaignID string) (*model.Location, error) {
	row := db.conn.QueryRowContext(ctx, `
		UPDATE location SET deleted_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND campaign_id = $2 AND deleted_at IS NULL
		RETURNING `+locationColumns,
		id, campaignID,
	)
	return scanLocation(row)
}
