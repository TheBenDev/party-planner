package user

import (
	"context"
	"database/sql"
	"log/slog"

	model "github.com/BBruington/party-planner/api/internal/models"
	"github.com/BBruington/party-planner/api/internal/pg"
	"github.com/lib/pq"
)

// DB wraps a [sql.DB] connection for user queries.
type DB struct {
	conn pg.Querier
	raw  *sql.DB
}

// NewDB creates a new user DB wrapping the given connection.
func NewDB(conn *sql.DB) *DB {
	return &DB{conn: conn, raw: conn}
}

// ── User ───────────────────────────────────────────────────────────────────

const userColumns = `id, external_id, email, avatar, first_name, last_name, deleted_at, created_at, updated_at`

func scanUser(row interface{ Scan(...any) error }) (*model.User, error) {
	var u model.User
	err := row.Scan(
		&u.ID, &u.ExternalId, &u.Email, &u.Avatar, &u.FirstName, &u.LastName,
		&u.DeletedAt, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (db *DB) CreateUser(ctx context.Context, req *model.CreateUserRequest) (*model.User, error) {
	row := db.conn.QueryRowContext(ctx, `
		INSERT INTO users (external_id, email, avatar, first_name, last_name)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING `+userColumns,
		req.ExternalId, req.Email, req.Avatar, req.FirstName, req.LastName,
	)
	return scanUser(row)
}

func (db *DB) DeleteUser(ctx context.Context, externalID string) (*model.User, error) {
	row := db.conn.QueryRowContext(ctx, `
		UPDATE users SET deleted_at = NOW(), updated_at = NOW()
		WHERE external_id = $1 AND deleted_at IS NULL
		RETURNING `+userColumns, externalID)
	return scanUser(row)
}

func (db *DB) GetUserByClerkID(ctx context.Context, externalID string) (*model.User, error) {
	row := db.conn.QueryRowContext(ctx, `SELECT `+userColumns+` FROM users WHERE external_id = $1 AND deleted_at IS NULL LIMIT 1`, externalID)
	return scanUser(row)
}

func (db *DB) GetUserByEmail(ctx context.Context, email string) (*model.User, error) {
	row := db.conn.QueryRowContext(ctx, `SELECT `+userColumns+` FROM users WHERE email = $1 AND deleted_at IS NULL LIMIT 1`, email)
	return scanUser(row)
}

func (db *DB) GetUserByID(ctx context.Context, userID string) (*model.User, error) {
	row := db.conn.QueryRowContext(ctx, `SELECT `+userColumns+` FROM users WHERE id = $1 AND deleted_at IS NULL LIMIT 1`, userID)
	return scanUser(row)
}

func (db *DB) UpdateUserByClerkID(ctx context.Context, req *model.UpdateUserRequest) (*model.User, error) {
	row := db.conn.QueryRowContext(ctx, `
		UPDATE users SET avatar = $1, first_name = $2, last_name = $3, updated_at = NOW()
		WHERE external_id = $4 AND deleted_at IS NULL
		RETURNING `+userColumns,
		req.Avatar, req.FirstName, req.LastName, req.ExternalId,
	)
	return scanUser(row)
}

// ── Campaign (minimal for GetAuth) ─────────────────────────────────────────

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

func (db *DB) GetCampaign(ctx context.Context, id string) (*model.Campaign, error) {
	row := db.conn.QueryRowContext(ctx,
		`SELECT `+campaignColumns+` FROM campaigns WHERE id = $1 AND deleted_at IS NULL LIMIT 1`, id,
	)
	return scanCampaign(row)
}

// ── Member (campaign-scoped subset) ────────────────────────────────────────

const memberColumns = `campaign_id, user_id, role, created_at, updated_at`

func scanMember(row interface{ Scan(...any) error }) (*model.Member, error) {
	var m model.Member
	err := row.Scan(&m.CampaignID, &m.UserID, &m.Role, &m.CreatedAt, &m.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &m, nil
}

func (db *DB) GetCampaignUser(ctx context.Context, campaignID, userID string) (*model.Member, error) {
	row := db.conn.QueryRowContext(ctx,
		`SELECT `+memberColumns+` FROM campaign_users WHERE campaign_id = $1 AND user_id = $2 LIMIT 1`,
		campaignID, userID,
	)
	return scanMember(row)
}

func scanMemberWithUser(row interface{ Scan(...any) error }) (*model.MemberWithUser, error) {
	var m model.MemberWithUser
	err := row.Scan(
		&m.CampaignID, &m.UserID, &m.Role, &m.CreatedAt, &m.UpdatedAt,
		&m.Email, &m.FirstName, &m.LastName,
	)
	if err != nil {
		return nil, err
	}
	return &m, nil
}

func (db *DB) ListCampaignUsersByUser(ctx context.Context, userID string) ([]*model.MemberWithUser, error) {
	rows, err := db.conn.QueryContext(ctx, `
		SELECT cu.campaign_id, cu.user_id, cu.role, cu.created_at, cu.updated_at,
		       u.email, u.first_name, u.last_name
		FROM campaign_users cu
		INNER JOIN users u ON cu.user_id = u.id
		WHERE cu.user_id = $1`, userID)
	if err != nil {
		return nil, err
	}
	defer func() {
		if err := rows.Close(); err != nil {
			slog.Error("failed to close rows", "error", err)
		}
	}()

	var members []*model.MemberWithUser
	for rows.Next() {
		member, err := scanMemberWithUser(rows)
		if err != nil {
			return nil, err
		}
		members = append(members, member)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return members, nil
}
