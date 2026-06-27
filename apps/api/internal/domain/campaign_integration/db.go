package campaign_integration

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log/slog"

	model "github.com/BBruington/party-planner/api/internal/models"
	"github.com/BBruington/party-planner/api/internal/pg"
)

// DB wraps a [sql.DB] connection for campaign integration queries.
type DB struct {
	conn pg.Querier
	raw  *sql.DB
}

// NewDB creates a new campaign integration DB wrapping the given connection.
func NewDB(conn *sql.DB) *DB {
	return &DB{conn: conn, raw: conn}
}

// ── Campaign Integration ──────────────────────────────────────────────────────

const campaignIntegrationColumns = `id, campaign_id, external_id, source, metadata, settings, created_at, updated_at`

func scanCampaignIntegration(row interface{ Scan(...any) error }) (*model.CampaignIntegration, error) {
	var ci model.CampaignIntegration
	err := row.Scan(
		&ci.ID, &ci.CampaignID, &ci.ExternalID, &ci.Source, &ci.Metadata, &ci.Settings,
		&ci.CreatedAt, &ci.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &ci, nil
}

func isValidIntegrationSource(s model.IntegrationSource) bool {
	switch s {
	case model.IntegrationSourceDiscord:
		return true
	default:
		return false
	}
}

func (db *DB) CreateCampaignIntegration(ctx context.Context, req *model.CreateCampaignIntegrationRequest) (*model.CampaignIntegration, error) {
	if !isValidIntegrationSource(req.Source) {
		return nil, fmt.Errorf("invalid campaign integration source: %q", req.Source)
	}
	row := db.conn.QueryRowContext(ctx, `
		INSERT INTO campaign_integrations (campaign_id, external_id, source, metadata, settings)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING `+campaignIntegrationColumns,
		req.CampaignID, req.ExternalID, req.Source, req.Metadata, req.Settings,
	)
	return scanCampaignIntegration(row)
}

func (db *DB) GetCampaignIntegration(ctx context.Context, campaignID string, source model.IntegrationSource) (*model.CampaignIntegration, error) {
	if !isValidIntegrationSource(source) {
		return nil, fmt.Errorf("invalid campaign integration source: %q", source)
	}
	row := db.conn.QueryRowContext(ctx, `
		SELECT `+campaignIntegrationColumns+` FROM campaign_integrations
		WHERE campaign_id = $1 AND source = $2
		LIMIT 1`, campaignID, source)
	return scanCampaignIntegration(row)
}

func (db *DB) GetCampaignIntegrationByExternalID(ctx context.Context, externalID string, source model.IntegrationSource) (*model.CampaignIntegration, error) {
	if !isValidIntegrationSource(source) {
		return nil, fmt.Errorf("invalid campaign integration source: %q", source)
	}
	row := db.conn.QueryRowContext(ctx, `
		SELECT `+campaignIntegrationColumns+` FROM campaign_integrations
		WHERE external_id = $1 AND source = $2
		LIMIT 1`, externalID, source)
	return scanCampaignIntegration(row)
}

func (db *DB) ListCampaignIntegrationsByCampaign(ctx context.Context, campaignID string) ([]*model.CampaignIntegration, error) {
	rows, err := db.conn.QueryContext(ctx, `SELECT `+campaignIntegrationColumns+` FROM campaign_integrations WHERE campaign_id = $1`, campaignID)
	if err != nil {
		return nil, fmt.Errorf("list campaign integrations: %w", err)
	}
	defer func() {
		if err := rows.Close(); err != nil {
			slog.Error("failed to close rows", "error", err)
		}
	}()

	var integrations []*model.CampaignIntegration
	for rows.Next() {
		integration, err := scanCampaignIntegration(rows)
		if err != nil {
			return nil, fmt.Errorf("scan campaign integration: %w", err)
		}
		integrations = append(integrations, integration)
	}
	return integrations, rows.Err()
}

func (db *DB) RemoveCampaignIntegration(ctx context.Context, campaignID string, source model.IntegrationSource) error {
	if !isValidIntegrationSource(source) {
		return fmt.Errorf("invalid campaign integration source: %q", source)
	}
	_, err := db.conn.ExecContext(ctx, `
		DELETE FROM campaign_integrations
		WHERE campaign_id = $1 AND source = $2`, campaignID, source)
	if err != nil {
		return fmt.Errorf("remove campaign integration: %w", err)
	}
	return nil
}

func (db *DB) ListDiscordIntegrationsWithReminders(ctx context.Context) ([]*model.CampaignIntegration, error) {
	rows, err := db.conn.QueryContext(ctx, `
		SELECT ` + campaignIntegrationColumns + ` FROM campaign_integrations
		WHERE source = 'DISCORD'
		  AND (settings->>'enableSessionReminders')::boolean = true`)
	if err != nil {
		return nil, fmt.Errorf("list discord integrations with reminders: %w", err)
	}
	defer func() {
		if err := rows.Close(); err != nil {
			slog.Error("failed to close rows", "error", err)
		}
	}()

	var integrations []*model.CampaignIntegration
	for rows.Next() {
		integration, err := scanCampaignIntegration(rows)
		if err != nil {
			return nil, fmt.Errorf("scan campaign integration: %w", err)
		}
		integrations = append(integrations, integration)
	}
	return integrations, rows.Err()
}

func (db *DB) UpdateCampaignIntegration(ctx context.Context, req *model.UpdateCampaignIntegrationRequest) (*model.CampaignIntegration, error) {
	if !isValidIntegrationSource(req.Source) {
		return nil, fmt.Errorf("invalid campaign integration source: %q", req.Source)
	}
	switch req.Source {
	case model.IntegrationSourceDiscord:
		if req.Discord == nil {
			return nil, fmt.Errorf("discord params required")
		}
		if req.Discord.DefaultChannel == nil {
			return nil, fmt.Errorf("default channel required")
		}
		defaultChannelJSON, err := json.Marshal(req.Discord.DefaultChannel)
		if err != nil {
			return nil, fmt.Errorf("marshal default channel: %w", err)
		}
		var recapChannelJSON interface{}
		if req.Discord.RecapChannel != nil {
			b, err := json.Marshal(req.Discord.RecapChannel)
			if err != nil {
				return nil, fmt.Errorf("marshal recap channel: %w", err)
			}
			recapChannelJSON = string(b)
		}
		var sessionReminderChannelJSON interface{}
		if req.Discord.SessionReminderChannel != nil {
			b, err := json.Marshal(req.Discord.SessionReminderChannel)
			if err != nil {
				return nil, fmt.Errorf("marshal session reminder channel: %w", err)
			}
			sessionReminderChannelJSON = string(b)
		}
		row := db.conn.QueryRowContext(ctx, `
			UPDATE campaign_integrations
			SET metadata = jsonb_build_object(
			        'serverName', metadata->>'serverName',
			        'source',     'DISCORD',
			        'defaultChannel', $1::jsonb
			    ),
			    settings = jsonb_build_object(
			        'enableSessionReminders',    $2::boolean,
			        'sessionCreateAnnouncements', $3::boolean,
			        'timezone',                  $4::text,
			        'source',                    'DISCORD',
			        'recapChannel',              $5::jsonb,
			        'sessionReminderChannel',    $6::jsonb
			    ),
			    updated_at = NOW()
			WHERE campaign_id = $7 AND source = $8
			RETURNING `+campaignIntegrationColumns,
			string(defaultChannelJSON),
			req.Discord.EnableSessionReminders,
			req.Discord.SessionCreateAnnouncements,
			req.Discord.Timezone,
			recapChannelJSON,
			sessionReminderChannelJSON,
			req.CampaignID,
			req.Source,
		)
		return scanCampaignIntegration(row)
	default:
		return nil, fmt.Errorf("unsupported integration source for update: %q", req.Source)
	}
}
