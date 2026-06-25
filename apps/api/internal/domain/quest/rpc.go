package quest

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"

	"connectrpc.com/connect"
	"google.golang.org/protobuf/types/known/structpb"
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

	var reward []byte
	if req.Msg.Reward != nil {
		reward, err = req.Msg.Reward.MarshalJSON()
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("invalid reward"))
		}
	}

	quest, err := s.Quest.Create(&model.CreateQuestRequest{
		CampaignID:   req.Msg.CampaignId,
		Title:        req.Msg.Title,
		Status:       status,
		Description:  sqlNullString(req.Msg.Description),
		QuestGiverID: sqlNullString(req.Msg.QuestGiverId),
		Reward:       reward,
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

	quest, err := s.Quest.GetByID(req.Msg.Id, req.Msg.CampaignId)
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

	quests, err := s.Quest.ListByCampaign(req.Msg.CampaignId)
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

	quest, err := s.Quest.Update(&model.UpdateQuestRequest{
		ID:          req.Msg.Id,
		CampaignID:  req.Msg.CampaignId,
		Title:       req.Msg.Title,
		Status:      status,
		Description: sqlNullString(req.Msg.Description),
	})
	if err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to update quest")
	}

	return connect.NewResponse(&v1.UpdateQuestResponse{
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

	if err := s.Quest.Remove(req.Msg.Id, req.Msg.CampaignId); err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to remove quest")
	}

	return connect.NewResponse(&v1.RemoveQuestResponse{}), nil
}

// ── Proto conversion ──────────────────────────────────────────────────────────

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
		s := &structpb.Struct{}
		if s.UnmarshalJSON(quest.Reward) == nil {
			proto.Reward = s
		}
	}
	if quest.CompletedAt.Valid {
		proto.CompletedAt = timestamppb.New(quest.CompletedAt.Time)
	}
	if quest.DeletedAt.Valid {
		proto.DeletedAt = timestamppb.New(quest.DeletedAt.Time)
	}
	return proto
}

// ── Error mapping ─────────────────────────────────────────────────────────────

func mapError(ctx context.Context, log *slog.Logger, err error, fallback string) error {
	switch err {
	case ErrNotFound:
		return connect.NewError(connect.CodeNotFound, err)
	case ErrAlreadyExists:
		return connect.NewError(connect.CodeAlreadyExists, err)
	case ErrInvalidCampaign:
		return connect.NewError(connect.CodeInvalidArgument, err)
	case ErrInvalidQuestGiver:
		return connect.NewError(connect.CodeInvalidArgument, err)
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
