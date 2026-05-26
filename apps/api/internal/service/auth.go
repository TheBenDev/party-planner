package service

import (
	"database/sql"
	"errors"
	"fmt"

	"github.com/BBruington/party-planner/api/internal/db"
	model "github.com/BBruington/party-planner/api/internal/models"
)

var ErrNotAuthorized = errors.New("not authorized")

func authorizeCampaignRole(d *db.DB, campaignID, userID string, required model.MemberRole) error {
	member, err := d.GetCampaignUser(campaignID, userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotAuthorized
		}
		return fmt.Errorf("authorize campaign role lookup failed: %w", err)
	}
	if member.Role != required {
		return ErrNotAuthorized
	}
	return nil
}
