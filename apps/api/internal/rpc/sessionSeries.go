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

type SessionSeriesServer struct {
	plannerv1connect.UnimplementedSessionSeriesServiceHandler
	SessionSeries *service.SessionSeriesService
	Log           *slog.Logger
}

func (s *SessionSeriesServer) CreateSessionSeries(ctx context.Context, req *connect.Request[v1.CreateSessionSeriesRequest]) (*connect.Response[v1.CreateSessionSeriesResponse], error) {
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}
	if req.Msg.Title == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("title required"))
	}
	if req.Msg.Rrule == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("rrule required"))
	}
	if req.Msg.StartTime == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("start time required"))
	}
	if req.Msg.SeriesStartDate == nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("series start date required"))
	}
	if err := req.Msg.SeriesStartDate.CheckValid(); err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("invalid series start date"))
	}
	if req.Msg.SeriesEndDate != nil {
		if err := req.Msg.SeriesEndDate.CheckValid(); err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("invalid series end date"))
		}
	}
	if req.Msg.Timezone == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("timezone required"))
	}

	series, err := s.SessionSeries.Create(&model.CreateSessionSeriesRequest{
		CampaignID:      req.Msg.CampaignId,
		Title:           req.Msg.Title,
		Description:     sqlNullString(req.Msg.Description),
		RRule:           req.Msg.Rrule,
		StartTime:       req.Msg.StartTime,
		SeriesStartDate: req.Msg.SeriesStartDate.AsTime(),
		SeriesEndDate:   sqlNullableTime(req.Msg.SeriesEndDate),
		Timezone:        req.Msg.Timezone,
	})
	if err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to create session series")
	}

	return connect.NewResponse(&v1.CreateSessionSeriesResponse{
		Series: sessionSeriesToProto(series),
	}), nil
}

func (s *SessionSeriesServer) GetSessionSeries(ctx context.Context, req *connect.Request[v1.GetSessionSeriesRequest]) (*connect.Response[v1.GetSessionSeriesResponse], error) {
	if req.Msg.Id == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("id required"))
	}

	series, err := s.SessionSeries.Get(req.Msg.Id)
	if err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to get session series")
	}

	return connect.NewResponse(&v1.GetSessionSeriesResponse{
		Series: sessionSeriesToProto(series),
	}), nil
}

func (s *SessionSeriesServer) ListSessionSeriesByCampaign(ctx context.Context, req *connect.Request[v1.ListSessionSeriesByCampaignRequest]) (*connect.Response[v1.ListSessionSeriesByCampaignResponse], error) {
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}

	seriesList, err := s.SessionSeries.ListByCampaign(req.Msg.CampaignId)
	if err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to list session series")
	}

	protoSeries := make([]*v1.SessionSeries, len(seriesList))
	for i, ss := range seriesList {
		protoSeries[i] = sessionSeriesToProto(ss)
	}

	return connect.NewResponse(&v1.ListSessionSeriesByCampaignResponse{
		Series: protoSeries,
	}), nil
}

func (s *SessionSeriesServer) UpdateSessionSeries(ctx context.Context, req *connect.Request[v1.UpdateSessionSeriesRequest]) (*connect.Response[v1.UpdateSessionSeriesResponse], error) {
	if req.Msg.Id == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("id required"))
	}
	if req.Msg.SeriesEndDate != nil {
		if err := req.Msg.SeriesEndDate.CheckValid(); err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("invalid series end date"))
		}
	}

	series, err := s.SessionSeries.Update(&model.UpdateSessionSeriesRequest{
		ID:            req.Msg.Id,
		Title:         req.Msg.Title,
		Description:   sqlNullString(req.Msg.Description),
		RRule:         req.Msg.Rrule,
		StartTime:     req.Msg.StartTime,
		SeriesEndDate: sqlNullableTime(req.Msg.SeriesEndDate),
		Timezone:      req.Msg.Timezone,
	})
	if err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to update session series")
	}

	return connect.NewResponse(&v1.UpdateSessionSeriesResponse{
		Series: sessionSeriesToProto(series),
	}), nil
}

func (s *SessionSeriesServer) RemoveSessionSeries(ctx context.Context, req *connect.Request[v1.RemoveSessionSeriesRequest]) (*connect.Response[v1.RemoveSessionSeriesResponse], error) {
	if req.Msg.Id == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("id required"))
	}

	if err := s.SessionSeries.Remove(req.Msg.Id); err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to remove session series")
	}

	return connect.NewResponse(&v1.RemoveSessionSeriesResponse{}), nil
}

func (s *SessionSeriesServer) AddSeriesException(ctx context.Context, req *connect.Request[v1.AddSeriesExceptionRequest]) (*connect.Response[v1.AddSeriesExceptionResponse], error) {
	if req.Msg.SeriesId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("series id required"))
	}
	if req.Msg.ExcludedDate == nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("excluded date required"))
	}
	if err := req.Msg.ExcludedDate.CheckValid(); err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("invalid excluded date"))
	}

	if err := s.SessionSeries.AddException(req.Msg.SeriesId, req.Msg.ExcludedDate.AsTime()); err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to add series exception")
	}

	return connect.NewResponse(&v1.AddSeriesExceptionResponse{}), nil
}

func (s *SessionSeriesServer) RemoveSeriesException(ctx context.Context, req *connect.Request[v1.RemoveSeriesExceptionRequest]) (*connect.Response[v1.RemoveSeriesExceptionResponse], error) {
	if req.Msg.SeriesId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("series id required"))
	}
	if req.Msg.ExcludedDate == nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("excluded date required"))
	}
	if err := req.Msg.ExcludedDate.CheckValid(); err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("invalid excluded date"))
	}

	if err := s.SessionSeries.RemoveException(req.Msg.SeriesId, req.Msg.ExcludedDate.AsTime()); err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to remove series exception")
	}

	return connect.NewResponse(&v1.RemoveSeriesExceptionResponse{}), nil
}

func sessionSeriesToProto(s *model.SessionSeries) *v1.SessionSeries {
	if s == nil {
		return nil
	}
	proto := &v1.SessionSeries{
		Id:              s.ID,
		CampaignId:      s.CampaignID,
		Title:           s.Title,
		Rrule:           s.RRule,
		StartTime:       s.StartTime,
		SeriesStartDate: timestamppb.New(s.SeriesStartDate),
		CreatedAt:       timestamppb.New(s.CreatedAt),
		UpdatedAt:       timestamppb.New(s.UpdatedAt),
		Timezone:        s.Timezone,
	}
	if s.Description.Valid {
		proto.Description = &s.Description.String
	}
	if s.SeriesEndDate.Valid {
		proto.SeriesEndDate = timestamppb.New(s.SeriesEndDate.Time)
	}
	return proto
}
