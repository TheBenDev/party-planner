package location

import (
	"context"
	"database/sql"

	model "github.com/BBruington/party-planner/api/internal/models"
	"github.com/BBruington/party-planner/api/internal/pg"
)

type DB struct {
	conn pg.Querier
	raw  *sql.DB
}

func NewDB(conn *sql.DB) *DB {
	return &DB{conn: conn, raw: conn}
}

const locationSelectColumns = `l.id, l.region_id, l.name, l.description, l.notes, l.dm_notes, l.map_x, l.map_y, l.deleted_at, l.created_at, l.updated_at`

func scanLocation(row interface{ Scan(...any) error }) (*model.Location, error) {
	var l model.Location
	err := row.Scan(
		&l.ID, &l.RegionID, &l.Name, &l.Description, &l.Notes, &l.DmNotes,
		&l.MapX, &l.MapY, &l.DeletedAt, &l.CreatedAt, &l.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &l, nil
}


func (db *DB) CreateLocation(ctx context.Context, req *model.CreateLocationRequest) (*model.Location, error) {
	row := db.conn.QueryRowContext(ctx, `
		WITH region_check AS (
			SELECT id FROM regions WHERE id = $1 AND campaign_id = $2 AND deleted_at IS NULL
		)
		INSERT INTO location (region_id, name, description, notes, dm_notes, map_x, map_y)
		SELECT $1, $3, $4, $5, $6, $7, $8
		FROM region_check
		RETURNING id, region_id, name, description, notes, dm_notes, map_x, map_y, deleted_at, created_at, updated_at`,
		req.RegionID, req.CampaignID, req.Name, req.Description, req.Notes, req.DmNotes, req.MapX, req.MapY,
	)
	return scanLocation(row)
}

func (db *DB) GetLocation(ctx context.Context, id, campaignID string) (*model.Location, error) {
	row := db.conn.QueryRowContext(ctx, `
		SELECT `+locationSelectColumns+`
		FROM location l
		JOIN regions r ON l.region_id = r.id
		WHERE l.id = $1 AND r.campaign_id = $2 AND l.deleted_at IS NULL
		LIMIT 1`,
		id, campaignID,
	)
	return scanLocation(row)
}

func (db *DB) UpdateLocation(ctx context.Context, req *model.UpdateLocationRequest) (*model.Location, error) {
	row := db.conn.QueryRowContext(ctx, `
		UPDATE location SET
			name        = COALESCE($1, name),
			description = COALESCE($2, description),
			notes       = COALESCE($3, notes),
			dm_notes    = COALESCE($4, dm_notes),
			map_x       = $5,
			map_y       = $6,
			updated_at  = NOW()
		WHERE id = $7
		  AND region_id IN (SELECT id FROM regions WHERE campaign_id = $8 AND deleted_at IS NULL)
		  AND deleted_at IS NULL
		RETURNING id, region_id, name, description, notes, dm_notes, map_x, map_y, deleted_at, created_at, updated_at`,
		req.Name, req.Description, req.Notes, req.DmNotes, req.MapX, req.MapY,
		req.ID, req.CampaignID,
	)
	return scanLocation(row)
}

func (db *DB) DeleteLocation(ctx context.Context, id, campaignID string) (*model.Location, error) {
	row := db.conn.QueryRowContext(ctx, `
		UPDATE location SET deleted_at = NOW(), updated_at = NOW()
		WHERE id = $1
		  AND region_id IN (SELECT id FROM regions WHERE campaign_id = $2 AND deleted_at IS NULL)
		  AND deleted_at IS NULL
		RETURNING id, region_id, name, description, notes, dm_notes, map_x, map_y, deleted_at, created_at, updated_at`,
		id, campaignID,
	)
	return scanLocation(row)
}
