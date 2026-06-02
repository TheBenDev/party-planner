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
	ErrQuestNotFound          = errors.New("quest not found")
	ErrQuestAlreadyExists     = errors.New("quest already exists")
	ErrQuestInvalidCampaign   = errors.New("campaign does not exist")
	ErrQuestInvalidQuestGiver = errors.New("quest giver npc does not exist")
)

type QuestService struct {
	DB  *db.DB
	Log *slog.Logger
}

func (s *QuestService) Create(quest *model.CreateQuestRequest) (*model.Quest, error) {
	created, err := s.DB.CreateQuest(quest)
	if err != nil {
		if mapped := mapQuestPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("create quest error: %w", err)
	}
	return created, nil
}

func (s *QuestService) Get(id, campaignId string) (*model.Quest, error) {
	quest, err := s.DB.GetQuest(id, campaignId)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrQuestNotFound
		}
		return nil, fmt.Errorf("get quest error: %w", err)
	}
	return quest, nil
}

func (s *QuestService) ListByCampaign(campaignId string) ([]*model.Quest, error) {
	quests, err := s.DB.ListQuestsByCampaign(campaignId)
	if err != nil {
		return nil, fmt.Errorf("list quests by campaign error: %w", err)
	}
	return quests, nil
}

func (s *QuestService) Update(req *model.UpdateQuestRequest) (*model.Quest, error) {
	_, err := s.Get(req.ID, req.CampaignID)
	if err != nil {
		return nil, err
	}
	updated, err := s.DB.UpdateQuest(req)
	if err != nil {
		if mapped := mapQuestPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("update quest error: %w", err)
	}
	return updated, nil
}

func (s *QuestService) Remove(id, campaignID string) error {
	_, err := s.Get(id, campaignID)
	if err != nil {
		return err
	}
	if err := s.DB.RemoveQuest(id, campaignID); err != nil {
		return fmt.Errorf("remove quest error: %w", err)
	}
	return nil
}

func mapQuestPgError(err error) error {
	if isPgError(err, pgErrUniqueViolation) {
		return ErrQuestAlreadyExists
	}
	if isPgError(err, pgErrForeignKeyViolation) {
		switch pgConstraint(err) {
		case "fk_quest_campaign_id":
			return ErrQuestInvalidCampaign
		case "fk_quest_quest_giver_id":
			return ErrQuestInvalidQuestGiver
		}
	}
	return err
}
