package location

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

// LocationServicer defines the interface that the service must implement.
type LocationServicer interface {
	Create(req *model.CreateLocationRequest) (*model.Location, error)
	GetByID(id, campaignID string) (*model.Location, error)
	ListByCampaign(campaignId string) ([]*model.Location, error)
	Update(req *model.UpdateLocationRequest) (*model.Location, error)
	Delete(id, campaignID string) (*model.Location, error)
}

// Server implements the LocationService ConnectRPC handler.
type Server struct {
	plannerv1connect.UnimplementedLocationServiceHandler
	Location LocationServicer
	Log      *slog.Logger
}

func (s *Server) ListLocationsByCampaign(ctx context.Context, req *connect.Request[v1.ListLocationsByCampaignRequest]) (*connect.Response[v1.ListLocationsByCampaignResponse], error) {
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}

	locations, err := s.Location.ListByCampaign(req.Msg.CampaignId)
	if err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to list locations")
	}

	protoLocations := make([]*v1.Location, len(locations))
	for i, location := range locations {
		protoLocations[i] = toProto(location)
	}

	return connect.NewResponse(&v1.ListLocationsByCampaignResponse{
		Locations: protoLocations,
	}), nil
}

func (s *Server) CreateLocation(ctx context.Context, req *connect.Request[v1.CreateLocationRequest]) (*connect.Response[v1.CreateLocationResponse], error) {
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
		return nil, mapError(ctx, s.Log, err, "failed to create location")
	}

	return connect.NewResponse(&v1.CreateLocationResponse{
		Location: toProto(location),
	}), nil
}

func (s *Server) GetLocation(ctx context.Context, req *connect.Request[v1.GetLocationRequest]) (*connect.Response[v1.GetLocationResponse], error) {
	if req.Msg.Id == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("id required"))
	}
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}

	location, err := s.Location.GetByID(req.Msg.Id, req.Msg.CampaignId)
	if err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to get location")
	}

	return connect.NewResponse(&v1.GetLocationResponse{
		Location: toProto(location),
	}), nil
}

func (s *Server) UpdateLocation(ctx context.Context, req *connect.Request[v1.UpdateLocationRequest]) (*connect.Response[v1.UpdateLocationResponse], error) {
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
		return nil, mapError(ctx, s.Log, err, "failed to update location")
	}

	return connect.NewResponse(&v1.UpdateLocationResponse{
		Location: toProto(location),
	}), nil
}

func (s *Server) RemoveLocation(ctx context.Context, req *connect.Request[v1.RemoveLocationRequest]) (*connect.Response[v1.RemoveLocationResponse], error) {
	if req.Msg.Id == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("id required"))
	}
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}

	_, err := s.Location.Delete(req.Msg.Id, req.Msg.CampaignId)
	if err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to remove location")
	}

	return connect.NewResponse(&v1.RemoveLocationResponse{}), nil
}

// ── Proto conversion ──────────────────────────────────────────────────────────

func toProto(l *model.Location) *v1.Location {
	if l == nil {
		return nil
	}
	proto := &v1.Location{
		Id:         l.ID,
		CampaignId: l.CampaignID,
		Name:       l.Name,
		CreatedAt:  timestamppb.New(l.CreatedAt),
		UpdatedAt:  timestamppb.New(l.UpdatedAt),
	}
	if l.Description.Valid {
		proto.Description = &l.Description.String
	}
	if l.Notes.Valid {
		proto.Notes = &l.Notes.String
	}
	if l.DmNotes.Valid {
		proto.DmNotes = &l.DmNotes.String
	}
	if l.DeletedAt.Valid {
		proto.DeletedAt = timestamppb.New(l.DeletedAt.Time)
	}
	return proto
}

// ── Error mapping ─────────────────────────────────────────────────────────────

func mapError(ctx context.Context, log *slog.Logger, err error, fallback string) error {
	switch err {
	case ErrLocationNotFound:
		return connect.NewError(connect.CodeNotFound, err)
	case ErrLocationAlreadyExists:
		return connect.NewError(connect.CodeAlreadyExists, err)
	case ErrLocationInvalidCampaign:
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
