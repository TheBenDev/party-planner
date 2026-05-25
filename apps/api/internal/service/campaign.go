package service

import (
	"database/sql"
	"errors"
	"fmt"
	"log/slog"

	"github.com/BBruington/party-planner/api/internal/db"
	model "github.com/BBruington/party-planner/api/internal/models"
)

var (
	ErrCampaignNotFound      = errors.New("campaign not found")
	ErrCampaignAlreadyExists = errors.New("campaign already exists")
	ErrCampaignInvalidUser   = errors.New("user does not exist")
)

type CampaignService struct {
	DB  *db.DB
	Log *slog.Logger
}

func (s *CampaignService) Create(campaign *model.CreateCampaignRequest) (*model.Campaign, error) {
	var c *model.Campaign
	err := s.DB.RunInTx(func(tx *db.DB) error {
		var err error
		c, err = tx.CreateCampaign(campaign)
		if err != nil {
			if mapped := mapCampaignPgError(err); mapped != err {
				return mapped
			}
			return fmt.Errorf("create campaign error: %w", err)
		}
		_, err = tx.CreateCampaignUser(&model.CreateMemberRequest{
			CampaignID: c.ID,
			Role:       model.MemberRoleDungeonMaster,
			UserID:     c.UserID,
		})
		if err != nil {
			if mapped := mapCampaignUserPgError(err); mapped != err {
				return mapped
			}
			return fmt.Errorf("create campaign user error: %w", err)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return c, nil
}

func (s *CampaignService) GetById(id string) (*model.Campaign, error) {
	campaign, err := s.DB.GetCampaign(id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrCampaignNotFound
		}
		return nil, fmt.Errorf("get campaign error: %w", err)
	}

	return campaign, nil
}

func (s *CampaignService) Update(userID string, req *model.UpdateCampaignRequest) (*model.Campaign, error) {
	if err := authorizeCampaignRole(s.DB, req.ID, userID, model.MemberRoleDungeonMaster); err != nil {
		return nil, err
	}
	campaign, err := s.DB.UpdateCampaign(req)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrCampaignNotFound
		}
		return nil, fmt.Errorf("update campaign error: %w", err)
	}
	return campaign, nil
}

func (s *CampaignService) Delete(userID, id string) (*model.Campaign, error) {
	if err := authorizeCampaignRole(s.DB, id, userID, model.MemberRoleDungeonMaster); err != nil {
		return nil, err
	}
	campaign, err := s.DB.DeleteCampaign(id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrCampaignNotFound
		}
		return nil, fmt.Errorf("delete campaign error: %w", err)
	}
	return campaign, nil
}

func mapCampaignPgError(err error) error {
	if isPgError(err, pgErrUniqueViolation) {
		return ErrCampaignAlreadyExists
	}
	if isPgError(err, pgErrForeignKeyViolation) {
		switch pgConstraint(err) {
		case "fk_campaign_user_id":
			return ErrCampaignInvalidUser
		}
	}

	return err
}
