package db

import (
	"fmt"
	"log/slog"

	model "github.com/BBruington/party-planner/api/internal/models"
)

const campaignUserColumns = `campaign_id, created_at, role, updated_at, user_id`

func scanCampaignUser(row interface{ Scan(...any) error }) (*model.Member, error) {
	var ci model.Member
	err := row.Scan(
		&ci.CampaignID, &ci.CreatedAt, &ci.Role, &ci.UpdatedAt, &ci.UserID,
	)
	if err != nil {
		return nil, err
	}
	return &ci, nil
}

func (db *DB) CreateCampaignUser(campaignUser *model.CreateMemberRequest) (*model.Member, error) {
	row := db.conn.QueryRow(`
		INSERT INTO campaign_users (campaign_id, user_id, role)
		VALUES ($1, $2, $3)
		RETURNING `+campaignUserColumns,
		campaignUser.CampaignID, campaignUser.UserID, campaignUser.Role,
	)
	return scanCampaignUser(row)
}

func (db *DB) GetCampaignUser(campaignId, userId string) (*model.Member, error) {
	row := db.conn.QueryRow(`
		SELECT `+campaignUserColumns+` FROM campaign_users
		WHERE campaign_id = $1 AND user_id = $2
		LIMIT 1`, campaignId, userId)
	return scanCampaignUser(row)
}

func scanMemberWithUser(row interface{ Scan(...any) error }) (*model.MemberWithUser, error) {
	var m model.MemberWithUser
	err := row.Scan(
		&m.CampaignID, &m.CreatedAt, &m.Role, &m.UpdatedAt, &m.UserID,
		&m.Email, &m.FirstName, &m.LastName,
	)
	if err != nil {
		return nil, err
	}
	return &m, nil
}

func (db *DB) ListCampaignUsersByCampaign(campaignId string) ([]*model.MemberWithUser, error) {
	rows, err := db.conn.Query(`
		SELECT cu.campaign_id, cu.created_at, cu.role, cu.updated_at, cu.user_id,
		       u.email, u.first_name, u.last_name
		FROM campaign_users cu
		INNER JOIN users u ON cu.user_id = u.id
		WHERE cu.campaign_id = $1`, campaignId)
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

func (db *DB) ListCampaignUsersByUser(userId string) ([]*model.MemberWithUser, error) {
	rows, err := db.conn.Query(`
		SELECT cu.campaign_id, cu.created_at, cu.role, cu.updated_at, cu.user_id,
		       u.email, u.first_name, u.last_name
		FROM campaign_users cu
		INNER JOIN users u ON cu.user_id = u.id
		WHERE cu.user_id = $1`, userId)
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

func (db *DB) RemoveCampaignUser(campaignId, userId string) error {
	_, err := db.conn.Exec(`DELETE FROM campaign_users WHERE campaign_id = $1 AND user_id = $2`, campaignId, userId)
	if err != nil {
		return fmt.Errorf("remove campaign user: %w", err)
	}
	return nil
}

func (db *DB) UpdateCampaignUserRole(campaignId, userId string, role model.MemberRole) (*model.Member, error) {
	row := db.conn.QueryRow(`
		UPDATE campaign_users SET role = $1, updated_at = NOW()
		WHERE campaign_id = $2 AND user_id = $3
		RETURNING `+campaignUserColumns,
		role, campaignId, userId,
	)
	return scanCampaignUser(row)
}
