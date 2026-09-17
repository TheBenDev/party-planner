package map_hex

import (
	"context"
	"database/sql"
	"fmt"

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

const hexColumns = `id, campaign_id, q, r, terrain, label`

func scanHex(row interface{ Scan(...any) error }) (*model.MapHex, error) {
	var h model.MapHex
	err := row.Scan(&h.ID, &h.CampaignID, &h.Q, &h.R, &h.Terrain, &h.Label)
	if err != nil {
		return nil, err
	}
	return &h, nil
}

func (db *DB) GetCampaignMap(ctx context.Context, campaignID string) ([]*model.MapHex, error) {
	rows, err := db.conn.QueryContext(ctx,
		`SELECT `+hexColumns+` FROM map_hexes WHERE campaign_id = $1`,
		campaignID,
	)
	if err != nil {
		return nil, fmt.Errorf("get campaign map: %w", err)
	}
	var hexes []*model.MapHex
	for rows.Next() {
		h, err := scanHex(rows)
		if err != nil {
			return nil, fmt.Errorf("scan hex: %w", err)
		}
		hexes = append(hexes, h)
	}
	if err := rows.Close(); err != nil {
		return nil, fmt.Errorf("close rows: %w", err)
	}
	return hexes, rows.Err()
}

func (db *DB) UpsertMapHex(ctx context.Context, req *model.UpsertMapHexRequest) (*model.MapHex, error) {
	row := db.conn.QueryRowContext(ctx, `
		INSERT INTO map_hexes (campaign_id, q, r, terrain, label)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (campaign_id, q, r)
		DO UPDATE SET terrain = EXCLUDED.terrain, label = EXCLUDED.label
		RETURNING `+hexColumns,
		req.CampaignID, req.Q, req.R, req.Terrain, req.Label,
	)
	return scanHex(row)
}

func (db *DB) ClearMapHex(ctx context.Context, campaignID string, q, r int32) error {
	_, err := db.conn.ExecContext(ctx,
		`DELETE FROM map_hexes WHERE campaign_id = $1 AND q = $2 AND r = $3`,
		campaignID, q, r,
	)
	if err != nil {
		return fmt.Errorf("clear map hex: %w", err)
	}
	return nil
}
