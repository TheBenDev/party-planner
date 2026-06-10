package service

import (
	"database/sql"
	"errors"
	"fmt"

	"github.com/BBruington/party-planner/api/internal/db"
	model "github.com/BBruington/party-planner/api/internal/models"
)

var ErrUserIntegrationNotFound = errors.New("user integration not found")

type UserIntegrationService struct {
	DB *db.DB
}

func (s *UserIntegrationService) Upsert(req *model.UpsertUserIntegrationRequest) (*model.UserIntegration, error) {
	result, err := s.DB.UpsertUserIntegration(req)
	if err != nil {
		return nil, fmt.Errorf("upsert user integration: %w", err)
	}
	return result, nil
}

func (s *UserIntegrationService) Delete(userID string, source model.IntegrationSource) error {
	if err := s.DB.DeleteUserIntegration(userID, source); err != nil {
		return fmt.Errorf("delete user integration: %w", err)
	}
	return nil
}

func (s *UserIntegrationService) Get(userID string, source model.IntegrationSource) (*model.UserIntegration, error) {
	result, err := s.DB.GetUserIntegration(userID, source)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get user integration: %w", err)
	}
	return result, nil
}

func (s *UserIntegrationService) ListByCampaign(campaignID string, source model.IntegrationSource) ([]*model.CampaignMemberIntegration, error) {
	results, err := s.DB.ListUserIntegrationsByCampaign(campaignID, source)
	if err != nil {
		return nil, fmt.Errorf("list user integrations by campaign: %w", err)
	}
	return results, nil
}
