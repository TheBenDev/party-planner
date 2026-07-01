package region

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

type RegionServicer interface {
	Create(ctx context.Context, req *model.CreateRegionRequest) (*model.Region, error)
	GetByID(ctx context.Context, id, campaignID string) (*model.RegionWithLocations, error)
	ListByCampaign(ctx context.Context, campaignID string) ([]*model.RegionWithLocations, error)
	Update(ctx context.Context, req *model.UpdateRegionRequest) (*model.Region, error)
	Delete(ctx context.Context, id, campaignID string) (*model.Region, error)
}

type Server struct {
	plannerv1connect.UnimplementedRegionServiceHandler
	Region RegionServicer
	Log    *slog.Logger
}

func (s *Server) CreateRegion(ctx context.Context, req *connect.Request[v1.CreateRegionRequest]) (*connect.Response[v1.CreateRegionResponse], error) {
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}
	if req.Msg.Name == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("name required"))
	}

	region, err := s.Region.Create(ctx, &model.CreateRegionRequest{
		CampaignID:  req.Msg.CampaignId,
		Name:        req.Msg.Name,
		MapImageURL: sqlNullString(req.Msg.MapImageUrl),
	})
	if err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to create region")
	}

	return connect.NewResponse(&v1.CreateRegionResponse{
		Region: toProto(region),
	}), nil
}

func (s *Server) GetRegion(ctx context.Context, req *connect.Request[v1.GetRegionRequest]) (*connect.Response[v1.GetRegionResponse], error) {
	if req.Msg.Id == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("id required"))
	}
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}

	region, err := s.Region.GetByID(ctx, req.Msg.Id, req.Msg.CampaignId)
	if err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to get region")
	}
	protoLocations := make([]*v1.Location, len(region.Locations))
	for i, location := range region.Locations {
		protoLocations[i] = locationToProto(location)
	}

	return connect.NewResponse(&v1.GetRegionResponse{
		Data: &v1.RegionWithDetails{Region: toProto(region.Region), Locations: protoLocations},
	}), nil
}

func (s *Server) ListRegionsByCampaign(ctx context.Context, req *connect.Request[v1.ListRegionsByCampaignRequest]) (*connect.Response[v1.ListRegionsByCampaignResponse], error) {
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}

	regions, err := s.Region.ListByCampaign(ctx, req.Msg.CampaignId)
	if err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to list regions")
	}

	protoRegions := make([]*v1.RegionWithDetails, len(regions))
	for i, regionWithLocations := range regions {
		protoLocations := make([]*v1.Location, len(regionWithLocations.Locations))
		for j, location := range regionWithLocations.Locations {
			protoLocations[j] = locationToProto(location)
		}
		protoRegions[i] = &v1.RegionWithDetails{
			Region:    toProto(regionWithLocations.Region),
			Locations: protoLocations,
		}
	}

	return connect.NewResponse(&v1.ListRegionsByCampaignResponse{
		Regions: protoRegions,
	}), nil
}

func (s *Server) UpdateRegion(ctx context.Context, req *connect.Request[v1.UpdateRegionRequest]) (*connect.Response[v1.UpdateRegionResponse], error) {
	if req.Msg.Id == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("id required"))
	}
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}

	region, err := s.Region.Update(ctx, &model.UpdateRegionRequest{
		ID:          req.Msg.Id,
		CampaignID:  req.Msg.CampaignId,
		Name:        req.Msg.Name,
		MapImageURL: req.Msg.MapImageUrl,
	})
	if err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to update region")
	}

	return connect.NewResponse(&v1.UpdateRegionResponse{
		Region: toProto(region),
	}), nil
}

func (s *Server) RemoveRegion(ctx context.Context, req *connect.Request[v1.RemoveRegionRequest]) (*connect.Response[v1.RemoveRegionResponse], error) {
	if req.Msg.Id == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("id required"))
	}
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}

	_, err := s.Region.Delete(ctx, req.Msg.Id, req.Msg.CampaignId)
	if err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to remove region")
	}

	return connect.NewResponse(&v1.RemoveRegionResponse{}), nil
}

func toProto(r *model.Region) *v1.Region {
	if r == nil {
		return nil
	}
	proto := &v1.Region{
		Id:         r.ID,
		CampaignId: r.CampaignID,
		Name:       r.Name,
		CreatedAt:  timestamppb.New(r.CreatedAt),
		UpdatedAt:  timestamppb.New(r.UpdatedAt),
	}
	if r.MapImageURL.Valid {
		proto.MapImageUrl = &r.MapImageURL.String
	}
	if r.DeletedAt.Valid {
		proto.DeletedAt = timestamppb.New(r.DeletedAt.Time)
	}
	return proto
}

func locationToProto(l *model.Location) *v1.Location {
	if l == nil {
		return nil
	}
	proto := &v1.Location{
		Id:        l.ID,
		RegionId:  l.RegionID,
		Name:      l.Name,
		CreatedAt: timestamppb.New(l.CreatedAt),
		UpdatedAt: timestamppb.New(l.UpdatedAt),
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
	if l.MapX.Valid {
		v := float32(l.MapX.Float64)
		proto.MapX = &v
	}
	if l.MapY.Valid {
		v := float32(l.MapY.Float64)
		proto.MapY = &v
	}
	return proto
}

func mapError(ctx context.Context, log *slog.Logger, err error, fallback string) error {
	switch {
	case errors.Is(err, ErrRegionNotFound):
		return connect.NewError(connect.CodeNotFound, err)
	case errors.Is(err, ErrRegionAlreadyExists):
		return connect.NewError(connect.CodeAlreadyExists, err)
	case errors.Is(err, ErrRegionInvalidCampaign):
		return connect.NewError(connect.CodeInvalidArgument, err)
	default:
		log.ErrorContext(ctx, fallback, "error", err)
		return connect.NewError(connect.CodeInternal, errors.New(fallback))
	}
}

func sqlNullString(s *string) sql.NullString {
	if s == nil {
		return sql.NullString{}
	}
	return sql.NullString{String: *s, Valid: true}
}
