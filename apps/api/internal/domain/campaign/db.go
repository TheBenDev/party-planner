package campaign

import (
	"database/sql"
	"fmt"

	"github.com/lib/pq"
	model "github.com/BBruington/party-planner/api/internal/models"
)

type querier interface {
	Exec(query string, args ...any) (sql.Result, error)
	QueryRow(query string, args ...any) *sql.Row
	Query(query string, args ...any) (*sql.Rows, error)
}

// DB wraps a [sql.DB] connection for campaign queries.
type DB struct {
	conn querier
	raw  *sql.DB
}

// NewDB creates a new campaign DB wrapping the given connection.
func NewDB(conn *sql.DB) *DB {
	return &DB{conn: conn, raw: conn}
}

// RunInTx executes fn inside a database transaction, rolling back on error.
func (db *DB) RunInTx(fn func(Store) error) error {
	tx, err := db.raw.Begin()
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	txDB := &DB{conn: tx, raw: db.raw}
	if err := fn(txDB); err != nil {
		_ = tx.Rollback()
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

func (db *DB) CreateCampaign(req *model.CreateCampaignRequest) (*model.Campaign, error) {
	row := db.conn.QueryRow(`
		INSERT INTO campaigns (user_id, title, description, tags)
		VALUES ($1, $2, $3, $4)
		RETURNING `+campaignColumns,
		req.UserID, req.Title, req.Description, req.Tags,
	)
	return scanCampaign(row)
}

func (db *DB) GetCampaign(id string) (*model.Campaign, error) {
	row := db.conn.QueryRow(
		`SELECT `+campaignColumns+` FROM campaigns WHERE id = $1 AND deleted_at IS NULL LIMIT 1`, id,
	)
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

func (db *DB) CreateCampaignUser(req *model.CreateMemberRequest) (*model.Member, error) {
	row := db.conn.QueryRow(`
		INSERT INTO campaign_users (campaign_id, user_id, role)
		VALUES ($1, $2, $3)
		RETURNING `+memberColumns,
		req.CampaignID, req.UserID, req.Role,
	)
	return scanMember(row)
}

func (db *DB) GetCampaignUser(campaignID, userID string) (*model.Member, error) {
	row := db.conn.QueryRow(
		`SELECT `+memberColumns+` FROM campaign_users WHERE campaign_id = $1 AND user_id = $2 LIMIT 1`,
		campaignID, userID,
	)
	return scanMember(row)
}
