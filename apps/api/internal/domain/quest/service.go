package quest

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
	ErrNotFound          = errors.New("quest not found")
	ErrAlreadyExists     = errors.New("quest already exists")
	ErrInvalidCampaign   = errors.New("campaign does not exist")
	ErrInvalidQuestGiver = errors.New("quest giver npc does not exist")
	ErrNoColony          = errors.New("no colony found for campaign")
)

type Store interface {
	CreateQuest(ctx context.Context, req *model.CreateQuestRequest) (*model.Quest, error)
	GetQuest(ctx context.Context, id, campaignID string) (*model.Quest, error)
	ListQuestsByCampaign(ctx context.Context, campaignID string) ([]*model.Quest, error)
	UpdateQuest(ctx context.Context, req *model.UpdateQuestRequest) (*model.Quest, error)
	CompleteQuest(ctx context.Context, id, campaignID string) (*model.Quest, error)
	RemoveQuest(ctx context.Context, id, campaignID string) error
	RunInTx(ctx context.Context, fn func(context.Context, Store) error) error
}

type ColonyStore interface {
	ApplyRewardByCampaign(ctx context.Context, campaignID string, reward *model.QuestRewardColony) (*model.Colony, error)
}

type Service struct {
	DB       Store
	ColonyDB ColonyStore
	Log      *slog.Logger
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

func (s *Service) Complete(ctx context.Context, id, campaignID string) (*model.Quest, error) {
	var quest *model.Quest
	var err error
	if err := s.DB.RunInTx(ctx, func(ctx context.Context, txDB Store) error {
		quest, err = txDB.CompleteQuest(ctx, id, campaignID)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return ErrNotFound
			}
			return fmt.Errorf("complete quest: %w", err)
		}
		if quest.Reward != nil && quest.Reward.Colony != nil {
			if _, err := s.ColonyDB.ApplyRewardByCampaign(ctx, campaignID, quest.Reward.Colony); err != nil {
				if errors.Is(err, sql.ErrNoRows) {
					return ErrNoColony
				}
				return fmt.Errorf("apply colony reward: %w", err)
			}
		}
		return nil
	}); err != nil {
		return nil, err
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
