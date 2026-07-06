package quest

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"

	"connectrpc.com/connect"
	"google.golang.org/protobuf/types/known/timestamppb"

	v1 "github.com/BBruington/party-planner/api/gen/planner/v1"
	"github.com/BBruington/party-planner/api/gen/planner/v1/plannerv1connect"
	model "github.com/BBruington/party-planner/api/internal/models"
)

// Server implements the QuestService ConnectRPC handler.
type Server struct {
	plannerv1connect.UnimplementedQuestServiceHandler
	Quest *Service
	Log   *slog.Logger
}

func (s *Server) CreateQuest(ctx context.Context, req *connect.Request[v1.CreateQuestRequest]) (*connect.Response[v1.CreateQuestResponse], error) {
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}
	if req.Msg.Title == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("title required"))
	}
	if req.Msg.Status == v1.QuestStatus_QUEST_STATUS_UNSPECIFIED {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("status required"))
	}

	status, err := protoToQuestStatus(req.Msg.Status)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	var questType *model.QuestType
	if req.Msg.Type != nil && *req.Msg.Type != v1.QuestType_QUEST_TYPE_UNSPECIFIED {
		t, err := protoToQuestType(*req.Msg.Type)
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, err)
		}
		questType = &t
	}

	quest, err := s.Quest.Create(ctx, &model.CreateQuestRequest{
		CampaignID:   req.Msg.CampaignId,
		Title:        req.Msg.Title,
		Status:       status,
		Description:  sqlNullString(req.Msg.Description),
		QuestGiverID: sqlNullString(req.Msg.QuestGiverId),
		Reward:       protoToQuestReward(req.Msg.Reward),
		Type:         questType,
	})
	if err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to create quest")
	}

	return connect.NewResponse(&v1.CreateQuestResponse{
		Quest: questToProto(quest),
	}), nil
}

func (s *Server) GetQuest(ctx context.Context, req *connect.Request[v1.GetQuestRequest]) (*connect.Response[v1.GetQuestResponse], error) {
	if req.Msg.Id == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("id required"))
	}
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}

	quest, err := s.Quest.GetByID(ctx, req.Msg.Id, req.Msg.CampaignId)
	if err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to get quest")
	}

	return connect.NewResponse(&v1.GetQuestResponse{
		Quest: questToProto(quest),
	}), nil
}

func (s *Server) ListQuestsByCampaign(ctx context.Context, req *connect.Request[v1.ListQuestsByCampaignRequest]) (*connect.Response[v1.ListQuestsByCampaignResponse], error) {
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}

	quests, err := s.Quest.ListByCampaign(ctx, req.Msg.CampaignId)
	if err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to list quests")
	}

	protoQuests := make([]*v1.Quest, len(quests))
	for i, quest := range quests {
		protoQuests[i] = questToProto(quest)
	}

	return connect.NewResponse(&v1.ListQuestsByCampaignResponse{
		Quests: protoQuests,
	}), nil
}

func (s *Server) UpdateQuest(ctx context.Context, req *connect.Request[v1.UpdateQuestRequest]) (*connect.Response[v1.UpdateQuestResponse], error) {
	if req.Msg.Id == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("id required"))
	}
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}

	var status *model.QuestStatus
	if req.Msg.Status != nil {
		if *req.Msg.Status == v1.QuestStatus_QUEST_STATUS_UNSPECIFIED {
			return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("status cannot be unspecified"))
		}
		s, err := protoToQuestStatus(*req.Msg.Status)
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, err)
		}
		status = &s
	}

	var questType *model.QuestType
	if req.Msg.Type != nil && *req.Msg.Type != v1.QuestType_QUEST_TYPE_UNSPECIFIED {
		t, err := protoToQuestType(*req.Msg.Type)
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, err)
		}
		questType = &t
	}

	quest, err := s.Quest.Update(ctx, &model.UpdateQuestRequest{
		ID:          req.Msg.Id,
		CampaignID:  req.Msg.CampaignId,
		Title:       req.Msg.Title,
		Status:      status,
		Description: sqlNullString(req.Msg.Description),
		Type:        questType,
		Reward:      protoToQuestReward(req.Msg.Reward),
	})
	if err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to update quest")
	}

	return connect.NewResponse(&v1.UpdateQuestResponse{
		Quest: questToProto(quest),
	}), nil
}

func (s *Server) CompleteQuest(ctx context.Context, req *connect.Request[v1.CompleteQuestRequest]) (*connect.Response[v1.CompleteQuestResponse], error) {
	if req.Msg.Id == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("id required"))
	}
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}

	quest, err := s.Quest.Complete(ctx, req.Msg.Id, req.Msg.CampaignId)
	if err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to complete quest")
	}

	return connect.NewResponse(&v1.CompleteQuestResponse{
		Quest: questToProto(quest),
	}), nil
}

func (s *Server) RemoveQuest(ctx context.Context, req *connect.Request[v1.RemoveQuestRequest]) (*connect.Response[v1.RemoveQuestResponse], error) {
	if req.Msg.Id == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("id required"))
	}
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}

	if err := s.Quest.Remove(ctx, req.Msg.Id, req.Msg.CampaignId); err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to remove quest")
	}

	return connect.NewResponse(&v1.RemoveQuestResponse{}), nil
}

// ── Proto conversion ──────────────────────────────────────────────────────────

func protoToQuestType(t v1.QuestType) (model.QuestType, error) {
	switch t {
	case v1.QuestType_QUEST_TYPE_MAINLAND:
		return model.QuestTypeMainland, nil
	case v1.QuestType_QUEST_TYPE_COLONY:
		return model.QuestTypeColony, nil
	default:
		return "", fmt.Errorf("unknown quest type: %v", t)
	}
}

func questTypeToProto(t model.QuestType) v1.QuestType {
	switch t {
	case model.QuestTypeMainland:
		return v1.QuestType_QUEST_TYPE_MAINLAND
	case model.QuestTypeColony:
		return v1.QuestType_QUEST_TYPE_COLONY
	default:
		return v1.QuestType_QUEST_TYPE_UNSPECIFIED
	}
}

func protoToQuestStatus(s v1.QuestStatus) (model.QuestStatus, error) {
	switch s {
	case v1.QuestStatus_QUEST_STATUS_ACTIVE:
		return model.QuestStatusActive, nil
	case v1.QuestStatus_QUEST_STATUS_COMPLETED:
		return model.QuestStatusCompleted, nil
	case v1.QuestStatus_QUEST_STATUS_FAILED:
		return model.QuestStatusFailed, nil
	default:
		return "", fmt.Errorf("unknown quest status: %v", s)
	}
}

func questStatusToProto(s model.QuestStatus) v1.QuestStatus {
	switch s {
	case model.QuestStatusActive:
		return v1.QuestStatus_QUEST_STATUS_ACTIVE
	case model.QuestStatusCompleted:
		return v1.QuestStatus_QUEST_STATUS_COMPLETED
	case model.QuestStatusFailed:
		return v1.QuestStatus_QUEST_STATUS_FAILED
	default:
		return v1.QuestStatus_QUEST_STATUS_UNSPECIFIED
	}
}

func protoToQuestReward(r *v1.QuestReward) *model.QuestReward {
	if r == nil {
		return nil
	}
	reward := &model.QuestReward{}
	if r.Colony != nil {
		reward.Colony = &model.QuestRewardColony{
			Gold:              r.Colony.Gold,
			Food:              r.Colony.Food,
			BuildingMaterials: r.Colony.BuildingMaterials,
			ColonistCount:     r.Colony.ColonistCount,
			Morale:            r.Colony.Morale,
		}
	}
	for _, item := range r.Loot {
		reward.Loot = append(reward.Loot, model.QuestRewardLootItem{
			Name:        item.Name,
			Quantity:    item.Quantity,
			Description: item.Description,
		})
	}
	return reward
}

func questRewardToProto(r *model.QuestReward) *v1.QuestReward {
	if r == nil {
		return nil
	}
	proto := &v1.QuestReward{}
	if r.Colony != nil {
		proto.Colony = &v1.QuestRewardColony{
			Gold:              r.Colony.Gold,
			Food:              r.Colony.Food,
			BuildingMaterials: r.Colony.BuildingMaterials,
			ColonistCount:     r.Colony.ColonistCount,
			Morale:            r.Colony.Morale,
		}
	}
	for _, item := range r.Loot {
		lootItem := &v1.QuestRewardLootItem{Name: item.Name}
		lootItem.Quantity = item.Quantity
		lootItem.Description = item.Description
		proto.Loot = append(proto.Loot, lootItem)
	}
	return proto
}

func questToProto(quest *model.Quest) *v1.Quest {
	if quest == nil {
		return nil
	}
	proto := &v1.Quest{
		Id:         quest.ID,
		CampaignId: quest.CampaignID,
		Title:      quest.Title,
		Status:     questStatusToProto(quest.Status),
		CreatedAt:  timestamppb.New(quest.CreatedAt),
		UpdatedAt:  timestamppb.New(quest.UpdatedAt),
	}
	if quest.Description.Valid {
		proto.Description = &quest.Description.String
	}
	if quest.QuestGiverID.Valid {
		proto.QuestGiverId = &quest.QuestGiverID.String
	}
	if quest.Reward != nil {
		proto.Reward = questRewardToProto(quest.Reward)
	}
	if quest.CompletedAt.Valid {
		proto.CompletedAt = timestamppb.New(quest.CompletedAt.Time)
	}
	if quest.DeletedAt.Valid {
		proto.DeletedAt = timestamppb.New(quest.DeletedAt.Time)
	}
	if quest.Type != nil {
		t := questTypeToProto(*quest.Type)
		proto.Type = &t
	}
	return proto
}

// ── Error mapping ─────────────────────────────────────────────────────────────

func mapError(ctx context.Context, log *slog.Logger, err error, fallback string) error {
	switch {
	case errors.Is(err, ErrNotFound):
		return connect.NewError(connect.CodeNotFound, err)
	case errors.Is(err, ErrAlreadyExists):
		return connect.NewError(connect.CodeAlreadyExists, err)
	case errors.Is(err, ErrInvalidCampaign):
		return connect.NewError(connect.CodeInvalidArgument, err)
	case errors.Is(err, ErrInvalidQuestGiver):
		return connect.NewError(connect.CodeInvalidArgument, err)
	case errors.Is(err, ErrNoColony):
		return connect.NewError(connect.CodeFailedPrecondition, err)
	default:
		log.ErrorContext(ctx, fallback, "error", err)
		return connect.NewError(connect.CodeInternal, errors.New(fallback))
	}
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func sqlNullString(s *string) sql.NullString {
	if s == nil {
		return sql.NullString{}
	}
	return sql.NullString{String: *s, Valid: true}
}
