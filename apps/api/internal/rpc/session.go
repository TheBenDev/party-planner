package rpc

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"connectrpc.com/connect"
	v1 "github.com/BBruington/party-planner/api/gen/planner/v1"
	"github.com/BBruington/party-planner/api/gen/planner/v1/plannerv1connect"
	model "github.com/BBruington/party-planner/api/internal/models"
	"github.com/BBruington/party-planner/api/internal/service"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type SessionServer struct {
	plannerv1connect.UnimplementedSessionServiceHandler
	Session *service.SessionService
	Log     *slog.Logger
}

func (s *SessionServer) CreateSession(ctx context.Context, req *connect.Request[v1.CreateSessionRequest]) (*connect.Response[v1.CreateSessionResponse], error) {
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}
	if req.Msg.Title == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("title required"))
	}

	var scheduledAt time.Time
	if req.Msg.StartsAt != nil {
		if err := req.Msg.StartsAt.CheckValid(); err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("invalid starts_at"))
		}
		scheduledAt = req.Msg.StartsAt.AsTime()
	}

	durationMinutes := int32(180)
	if req.Msg.DurationMinutes != nil {
		durationMinutes = *req.Msg.DurationMinutes
	}

	session, err := s.Session.Create(ctx, &model.CreateSessionRequest{
		CampaignID:      req.Msg.CampaignId,
		Title:           req.Msg.Title,
		Description:     sqlNullString(req.Msg.Description),
		SeriesID:        sqlNullString(req.Msg.SeriesId),
		ScheduledAt:     scheduledAt,
		DurationMinutes: durationMinutes,
	})
	if err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to create session")
	}

	return connect.NewResponse(&v1.CreateSessionResponse{
		Session: sessionToProto(session),
	}), nil
}

func (s *SessionServer) GetSession(ctx context.Context, req *connect.Request[v1.GetSessionRequest]) (*connect.Response[v1.GetSessionResponse], error) {
	if req.Msg.Id == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("id required"))
	}
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}

	session, err := s.Session.Get(req.Msg.Id, req.Msg.CampaignId)
	if err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to get session")
	}

	return connect.NewResponse(&v1.GetSessionResponse{
		Session: sessionToProto(session),
	}), nil
}

func (s *SessionServer) RemoveSession(ctx context.Context, req *connect.Request[v1.RemoveSessionRequest]) (*connect.Response[v1.RemoveSessionResponse], error) {
	if req.Msg.Id == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("id required"))
	}
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}

	if err := s.Session.Remove(req.Msg.Id, req.Msg.CampaignId); err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to remove session")
	}

	return connect.NewResponse(&v1.RemoveSessionResponse{}), nil
}

func (s *SessionServer) UpdateSession(ctx context.Context, req *connect.Request[v1.UpdateSessionRequest]) (*connect.Response[v1.UpdateSessionResponse], error) {
	if req.Msg.Id == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("id required"))
	}
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}

	session, err := s.Session.Update(ctx, &model.UpdateSessionRequest{
		ID:          req.Msg.Id,
		CampaignID:  req.Msg.CampaignId,
		Title:       sqlNullString(req.Msg.Title),
		Description: sqlNullString(req.Msg.Description),
		Recap:       sqlNullString(req.Msg.Recap),
	})
	if err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to update session")
	}

	return connect.NewResponse(&v1.UpdateSessionResponse{
		Session: sessionToProto(session),
	}), nil
}

func sessionToProto(session *model.Session) *v1.Session {
	if session == nil {
		return nil
	}
	proto := &v1.Session{
		Id:              session.ID,
		CampaignId:      session.CampaignID,
		Title:           session.Title,
		StartsAt:        timestamppb.New(session.ScheduledAt),
		CreatedAt:       timestamppb.New(session.CreatedAt),
		UpdatedAt:       timestamppb.New(session.UpdatedAt),
		DurationMinutes: session.DurationMinutes,
	}
	if session.Description.Valid {
		proto.Description = &session.Description.String
	}
	if session.SeriesID.Valid {
		proto.SeriesId = &session.SeriesID.String
	}
	if session.Recap.Valid {
		proto.Recap = &session.Recap.String
	}
	return proto
}
