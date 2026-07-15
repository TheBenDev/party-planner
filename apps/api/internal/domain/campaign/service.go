package campaign

import (
	"context"
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
	CreateCampaign(ctx context.Context, req *model.CreateCampaignRequest) (*model.Campaign, error)
	GetCampaign(ctx context.Context, id string) (*model.CampaignAuth, error)
	UpdateCampaign(ctx context.Context, req *model.UpdateCampaignRequest) (*model.Campaign, error)
	DeleteCampaign(ctx context.Context, id string) (*model.Campaign, error)
	CreateCampaignUser(ctx context.Context, req *model.CreateMemberRequest) (*model.Member, error)
	GetCampaignUser(ctx context.Context, campaignID, userID string) (*model.Member, error)
	RunInTx(ctx context.Context, fn func(context.Context, Store) error) error
}

type Service struct {
	DB  Store
	Log *slog.Logger
}

func (s *Service) Create(ctx context.Context, req *model.CreateCampaignRequest) (*model.Campaign, error) {
	var campaign *model.Campaign
	err := s.DB.RunInTx(ctx, func(ctx context.Context, tx Store) error {
		var err error
		campaign, err = tx.CreateCampaign(ctx, req)
		if err != nil {
			if mapped := mapPgError(err); mapped != err {
				return mapped
			}
			return fmt.Errorf("create campaign: %w", err)
		}
		_, err = tx.CreateCampaignUser(ctx, &model.CreateMemberRequest{
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

func (s *Service) GetByID(ctx context.Context, id string) (*model.CampaignAuth, error) {
	campaignAuth, err := s.DB.GetCampaign(ctx, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get campaign: %w", err)
	}
	return campaignAuth, nil
}

func (s *Service) Update(ctx context.Context, userID string, req *model.UpdateCampaignRequest) (*model.Campaign, error) {
	if err := s.authorize(ctx, req.ID, userID); err != nil {
		return nil, err
	}
	campaign, err := s.DB.UpdateCampaign(ctx, req)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("update campaign: %w", err)
	}
	return campaign, nil
}

func (s *Service) Delete(ctx context.Context, userID, id string) (*model.Campaign, error) {
	if err := s.authorize(ctx, id, userID); err != nil {
		return nil, err
	}
	campaign, err := s.DB.DeleteCampaign(ctx, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("delete campaign: %w", err)
	}
	return campaign, nil
}

func (s *Service) authorize(ctx context.Context, campaignID, userID string) error {
	member, err := s.DB.GetCampaignUser(ctx, campaignID, userID)
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
