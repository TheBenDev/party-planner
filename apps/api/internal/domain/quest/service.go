package quest

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"

	"github.com/BBruington/party-planner/api/internal/pg"
	model "github.com/BBruington/party-planner/api/internal/models"
)

// Domain errors.
var (
	ErrNotFound          = errors.New("quest not found")
	ErrAlreadyExists     = errors.New("quest already exists")
	ErrInvalidCampaign   = errors.New("campaign does not exist")
	ErrInvalidQuestGiver = errors.New("quest giver npc does not exist")
)

type Store interface {
	CreateQuest(ctx context.Context, req *model.CreateQuestRequest) (*model.Quest, error)
	GetQuest(ctx context.Context, id, campaignID string) (*model.Quest, error)
	ListQuestsByCampaign(ctx context.Context, campaignID string) ([]*model.Quest, error)
	UpdateQuest(ctx context.Context, req *model.UpdateQuestRequest) (*model.Quest, error)
	RemoveQuest(ctx context.Context, id, campaignID string) error
}

type Service struct {
	DB  Store
	Log *slog.Logger
}

func (s *Service) Create(ctx context.Context, req *model.CreateQuestRequest) (*model.Quest, error) {
	quest, err := s.DB.CreateQuest(ctx, req)
	if err != nil {
		if mapped := mapPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("create quest: %w", err)
	}
	return quest, nil
}

func (s *Service) GetByID(ctx context.Context, id, campaignID string) (*model.Quest, error) {
	quest, err := s.DB.GetQuest(ctx, id, campaignID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get quest: %w", err)
	}
	return quest, nil
}

func (s *Service) ListByCampaign(ctx context.Context, campaignID string) ([]*model.Quest, error) {
	quests, err := s.DB.ListQuestsByCampaign(ctx, campaignID)
	if err != nil {
		return nil, fmt.Errorf("list quests by campaign: %w", err)
	}
	return quests, nil
}

func (s *Service) Update(ctx context.Context, req *model.UpdateQuestRequest) (*model.Quest, error) {
	_, err := s.GetByID(ctx, req.ID, req.CampaignID)
	if err != nil {
		return nil, err
	}
	quest, err := s.DB.UpdateQuest(ctx, req)
	if err != nil {
		if mapped := mapPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("update quest: %w", err)
	}
	return quest, nil
}

func (s *Service) Remove(ctx context.Context, id, campaignID string) error {
	_, err := s.GetByID(ctx, id, campaignID)
	if err != nil {
		return err
	}
	if err := s.DB.RemoveQuest(ctx, id, campaignID); err != nil {
		return fmt.Errorf("remove quest: %w", err)
	}
	return nil
}

func mapPgError(err error) error {
	if pg.IsError(err, pg.UniqueViolation) {
		return ErrAlreadyExists
	}
	if pg.IsError(err, pg.ForeignKeyViolation) {
		switch pg.Constraint(err) {
		case "fk_quest_campaign_id":
			return ErrInvalidCampaign
		case "fk_quest_quest_giver_id":
			return ErrInvalidQuestGiver
		}
	}
	return err
}
