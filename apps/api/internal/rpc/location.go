package rpc

import (
	"context"
	"errors"
	"log/slog"

	"connectrpc.com/connect"
	v1 "github.com/BBruington/party-planner/api/gen/planner/v1"
	"github.com/BBruington/party-planner/api/gen/planner/v1/plannerv1connect"
	model "github.com/BBruington/party-planner/api/internal/models"
	"github.com/BBruington/party-planner/api/internal/service"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type LocationServer struct {
	plannerv1connect.UnimplementedLocationServiceHandler
	Location *service.LocationService
	Log      *slog.Logger
}

// -----------------------------------------------------------------------------
// RPCs
// -----------------------------------------------------------------------------

func (s *LocationServer) CreateLocation(ctx context.Context, req *connect.Request[v1.CreateLocationRequest]) (*connect.Response[v1.CreateLocationResponse], error) {
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}
	if req.Msg.Name == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("name required"))
	}

	location, err := s.Location.Create(&model.CreateLocationRequest{
		CampaignID:  req.Msg.CampaignId,
		Name:        req.Msg.Name,
		Description: sqlNullString(req.Msg.Description),
		Notes:       sqlNullString(req.Msg.Notes),
		DmNotes:     sqlNullString(req.Msg.DmNotes),
	})
	if err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to create location")
	}

	return connect.NewResponse(&v1.CreateLocationResponse{
		Location: locationToProto(location),
	}), nil
}

func (s *LocationServer) GetLocation(ctx context.Context, req *connect.Request[v1.GetLocationRequest]) (*connect.Response[v1.GetLocationResponse], error) {
	if req.Msg.Id == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("id required"))
	}

	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}

	location, err := s.Location.Get(req.Msg.Id, req.Msg.CampaignId)
	if err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to get location")
	}

	return connect.NewResponse(&v1.GetLocationResponse{
		Location: locationToProto(location),
	}), nil
}

func (s *LocationServer) ListLocationsByCampaign(ctx context.Context, req *connect.Request[v1.ListLocationsByCampaignRequest]) (*connect.Response[v1.ListLocationsByCampaignResponse], error) {
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}

	locations, err := s.Location.ListByCampaign(req.Msg.CampaignId)
	if err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to list locations")
	}

	protoLocations := make([]*v1.Location, len(locations))
	for i, location := range locations {
		protoLocations[i] = locationToProto(location)
	}

	return connect.NewResponse(&v1.ListLocationsByCampaignResponse{
		Locations: protoLocations,
	}), nil
}

func (s *LocationServer) UpdateLocation(ctx context.Context, req *connect.Request[v1.UpdateLocationRequest]) (*connect.Response[v1.UpdateLocationResponse], error) {
	if req.Msg.Id == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("id required"))
	}
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}

	location, err := s.Location.Update(&model.UpdateLocationRequest{
		ID:          req.Msg.Id,
		CampaignID:  req.Msg.CampaignId,
		Name:        req.Msg.Name,
		Description: sqlNullString(req.Msg.Description),
		Notes:       sqlNullString(req.Msg.Notes),
		DmNotes:     sqlNullString(req.Msg.DmNotes),
	})
	if err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to update location")
	}

	return connect.NewResponse(&v1.UpdateLocationResponse{
		Location: locationToProto(location),
	}), nil
}

func (s *LocationServer) RemoveLocation(ctx context.Context, req *connect.Request[v1.RemoveLocationRequest]) (*connect.Response[v1.RemoveLocationResponse], error) {
	if req.Msg.Id == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("id required"))
	}
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}

	if err := s.Location.Remove(req.Msg.Id, req.Msg.CampaignId); err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to remove location")
	}

	return connect.NewResponse(&v1.RemoveLocationResponse{}), nil
}

// -----------------------------------------------------------------------------
// Converters — Proto ↔ Model
// -----------------------------------------------------------------------------

func locationToProto(location *model.Location) *v1.Location {
	if location == nil {
		return nil
	}
	proto := &v1.Location{
		Id:         location.ID,
		CampaignId: location.CampaignID,
		Name:       location.Name,
		CreatedAt:  timestamppb.New(location.CreatedAt),
		UpdatedAt:  timestamppb.New(location.UpdatedAt),
	}
	if location.Description.Valid {
		proto.Description = &location.Description.String
	}
	if location.Notes.Valid {
		proto.Notes = &location.Notes.String
	}
	if location.DmNotes.Valid {
		proto.DmNotes = &location.DmNotes.String
	}
	if location.DeletedAt.Valid {
		proto.DeletedAt = timestamppb.New(location.DeletedAt.Time)
	}
	return proto
}
