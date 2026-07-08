package colony

import (
	"context"
	"database/sql"
	"fmt"

	model "github.com/BBruington/party-planner/api/internal/models"
	"github.com/BBruington/party-planner/api/internal/pg"
)

// DB wraps a [sql.DB] connection for colony queries.
type DB struct {
	conn pg.Querier
	raw  *sql.DB
}

// NewDB creates a new colony DB wrapping the given connection.
func NewDB(conn *sql.DB) *DB {
	return &DB{conn: conn, raw: conn}
}

const colonyColumns = `id, campaign_id, colonist_count, food, building_materials, gold, morale, created_at, updated_at`

func scanColony(row interface{ Scan(...any) error }) (*model.Colony, error) {
	var c model.Colony
	err := row.Scan(
		&c.ID, &c.CampaignID, &c.ColonistCount, &c.Food, &c.BuildingMaterials, &c.Gold, &c.Morale,
		&c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (db *DB) CreateColony(ctx context.Context, req *model.CreateColonyRequest) (*model.Colony, error) {
	row := db.conn.QueryRowContext(ctx, `
		INSERT INTO colony (campaign_id, colonist_count, food, building_materials, gold, morale)
		VALUES ($1, COALESCE($2, 0), COALESCE($3, 0), COALESCE($4, 0), COALESCE($5, 0), COALESCE($6, 100))
		RETURNING `+colonyColumns,
		req.CampaignID, req.ColonistCount, req.Food, req.BuildingMaterials, req.Gold, req.Morale,
	)
	return scanColony(row)
}

func (db *DB) GetColonyByCampaign(ctx context.Context, campaignID string) (*model.Colony, error) {
	row := db.conn.QueryRowContext(ctx,
		`SELECT `+colonyColumns+` FROM colony WHERE campaign_id = $1 LIMIT 1`,
		campaignID,
	)
	return scanColony(row)
}

func (db *DB) UpdateColony(ctx context.Context, req *model.UpdateColonyRequest) (*model.Colony, error) {
	row := db.conn.QueryRowContext(ctx, `
		UPDATE colony SET
			colonist_count     = COALESCE($1, colonist_count),
			food               = COALESCE($2, food),
			building_materials = COALESCE($3, building_materials),
			gold               = COALESCE($4, gold),
			morale             = COALESCE($5, morale),
			updated_at         = NOW()
		WHERE id = $6 AND campaign_id = $7
		RETURNING `+colonyColumns,
		req.ColonistCount, req.Food, req.BuildingMaterials, req.Gold, req.Morale,
		req.ID, req.CampaignID,
	)
	return scanColony(row)
}

func (db *DB) ApplyRewardByCampaign(ctx context.Context, campaignID string, reward *model.QuestRewardColony) (*model.Colony, error) {
	row := db.conn.QueryRowContext(ctx, `
		UPDATE colony SET
			gold               = GREATEST(0, gold               + COALESCE($1, 0)),
			food               = GREATEST(0, food               + COALESCE($2, 0)),
			building_materials = GREATEST(0, building_materials + COALESCE($3, 0)),
			colonist_count     = GREATEST(0, colonist_count     + COALESCE($4, 0)),
			morale             = LEAST(100, GREATEST(0, morale  + COALESCE($5, 0))),
			updated_at         = NOW()
		WHERE campaign_id = $6
		RETURNING `+colonyColumns,
		reward.Gold, reward.Food, reward.BuildingMaterials, reward.ColonistCount, reward.Morale,
		campaignID,
	)
	return scanColony(row)
}

func (db *DB) RemoveColony(ctx context.Context, id, campaignID string) error {
	_, err := db.conn.ExecContext(ctx,
		`DELETE FROM colony WHERE id = $1 AND campaign_id = $2`,
		id, campaignID,
	)
	if err != nil {
		return fmt.Errorf("remove colony: %w", err)
	}
	return nil
}
