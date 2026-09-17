package map_hex

import (
	"context"
	"errors"
	"log/slog"

	"connectrpc.com/connect"

	v1 "github.com/BBruington/party-planner/api/gen/planner/v1"
	"github.com/BBruington/party-planner/api/gen/planner/v1/plannerv1connect"
	model "github.com/BBruington/party-planner/api/internal/models"
)

type Server struct {
	plannerv1connect.UnimplementedMapServiceHandler
	Map *Service
	Log *slog.Logger
}

func (s *Server) GetCampaignMap(ctx context.Context, req *connect.Request[v1.GetCampaignMapRequest]) (*connect.Response[v1.GetCampaignMapResponse], error) {
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}
	hexes, err := s.Map.GetCampaignMap(ctx, req.Msg.CampaignId)
	if err != nil {
		s.Log.ErrorContext(ctx, "failed to get campaign map", "error", err)
		return nil, connect.NewError(connect.CodeInternal, errors.New("failed to get campaign map"))
	}
	protoHexes := make([]*v1.MapHex, len(hexes))
	for i, h := range hexes {
		protoHexes[i] = hexToProto(h)
	}
	return connect.NewResponse(&v1.GetCampaignMapResponse{Hexes: protoHexes}), nil
}

func (s *Server) UpsertMapHex(ctx context.Context, req *connect.Request[v1.UpsertMapHexRequest]) (*connect.Response[v1.UpsertMapHexResponse], error) {
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}
	if req.Msg.Terrain == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("terrain required"))
	}
	hex, err := s.Map.UpsertMapHex(ctx, &model.UpsertMapHexRequest{
		CampaignID: req.Msg.CampaignId,
		Q:          req.Msg.Q,
		R:          req.Msg.R,
		Terrain:    req.Msg.Terrain,
		Label:      req.Msg.Label,
	})
	if err != nil {
		s.Log.ErrorContext(ctx, "failed to upsert map hex", "error", err)
		return nil, connect.NewError(connect.CodeInternal, errors.New("failed to upsert map hex"))
	}
	return connect.NewResponse(&v1.UpsertMapHexResponse{Hex: hexToProto(hex)}), nil
}

func (s *Server) ClearMapHex(ctx context.Context, req *connect.Request[v1.ClearMapHexRequest]) (*connect.Response[v1.ClearMapHexResponse], error) {
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}
	if err := s.Map.ClearMapHex(ctx, req.Msg.CampaignId, req.Msg.Q, req.Msg.R); err != nil {
		s.Log.ErrorContext(ctx, "failed to clear map hex", "error", err)
		return nil, connect.NewError(connect.CodeInternal, errors.New("failed to clear map hex"))
	}
	return connect.NewResponse(&v1.ClearMapHexResponse{}), nil
}

func hexToProto(h *model.MapHex) *v1.MapHex {
	if h == nil {
		return nil
	}
	return &v1.MapHex{
		Id:         h.ID,
		CampaignId: h.CampaignID,
		Q:          h.Q,
		R:          h.R,
		Terrain:    h.Terrain,
		Label:      h.Label,
	}
}
