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
	ErrCampaignIntegrationInvalidCampaign = errors.New("campaign does not exist")
	ErrCampaignIntegrationNotFound        = errors.New("campaign integration not found")
	ErrCampaignIntegrationAlreadyExists   = errors.New("campaign integration already exists")
)

type CampaignIntegrationService struct {
	DB  *db.DB
	Log *slog.Logger
}

func (s *CampaignIntegrationService) GetByCampaign(campaignId string, source model.IntegrationSource) (*model.CampaignIntegration, error) {
	integration, err := s.DB.GetCampaignIntegration(campaignId, source)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get campaign error: %w", err)
	}

	return integration, nil
}

func (s *CampaignIntegrationService) Create(integration *model.CreateCampaignIntegrationRequest) (*model.CampaignIntegration, error) {
	created, err := s.DB.CreateCampaignIntegration(integration)

	if err != nil {
		if mapped := mapCampaignIntegrationPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("create campaign integration error: %w", err)
	}

	return created, nil
}

func (s *CampaignIntegrationService) ListByCampaign(campaignId string) ([]*model.CampaignIntegration, error) {
	integrations, err := s.DB.ListCampaignIntegrationsByCampaign(campaignId)
	if err != nil {
		return nil, fmt.Errorf("list campaign integrations error: %w", err)
	}
	return integrations, nil
}

func (s *CampaignIntegrationService) Remove(campaignId string, source model.IntegrationSource) error {
	err := s.DB.RemoveCampaignIntegration(campaignId, source)
	if err != nil {
		return fmt.Errorf("remove campaign integration error: %w", err)
	}
	return nil
}

func mapCampaignIntegrationPgError(err error) error {
	if isPgError(err, pgErrUniqueViolation) {
		return ErrCampaignIntegrationAlreadyExists
	}
	if isPgError(err, pgErrForeignKeyViolation) {
		switch pgConstraint(err) {
		case "fk_integration_campaign_id":
			return ErrCampaignIntegrationInvalidCampaign
		}
	}
	return err
}
