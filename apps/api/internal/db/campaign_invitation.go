package db

import (
	"database/sql"
	"fmt"
	"log/slog"
	"strings"

	model "github.com/BBruington/party-planner/api/internal/models"
)

const campaignInvitationColumns = `campaign_invitation_id, campaign_id, inviter_id, invitee_email, role, status, accepted_at, expires_at, created_at, updated_at`

const campaignInvitationByTokenColumns = `ci.campaign_invitation_id, ci.campaign_id, ci.inviter_id, ci.invitee_email, ci.role, ci.status, ci.accepted_at, ci.expires_at, ci.created_at, ci.updated_at, u.first_name, u.last_name, c.title`

func scanCampaignInvitation(row interface{ Scan(...any) error }) (*model.CampaignInvitation, error) {
	var ci model.CampaignInvitation
	err := row.Scan(
		&ci.ID, &ci.CampaignID, &ci.InviterID, &ci.InviteeEmail, &ci.Role, &ci.Status,
		&ci.AcceptedAt, &ci.ExpiresAt, &ci.CreatedAt, &ci.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &ci, nil
}

func scanCampaignInvitationByToken(row interface{ Scan(...any) error }) (*model.GetCampaignInvitationResponse, error) {
	var res model.GetCampaignInvitationResponse
	var firstName, lastName sql.NullString
	var campaignTitle string
	ci := &model.CampaignInvitation{}
	err := row.Scan(
		&ci.ID, &ci.CampaignID, &ci.InviterID, &ci.InviteeEmail, &ci.Role, &ci.Status,
		&ci.AcceptedAt, &ci.ExpiresAt, &ci.CreatedAt, &ci.UpdatedAt,
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
	res.Invitation = ci
	if len(parts) > 0 {
		from := strings.Join(parts, " ")
		res.From = &from
	}
	res.CampaignTitle = campaignTitle
	return &res, nil
}

func (db *DB) AcceptCampaignInvitation(token string, role model.MemberRole) (*model.CampaignInvitation, error) {
	row := db.conn.QueryRow(`
		UPDATE campaign_invitations
		SET status = $1, accepted_at = NOW(), role = $2, updated_at = NOW()
		WHERE token = $3 AND status = $4 AND expires_at > NOW()
		RETURNING `+campaignInvitationColumns,
		model.InvitationStatusAccepted, role, token, model.InvitationStatusPending,
	)
	return scanCampaignInvitation(row)
}

func (db *DB) CreateCampaignInvitation(invitation *model.CreateCampaignInvitationRequest) (*model.CampaignInvitation, error) {
	row := db.conn.QueryRow(`
		INSERT INTO campaign_invitations (campaign_id, inviter_id, invitee_email, role, status, expires_at, token)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING `+campaignInvitationColumns,
		invitation.CampaignID, invitation.InviterID, invitation.InviteeEmail, invitation.Role,
		model.InvitationStatusPending, invitation.ExpiresAt, invitation.Token,
	)
	return scanCampaignInvitation(row)
}

func (db *DB) DeclineCampaignInvitation(token string) (*model.CampaignInvitation, error) {
	row := db.conn.QueryRow(`
		UPDATE campaign_invitations
		SET status = $1, updated_at = NOW()
		WHERE token = $2 AND status = $3 AND expires_at > NOW()
		RETURNING `+campaignInvitationColumns,
		model.InvitationStatusDeclined, token, model.InvitationStatusPending,
	)
	return scanCampaignInvitation(row)
}

func (db *DB) GetCampaignInvitationByEmail(campaignId, invitee_email string, status model.InvitationStatus) (*model.CampaignInvitation, error) {
	row := db.conn.QueryRow(`
		SELECT `+campaignInvitationColumns+` FROM campaign_invitations
		WHERE campaign_id = $1 AND invitee_email = $2 AND status = $3
		LIMIT 1`, campaignId, invitee_email, status)
	return scanCampaignInvitation(row)
}

func (db *DB) GetCampaignInvitationByToken(token string) (*model.GetCampaignInvitationResponse, error) {
	row := db.conn.QueryRow(`
		SELECT `+campaignInvitationByTokenColumns+`
		FROM campaign_invitations ci
		JOIN users u ON u.id = ci.inviter_id
		JOIN campaigns c ON c.id = ci.campaign_id
		WHERE ci.token = $1
		  AND ci.status = $2
		  AND ci.expires_at > NOW()
		LIMIT 1`, token, model.InvitationStatusPending)
	return scanCampaignInvitationByToken(row)
}

func (db *DB) ListCampaignInvitations(campaignId string) ([]*model.CampaignInvitation, error) {
	rows, err := db.conn.Query(`
		SELECT `+campaignInvitationColumns+` FROM campaign_invitations
		WHERE campaign_id = $1 AND status = $2`, campaignId, model.InvitationStatusPending)
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

func (db *DB) RevokeCampaignInvitation(invitationId, campaignId string) (*model.CampaignInvitation, error) {
	row := db.conn.QueryRow(`
		UPDATE campaign_invitations
		SET status = $1, updated_at = NOW()
		WHERE campaign_invitation_id = $2 AND status = $3 AND campaign_id = $4
		RETURNING `+campaignInvitationColumns,
		model.InvitationStatusRevoked, invitationId, model.InvitationStatusPending, campaignId,
	)
	return scanCampaignInvitation(row)
}
