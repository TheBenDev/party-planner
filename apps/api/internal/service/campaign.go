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
	created, err := s.DB.CreateCampaign(campaign)
	if err != nil {
		if mapped := mapCampaignPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("create campaign error: %w", err)
	}
	return created, nil
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
