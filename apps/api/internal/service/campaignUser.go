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
	ErrCampaignUserInvalidCampaign = errors.New("campaign does not exist")
	ErrCampaignUserInvalidUser     = errors.New("user does not exist")
	ErrCampaignUserNotFound        = errors.New("campaign user not found")
	ErrCampaignUserAlreadyExists   = errors.New("campaign user already exists")
)

type CampaignUserService struct {
	DB  *db.DB
	Log *slog.Logger
}

func (s *CampaignUserService) Create(campaignUser *model.CreateCampaignUserRequest) (*model.CampaignUser, error) {
	created, err := s.DB.CreateCampaignUser(campaignUser)
	if err != nil {
		if mapped := mapCampaignUserPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("create campaign user error: %w", err)
	}
	return created, nil
}

func (s *CampaignUserService) Get(campaignId, userId string) (*model.CampaignUser, error) {
	campaignUser, err := s.DB.GetCampaignUser(campaignId, userId)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrCampaignUserNotFound
		}
		return nil, fmt.Errorf("get campaign user error: %w", err)
	}

	return campaignUser, nil
}

func (s *CampaignUserService) UpdateRole(campaignId, userId string, role model.CampaignUserRole) (*model.CampaignUser, error) {
	campaignUser, err := s.DB.UpdateCampaignUserRole(campaignId, userId, role)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrCampaignUserNotFound
		}
		if mapped := mapCampaignUserPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("update campaign user role error: %w", err)
	}
	return campaignUser, nil
}

func (s *CampaignUserService) Remove(campaignId, userId string) error {
	err := s.DB.RemoveCampaignUser(campaignId, userId)
	if err != nil {
		if mapped := mapCampaignUserPgError(err); mapped != err {
			return mapped
		}
		return fmt.Errorf("remove campaign user error: %w", err)
	}
	return nil
}

func mapCampaignUserPgError(err error) error {
	if isPgError(err, pgErrUniqueViolation) {
		return ErrCampaignUserAlreadyExists
	}
	if isPgError(err, pgErrForeignKeyViolation) {
		switch pgConstraint(err) {
		case "fk_campaign_user_campaign_id":
			return ErrCampaignUserInvalidCampaign
		case "fk_campaign_user_user_id":
			return ErrCampaignUserInvalidUser
		}
	}
	return err
}
