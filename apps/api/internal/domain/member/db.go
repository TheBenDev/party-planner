package member

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"strings"

	model "github.com/BBruington/party-planner/api/internal/models"
	"github.com/BBruington/party-planner/api/internal/pg"
)

// DB wraps a [sql.DB] connection for member queries.
type DB struct {
	conn pg.Querier
	raw  *sql.DB
}

// NewDB creates a new member DB wrapping the given connection.
func NewDB(conn *sql.DB) *DB {
	return &DB{conn: conn, raw: conn}
}

// RunInTx executes fn inside a database transaction, rolling back on error.
func (db *DB) RunInTx(ctx context.Context, fn func(context.Context, Store) error) error {
	tx, err := db.raw.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	txDB := &DB{conn: tx, raw: db.raw}
	if err := fn(ctx, txDB); err != nil {
		_ = tx.Rollback()
		return err
	}
	return tx.Commit()
}

// ── Member ───────────────────────────────────────────────────────────────────

const memberColumns = `campaign_id, user_id, role, created_at, updated_at`

func scanMember(row interface{ Scan(...any) error }) (*model.Member, error) {
	var m model.Member
	err := row.Scan(&m.CampaignID, &m.UserID, &m.Role, &m.CreatedAt, &m.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &m, nil
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

func (db *DB) ListCampaignUsersByCampaign(ctx context.Context, campaignID string) ([]*model.MemberWithUser, error) {
	rows, err := db.conn.QueryContext(ctx, `
		SELECT cu.campaign_id, cu.user_id, cu.role, cu.created_at, cu.updated_at,
		       u.email, u.first_name, u.last_name
		FROM campaign_users cu
		INNER JOIN users u ON cu.user_id = u.id
		WHERE cu.campaign_id = $1`, campaignID)
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

func (db *DB) RemoveCampaignUser(ctx context.Context, campaignID, userID string) error {
	_, err := db.conn.ExecContext(ctx, `DELETE FROM campaign_users WHERE campaign_id = $1 AND user_id = $2`, campaignID, userID)
	if err != nil {
		return fmt.Errorf("remove campaign user: %w", err)
	}
	return nil
}

func (db *DB) UpdateCampaignUserRole(ctx context.Context, campaignID, userID string, role model.MemberRole) (*model.Member, error) {
	row := db.conn.QueryRowContext(ctx, `
		UPDATE campaign_users SET role = $1, updated_at = NOW()
		WHERE campaign_id = $2 AND user_id = $3
		RETURNING `+memberColumns,
		role, campaignID, userID,
	)
	return scanMember(row)
}

// ── Campaign Invitation ──────────────────────────────────────────────────────

const invitationColumns = `campaign_invitation_id, campaign_id, inviter_id, invitee_email, role, status, accepted_at, expires_at, created_at, updated_at`

const invitationByTokenColumns = `ci.campaign_invitation_id, ci.campaign_id, ci.inviter_id, ci.invitee_email, ci.role, ci.status, ci.accepted_at, ci.expires_at, ci.created_at, ci.updated_at, u.first_name, u.last_name, c.title`

func scanCampaignInvitation(row interface{ Scan(...any) error }) (*model.CampaignInvitation, error) {
	var inv model.CampaignInvitation
	err := row.Scan(
		&inv.ID, &inv.CampaignID, &inv.InviterID, &inv.InviteeEmail, &inv.Role, &inv.Status,
		&inv.AcceptedAt, &inv.ExpiresAt, &inv.CreatedAt, &inv.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &inv, nil
}

func scanCampaignInvitationByToken(row interface{ Scan(...any) error }) (*model.GetCampaignInvitationResponse, error) {
	var res model.GetCampaignInvitationResponse
	var firstName, lastName sql.NullString
	var campaignTitle string
	inv := &model.CampaignInvitation{}
	err := row.Scan(
		&inv.ID, &inv.CampaignID, &inv.InviterID, &inv.InviteeEmail, &inv.Role, &inv.Status,
		&inv.AcceptedAt, &inv.ExpiresAt, &inv.CreatedAt, &inv.UpdatedAt,
		&firstName, &lastName, &campaignTitle,
	)
	if err != nil {
		return nil, err
	}
	parts := make([]string, 0, 2)
	if firstName.Valid && firstName.String != "" {
		parts = append(parts, firstName.String)
	}
	if lastName.Valid && lastName.String != "" {
		parts = append(parts, lastName.String)
	}
	res.Invitation = inv
	if len(parts) > 0 {
		from := strings.Join(parts, " ")
		res.From = &from
	}
	res.CampaignTitle = campaignTitle
	return &res, nil
}

func (db *DB) CreateCampaignInvitation(ctx context.Context, req *model.CreateCampaignInvitationRequest) (*model.CampaignInvitation, error) {
	row := db.conn.QueryRowContext(ctx, `
		INSERT INTO campaign_invitations (campaign_id, inviter_id, invitee_email, role, status, expires_at, token)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING `+invitationColumns,
		req.CampaignID, req.InviterID, req.InviteeEmail, req.Role,
		model.InvitationStatusPending, req.ExpiresAt, req.Token,
	)
	return scanCampaignInvitation(row)
}

func (db *DB) GetCampaignInvitationByEmail(ctx context.Context, campaignID, inviteeEmail string, status model.InvitationStatus) (*model.CampaignInvitation, error) {
	row := db.conn.QueryRowContext(ctx,
		`SELECT `+invitationColumns+` FROM campaign_invitations WHERE campaign_id = $1 AND invitee_email = $2 AND status = $3 LIMIT 1`,
		campaignID, inviteeEmail, status,
	)
	return scanCampaignInvitation(row)
}

func (db *DB) GetCampaignInvitationByToken(ctx context.Context, token string) (*model.GetCampaignInvitationResponse, error) {
	row := db.conn.QueryRowContext(ctx, `
		SELECT `+invitationByTokenColumns+`
		FROM campaign_invitations ci
		JOIN users u ON u.id = ci.inviter_id
		JOIN campaigns c ON c.id = ci.campaign_id
		WHERE ci.token = $1
		  AND ci.status = $2
		  AND ci.expires_at > NOW()
		LIMIT 1`, token, model.InvitationStatusPending)
	return scanCampaignInvitationByToken(row)
}

func (db *DB) ListCampaignInvitations(ctx context.Context, campaignID string) ([]*model.CampaignInvitation, error) {
	rows, err := db.conn.QueryContext(ctx, `
		SELECT `+invitationColumns+` FROM campaign_invitations
		WHERE campaign_id = $1 AND status = $2`, campaignID, model.InvitationStatusPending)
	if err != nil {
		return nil, fmt.Errorf("list campaign invitations: %w", err)
	}
	defer func() {
		if err := rows.Close(); err != nil {
			slog.Error("failed to close rows", "error", err)
		}
	}()

	var invitations []*model.CampaignInvitation
	for rows.Next() {
		invitation, err := scanCampaignInvitation(rows)
		if err != nil {
			return nil, fmt.Errorf("scan campaign invitation: %w", err)
		}
		invitations = append(invitations, invitation)
	}
	return invitations, rows.Err()
}

func (db *DB) AcceptCampaignInvitation(ctx context.Context, token string, role model.MemberRole) (*model.CampaignInvitation, error) {
	row := db.conn.QueryRowContext(ctx, `
		UPDATE campaign_invitations
		SET status = $1, accepted_at = NOW(), role = $2, updated_at = NOW()
		WHERE token = $3 AND status = $4 AND expires_at > NOW()
		RETURNING `+invitationColumns,
		model.InvitationStatusAccepted, role, token, model.InvitationStatusPending,
	)
	return scanCampaignInvitation(row)
}

func (db *DB) DeclineCampaignInvitation(ctx context.Context, token string) (*model.CampaignInvitation, error) {
	row := db.conn.QueryRowContext(ctx, `
		UPDATE campaign_invitations
		SET status = $1, updated_at = NOW()
		WHERE token = $2 AND status = $3 AND expires_at > NOW()
		RETURNING `+invitationColumns,
		model.InvitationStatusDeclined, token, model.InvitationStatusPending,
	)
	return scanCampaignInvitation(row)
}

func (db *DB) RevokeCampaignInvitation(ctx context.Context, invitationID, campaignID string) (*model.CampaignInvitation, error) {
	row := db.conn.QueryRowContext(ctx, `
		UPDATE campaign_invitations
		SET status = $1, updated_at = NOW()
		WHERE campaign_invitation_id = $2 AND status = $3 AND campaign_id = $4
		RETURNING `+invitationColumns,
		model.InvitationStatusRevoked, invitationID, model.InvitationStatusPending, campaignID,
	)
	return scanCampaignInvitation(row)
}

// ── User ─────────────────────────────────────────────────────────────────────

const userColumns = `id, email`

func scanUser(row interface{ Scan(...any) error }) (*model.User, error) {
	var u model.User
	err := row.Scan(&u.ID, &u.Email)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (db *DB) GetUserByEmail(ctx context.Context, email string) (*model.User, error) {
	row := db.conn.QueryRowContext(ctx, `SELECT `+userColumns+` FROM users WHERE email = $1 AND deleted_at IS NULL LIMIT 1`, email)
	return scanUser(row)
}
