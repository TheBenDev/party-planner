package db

import (
	"encoding/json"
	"fmt"
	"log/slog"

	model "github.com/BBruington/party-planner/api/internal/models"
)

const userIntegrationColumns = `id, user_id, source, metadata, created_at, updated_at`

func scanUserIntegration(row interface{ Scan(...any) error }) (*model.UserIntegration, error) {
	var ui model.UserIntegration
	var metadata []byte
	err := row.Scan(&ui.ID, &ui.UserID, &ui.Source, &metadata, &ui.CreatedAt, &ui.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if metadata != nil {
		ui.Metadata = json.RawMessage(metadata)
	}
	return &ui, nil
}

func (db *DB) UpsertUserIntegration(req *model.UpsertUserIntegrationRequest) (*model.UserIntegration, error) {
	row := db.conn.QueryRow(`
		INSERT INTO user_integrations (user_id, source, metadata)
		VALUES ($1, $2, $3)
		ON CONFLICT (user_id, source) DO UPDATE
			SET metadata = EXCLUDED.metadata, updated_at = NOW()
		RETURNING `+userIntegrationColumns,
		req.UserID, req.Source, req.Metadata,
	)
	return scanUserIntegration(row)
}

func (db *DB) DeleteUserIntegration(userID string, source model.IntegrationSource) error {
	_, err := db.conn.Exec(`
		DELETE FROM user_integrations WHERE user_id = $1 AND source = $2`,
		userID, source,
	)
	if err != nil {
		return fmt.Errorf("delete user integration: %w", err)
	}
	return nil
}

func (db *DB) GetUserIntegration(userID string, source model.IntegrationSource) (*model.UserIntegration, error) {
	row := db.conn.QueryRow(`
		SELECT `+userIntegrationColumns+` FROM user_integrations
		WHERE user_id = $1 AND source = $2 LIMIT 1`,
		userID, source,
	)
	return scanUserIntegration(row)
}

func (db *DB) ListUserIntegrationsByCampaign(campaignID string, source model.IntegrationSource) ([]*model.CampaignMemberIntegration, error) {
	rows, err := db.conn.Query(`
		SELECT ui.user_id, ui.metadata
		FROM user_integrations ui
		INNER JOIN campaign_users cu ON cu.user_id = ui.user_id AND cu.campaign_id = $1
		WHERE ui.source = $2`,
		campaignID, source,
	)
	if err != nil {
		return nil, fmt.Errorf("list user integrations by campaign: %w", err)
	}
	defer func() {
		if err := rows.Close(); err != nil {
			slog.Error("failed to close rows", "error", err)
		}
	}()

	var results []*model.CampaignMemberIntegration
	for rows.Next() {
		var m model.CampaignMemberIntegration
		var metadata []byte
		if err := rows.Scan(&m.UserID, &metadata); err != nil {
			return nil, fmt.Errorf("scan campaign member integration: %w", err)
		}
		if metadata != nil {
			m.Metadata = json.RawMessage(metadata)
		}
		results = append(results, &m)
	}
	return results, rows.Err()
}
