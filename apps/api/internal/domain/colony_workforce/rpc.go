package colony_workforce

import (
	"context"
	"errors"
	"fmt"
	"log/slog"

	"connectrpc.com/connect"
	"google.golang.org/protobuf/types/known/timestamppb"

	v1 "github.com/BBruington/party-planner/api/gen/planner/v1"
	"github.com/BBruington/party-planner/api/gen/planner/v1/plannerv1connect"
	model "github.com/BBruington/party-planner/api/internal/models"
)

// Server implements the ColonyWorkforceService ConnectRPC handler.
type Server struct {
	plannerv1connect.UnimplementedColonyWorkforceServiceHandler
	ColonyWorkforce *Service
	Log             *slog.Logger
}

func (s *Server) ListColonyWorkforce(ctx context.Context, req *connect.Request[v1.ListColonyWorkforceRequest]) (*connect.Response[v1.ListColonyWorkforceResponse], error) {
	if req.Msg.ColonyId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("colony id required"))
	}
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}

	workforce, err := s.ColonyWorkforce.ListByColony(ctx, req.Msg.ColonyId, req.Msg.CampaignId)
	if err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to list colony workforce")
	}

	protoWorkforce := make([]*v1.ColonyWorkforce, len(workforce))
	for i, w := range workforce {
		protoWorkforce[i] = workforceToProto(w)
	}

	return connect.NewResponse(&v1.ListColonyWorkforceResponse{
		Workforce: protoWorkforce,
	}), nil
}

func (s *Server) UpsertColonyWorkforce(ctx context.Context, req *connect.Request[v1.UpsertColonyWorkforceRequest]) (*connect.Response[v1.UpsertColonyWorkforceResponse], error) {
	if req.Msg.ColonyId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("colony id required"))
	}
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}
	if req.Msg.WorkerType == v1.WorkerType_WORKER_TYPE_UNSPECIFIED {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("worker type required"))
	}

	workerType, err := protoToWorkerType(req.Msg.WorkerType)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	workforce, err := s.ColonyWorkforce.Upsert(ctx, &model.UpsertColonyWorkforceRequest{
		ColonyID:   req.Msg.ColonyId,
		CampaignID: req.Msg.CampaignId,
		WorkerType: workerType,
		Count:      req.Msg.Count,
	})
	if err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to upsert colony workforce")
	}

	return connect.NewResponse(&v1.UpsertColonyWorkforceResponse{
		Workforce: workforceToProto(workforce),
	}), nil
}

// ── Proto conversion ──────────────────────────────────────────────────────────

func protoToWorkerType(w v1.WorkerType) (model.WorkerType, error) {
	switch w {
	case v1.WorkerType_WORKER_TYPE_FARMER:
		return model.WorkerTypeFarmer, nil
	case v1.WorkerType_WORKER_TYPE_HEALER:
		return model.WorkerTypeHealer, nil
	case v1.WorkerType_WORKER_TYPE_BLACKSMITH:
		return model.WorkerTypeBlacksmith, nil
	case v1.WorkerType_WORKER_TYPE_SOLDIER:
		return model.WorkerTypeSoldier, nil
	case v1.WorkerType_WORKER_TYPE_MINER:
		return model.WorkerTypeMiner, nil
	case v1.WorkerType_WORKER_TYPE_BUILDER:
		return model.WorkerTypeBuilder, nil
	case v1.WorkerType_WORKER_TYPE_SCHOLAR:
		return model.WorkerTypeScholar, nil
	case v1.WorkerType_WORKER_TYPE_MAGE:
		return model.WorkerTypeMage, nil
	default:
		return "", fmt.Errorf("unknown worker type: %v", w)
	}
}

func workforceToProto(w *model.ColonyWorkforce) *v1.ColonyWorkforce {
	if w == nil {
		return nil
	}
	return &v1.ColonyWorkforce{
		Id:         w.ID,
		ColonyId:   w.ColonyID,
		WorkerType: workerTypeToProto(w.WorkerType),
		Count:      w.Count,
		CreatedAt:  timestamppb.New(w.CreatedAt),
		UpdatedAt:  timestamppb.New(w.UpdatedAt),
	}
}

func workerTypeToProto(w model.WorkerType) v1.WorkerType {
	switch w {
	case model.WorkerTypeFarmer:
		return v1.WorkerType_WORKER_TYPE_FARMER
	case model.WorkerTypeHealer:
		return v1.WorkerType_WORKER_TYPE_HEALER
	case model.WorkerTypeBlacksmith:
		return v1.WorkerType_WORKER_TYPE_BLACKSMITH
	case model.WorkerTypeSoldier:
		return v1.WorkerType_WORKER_TYPE_SOLDIER
	case model.WorkerTypeMiner:
		return v1.WorkerType_WORKER_TYPE_MINER
	case model.WorkerTypeBuilder:
		return v1.WorkerType_WORKER_TYPE_BUILDER
	case model.WorkerTypeScholar:
		return v1.WorkerType_WORKER_TYPE_SCHOLAR
	case model.WorkerTypeMage:
		return v1.WorkerType_WORKER_TYPE_MAGE
	default:
		return v1.WorkerType_WORKER_TYPE_UNSPECIFIED
	}
}

// ── Error mapping ─────────────────────────────────────────────────────────────

func mapError(ctx context.Context, log *slog.Logger, err error, fallback string) error {
	switch err {
	case ErrNotFound:
		return connect.NewError(connect.CodeNotFound, err)
	case ErrColonyNotFound:
		return connect.NewError(connect.CodeNotFound, err)
	case ErrInvalidColony:
		return connect.NewError(connect.CodeInvalidArgument, err)
	default:
		log.ErrorContext(ctx, fallback, "error", err)
		return connect.NewError(connect.CodeInternal, errors.New(fallback))
	}
}
