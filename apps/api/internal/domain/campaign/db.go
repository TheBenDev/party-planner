package campaign

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"

	model "github.com/BBruington/party-planner/api/internal/models"
	"github.com/BBruington/party-planner/api/internal/pg"
	"github.com/lib/pq"
)

// DB wraps a [sql.DB] connection for campaign queries.
type DB struct {
	conn pg.Querier
	raw  *sql.DB
}

// NewDB creates a new campaign DB wrapping the given connection.
func NewDB(conn *sql.DB) *DB {
	return &DB{conn: conn, raw: conn}
}

// RunInTx executes fn inside a database transaction, rolling back on error.
func (db *DB) RunInTx(ctx context.Context, fn func(context.Context, Store) error) error {
	tx, err := db.raw.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() {
		if err := tx.Rollback(); err != nil && !errors.Is(err, sql.ErrTxDone) {
			slog.Error("failed to rollback transaction", "error", err)
		}
	}()
	txDB := &DB{conn: tx, raw: db.raw}
	if err := fn(ctx, txDB); err != nil {
		return err
	}
	return tx.Commit()
}

// ── Campaign ──────────────────────────────────────────────────────────────────

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

func (db *DB) CreateCampaign(ctx context.Context, req *model.CreateCampaignRequest) (*model.Campaign, error) {
	row := db.conn.QueryRowContext(ctx, `
		INSERT INTO campaigns (user_id, title, description, tags)
		VALUES ($1, $2, $3, $4)
		RETURNING `+campaignColumns,
		req.UserID, req.Title, req.Description, req.Tags,
	)
	return scanCampaign(row)
}

func (db *DB) GetCampaign(ctx context.Context, id string) (*model.CampaignAuth, error) {
	var campaign model.Campaign
	var colonyID sql.NullString
	row := db.conn.QueryRowContext(ctx, `
		SELECT c.id, c.user_id, c.title, c.description, c.tags, c.created_at, c.updated_at, c.deleted_at,
		       (SELECT id FROM colony WHERE campaign_id = c.id ORDER BY created_at LIMIT 1)
		FROM campaigns c
		WHERE c.id = $1 AND c.deleted_at IS NULL`, id,
	)
	err := row.Scan(
		&campaign.ID, &campaign.UserID, &campaign.Title, &campaign.Description, pq.Array(&campaign.Tags),
		&campaign.CreatedAt, &campaign.UpdatedAt, &campaign.DeletedAt,
		&colonyID,
	)
	if err != nil {
		return nil, err
	}
	auth := &model.CampaignAuth{Campaign: &campaign}
	if colonyID.Valid {
		auth.ColonyID = &colonyID.String
	}
	return auth, nil
}

func (db *DB) UpdateCampaign(ctx context.Context, req *model.UpdateCampaignRequest) (*model.Campaign, error) {
	tags := req.Tags
	if tags == nil {
		tags = []string{}
	}
	row := db.conn.QueryRowContext(ctx, `
		UPDATE campaigns SET
			title       = COALESCE($1, title),
			description = COALESCE($2, description),
			tags        = COALESCE($3, tags),
			updated_at  = NOW()
		WHERE id = $4 AND deleted_at IS NULL
		RETURNING `+campaignColumns,
		req.Title, req.Description, pq.StringArray(tags), req.ID,
	)
	return scanCampaign(row)
}

func (db *DB) DeleteCampaign(ctx context.Context, id string) (*model.Campaign, error) {
	row := db.conn.QueryRowContext(ctx, `
		UPDATE campaigns SET deleted_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL
		RETURNING `+campaignColumns, id,
	)
	return scanCampaign(row)
}

// ── Member (campaign-scoped subset) ──────────────────────────────────────────

const memberColumns = `campaign_id, created_at, role, updated_at, user_id`

func scanMember(row interface{ Scan(...any) error }) (*model.Member, error) {
	var m model.Member
	err := row.Scan(&m.CampaignID, &m.CreatedAt, &m.Role, &m.UpdatedAt, &m.UserID)
	if err != nil {
		return nil, err
	}
	return &m, nil
}

func (db *DB) CreateCampaignUser(ctx context.Context, req *model.CreateMemberRequest) (*model.Member, error) {
	row := db.conn.QueryRowContext(ctx, `
		INSERT INTO campaign_users (campaign_id, user_id, role)
		VALUES ($1, $2, $3)
		RETURNING `+memberColumns,
		req.CampaignID, req.UserID, req.Role,
	)
	return scanMember(row)
}

func (db *DB) GetCampaignUser(ctx context.Context, campaignID, userID string) (*model.Member, error) {
	row := db.conn.QueryRowContext(ctx,
		`SELECT `+memberColumns+` FROM campaign_users WHERE campaign_id = $1 AND user_id = $2 LIMIT 1`,
		campaignID, userID,
	)
	return scanMember(row)
}
