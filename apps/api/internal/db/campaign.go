package db

import (
	model "github.com/BBruington/party-planner/api/internal/models"
	"github.com/lib/pq"
)

const campaignColumns = `id, user_id, title, description, tags, created_at, updated_at, deleted_at`

func scanCampaign(row interface{ Scan(...any) error }) (*model.Campaign, error) {
	var c model.Campaign
	err := row.Scan(
		&c.ID, &c.UserID, &c.Title, &c.Description, pq.Array(&c.Tags),
		&c.CreatedAt, &c.UpdatedAt, &c.DeletedAt,
	)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (db *DB) CreateCampaign(campaign *model.CreateCampaignRequest) (*model.Campaign, error) {
	row := db.conn.QueryRow(`
		INSERT INTO campaigns (user_id, title, description, tags)
		VALUES ($1, $2, $3, $4)
		RETURNING `+campaignColumns,
		campaign.UserID, campaign.Title, campaign.Description, campaign.Tags,
	)
	return scanCampaign(row)
}

func (db *DB) GetCampaign(id string) (*model.Campaign, error) {
	row := db.conn.QueryRow(`SELECT `+campaignColumns+` FROM campaigns WHERE id = $1 AND deleted_at IS NULL LIMIT 1`, id)
	return scanCampaign(row)
}

func (db *DB) UpdateCampaign(req *model.UpdateCampaignRequest) (*model.Campaign, error) {
	row := db.conn.QueryRow(`
		UPDATE campaigns SET
			title       = COALESCE($1, title),
			description = COALESCE($2, description),
			tags        = COALESCE($3, tags),
			updated_at  = NOW()
		WHERE id = $4 AND deleted_at IS NULL
		RETURNING `+campaignColumns,
		req.Title, req.Description, pq.Array(req.Tags), req.ID,
	)
	return scanCampaign(row)
}

func (db *DB) DeleteCampaign(id string) (*model.Campaign, error) {
	row := db.conn.QueryRow(`
		UPDATE campaigns SET deleted_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL
		RETURNING `+campaignColumns, id)
	return scanCampaign(row)
}
