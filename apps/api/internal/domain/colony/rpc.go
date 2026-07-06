package colony

import (
	"context"
	"database/sql"
	"errors"
	"log/slog"

	"connectrpc.com/connect"
	"google.golang.org/protobuf/types/known/timestamppb"

	v1 "github.com/BBruington/party-planner/api/gen/planner/v1"
	"github.com/BBruington/party-planner/api/gen/planner/v1/plannerv1connect"
	model "github.com/BBruington/party-planner/api/internal/models"
)

// Server implements the ColonyService ConnectRPC handler.
type Server struct {
	plannerv1connect.UnimplementedColonyServiceHandler
	Colony *Service
	Log    *slog.Logger
}

func (s *Server) CreateColony(ctx context.Context, req *connect.Request[v1.CreateColonyRequest]) (*connect.Response[v1.CreateColonyResponse], error) {
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}

	colony, err := s.Colony.Create(ctx, &model.CreateColonyRequest{
		CampaignID:        req.Msg.CampaignId,
		ColonistCount:     sqlNullInt32(req.Msg.ColonistCount),
		Food:              sqlNullInt32(req.Msg.Food),
		BuildingMaterials: sqlNullInt32(req.Msg.BuildingMaterials),
		Gold:              sqlNullInt32(req.Msg.Gold),
		Morale:            sqlNullInt32(req.Msg.Morale),
	})
	if err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to create colony")
	}

	return connect.NewResponse(&v1.CreateColonyResponse{
		Colony: colonyToProto(colony),
	}), nil
}

func (s *Server) GetColonyByCampaign(ctx context.Context, req *connect.Request[v1.GetColonyByCampaignRequest]) (*connect.Response[v1.GetColonyByCampaignResponse], error) {
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}

	colony, err := s.Colony.GetByCampaign(ctx, req.Msg.CampaignId)
	if err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to get colony")
	}

	return connect.NewResponse(&v1.GetColonyByCampaignResponse{
		Colony: colonyToProto(colony),
	}), nil
}

func (s *Server) UpdateColony(ctx context.Context, req *connect.Request[v1.UpdateColonyRequest]) (*connect.Response[v1.UpdateColonyResponse], error) {
	if req.Msg.Id == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("id required"))
	}
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}

	colony, err := s.Colony.Update(ctx, &model.UpdateColonyRequest{
		ID:                req.Msg.Id,
		CampaignID:        req.Msg.CampaignId,
		ColonistCount:     sqlNullInt32(req.Msg.ColonistCount),
		Food:              sqlNullInt32(req.Msg.Food),
		BuildingMaterials: sqlNullInt32(req.Msg.BuildingMaterials),
		Gold:              sqlNullInt32(req.Msg.Gold),
		Morale:            sqlNullInt32(req.Msg.Morale),
	})
	if err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to update colony")
	}

	return connect.NewResponse(&v1.UpdateColonyResponse{
		Colony: colonyToProto(colony),
	}), nil
}

func (s *Server) RemoveColony(ctx context.Context, req *connect.Request[v1.RemoveColonyRequest]) (*connect.Response[v1.RemoveColonyResponse], error) {
	if req.Msg.Id == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("id required"))
	}
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}

	if err := s.Colony.Remove(ctx, req.Msg.Id, req.Msg.CampaignId); err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to remove colony")
	}

	return connect.NewResponse(&v1.RemoveColonyResponse{}), nil
}

// ── Proto conversion ──────────────────────────────────────────────────────────

func colonyToProto(c *model.Colony) *v1.Colony {
	if c == nil {
		return nil
	}
	return &v1.Colony{
		Id:                c.ID,
		CampaignId:        c.CampaignID,
		ColonistCount:     c.ColonistCount,
		Food:              c.Food,
		BuildingMaterials: c.BuildingMaterials,
		Gold:              c.Gold,
		Morale:            c.Morale,
		CreatedAt:         timestamppb.New(c.CreatedAt),
		UpdatedAt:         timestamppb.New(c.UpdatedAt),
	}
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
	default:
		log.ErrorContext(ctx, fallback, "error", err)
		return connect.NewError(connect.CodeInternal, errors.New(fallback))
	}
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func sqlNullInt32(i *int32) sql.NullInt32 {
	if i == nil {
		return sql.NullInt32{}
	}
	return sql.NullInt32{Int32: *i, Valid: true}
}
