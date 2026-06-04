package db

import (
	"fmt"
	"log/slog"

	model "github.com/BBruington/party-planner/api/internal/models"
)

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

func (db *DB) CreateLocation(location *model.CreateLocationRequest) (*model.Location, error) {
	row := db.conn.QueryRow(`
		INSERT INTO location (campaign_id, name, description, notes, dm_notes)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING `+locationColumns,
		location.CampaignID, location.Name, location.Description, location.Notes, location.DmNotes,
	)
	return scanLocation(row)
}

func (db *DB) GetLocation(id, campaignId string) (*model.Location, error) {
	row := db.conn.QueryRow(`SELECT `+locationColumns+` FROM location WHERE id = $1 AND campaign_id = $2 AND deleted_at IS NULL LIMIT 1`, id, campaignId)
	return scanLocation(row)
}

func (db *DB) ListLocationsByCampaign(campaignId string) ([]*model.Location, error) {
	rows, err := db.conn.Query(`SELECT `+locationColumns+` FROM location WHERE campaign_id = $1 AND deleted_at IS NULL`, campaignId)
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

func (db *DB) UpdateLocation(location *model.UpdateLocationRequest) (*model.Location, error) {
	row := db.conn.QueryRow(`
		UPDATE location SET
			name        = COALESCE($1, name),
			description = $2,
			notes       = $3,
			dm_notes    = $4,
			updated_at  = NOW()
		WHERE id = $5 AND campaign_id = $6 AND deleted_at IS NULL
		RETURNING `+locationColumns,
		location.Name, location.Description, location.Notes, location.DmNotes,
		location.ID, location.CampaignID,
	)
	return scanLocation(row)
}

func (db *DB) RemoveLocation(id, campaignID string) error {
	_, err := db.conn.Exec(`UPDATE location SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND campaign_id = $2 AND deleted_at IS NULL`, id, campaignID)
	if err != nil {
		return fmt.Errorf("remove location: %w", err)
	}
	return nil
}
