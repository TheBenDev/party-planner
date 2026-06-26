package campaign

import (
	"database/sql"
	"errors"
	"fmt"
	"log/slog"

	model "github.com/BBruington/party-planner/api/internal/models"
	"github.com/BBruington/party-planner/api/internal/pg"
)

// Domain errors.
var (
	ErrNotFound      = errors.New("campaign not found")
	ErrAlreadyExists = errors.New("campaign already exists")
	ErrInvalidUser   = errors.New("user does not exist")
	ErrNotAuthorized = errors.New("not authorized")
)

type Store interface {
	CreateCampaign(req *model.CreateCampaignRequest) (*model.Campaign, error)
	GetCampaign(id string) (*model.Campaign, error)
	UpdateCampaign(req *model.UpdateCampaignRequest) (*model.Campaign, error)
	DeleteCampaign(id string) (*model.Campaign, error)
	CreateCampaignUser(req *model.CreateMemberRequest) (*model.Member, error)
	GetCampaignUser(campaignID, userID string) (*model.Member, error)
	RunInTx(fn func(Store) error) error
}

type Service struct {
	DB  Store
	Log *slog.Logger
}

func (s *Service) Create(req *model.CreateCampaignRequest) (*model.Campaign, error) {
	var campaign *model.Campaign
	err := s.DB.RunInTx(func(tx Store) error {
		var err error
		campaign, err = tx.CreateCampaign(req)
		if err != nil {
			if mapped := mapPgError(err); mapped != err {
				return mapped
			}
			return fmt.Errorf("create campaign: %w", err)
		}
		_, err = tx.CreateCampaignUser(&model.CreateMemberRequest{
			CampaignID: campaign.ID,
			Role:       model.MemberRoleDungeonMaster,
			UserID:     campaign.UserID,
		})
		if err != nil {
			return fmt.Errorf("create campaign user: %w", err)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return campaign, nil
}

func (s *Service) GetByID(id string) (*model.Campaign, error) {
	campaign, err := s.DB.GetCampaign(id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get campaign: %w", err)
	}
	return campaign, nil
}

func (s *Service) Update(userID string, req *model.UpdateCampaignRequest) (*model.Campaign, error) {
	if err := s.authorize(req.ID, userID); err != nil {
		return nil, err
	}
	campaign, err := s.DB.UpdateCampaign(req)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("update campaign: %w", err)
	}
	return campaign, nil
}

func (s *Service) Delete(userID, id string) (*model.Campaign, error) {
	if err := s.authorize(id, userID); err != nil {
		return nil, err
	}
	campaign, err := s.DB.DeleteCampaign(id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("delete campaign: %w", err)
	}
	return campaign, nil
}

func (s *Service) authorize(campaignID, userID string) error {
	member, err := s.DB.GetCampaignUser(campaignID, userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotAuthorized
		}
		return fmt.Errorf("authorize: %w", err)
	}
	if member.Role != model.MemberRoleDungeonMaster {
		return ErrNotAuthorized
	}
	return nil
}

func mapPgError(err error) error {
	if pg.IsError(err, pg.UniqueViolation) {
		return ErrAlreadyExists
	}
	if pg.IsError(err, pg.ForeignKeyViolation) && pg.Constraint(err) == "fk_campaign_user_id" {
		return ErrInvalidUser
	}
	return err
}
