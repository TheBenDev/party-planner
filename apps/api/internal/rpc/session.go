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
	if req.Msg.StartsAt != nil {
		if err := req.Msg.StartsAt.CheckValid(); err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("invalid starts_at"))
		}
	}

	session, err := s.Session.Create(&model.CreateSessionRequest{
		CampaignID:  req.Msg.CampaignId,
		Title:       req.Msg.Title,
		Description: sqlNullString(req.Msg.Description),
		StartsAt:    sqlNullableTime(req.Msg.StartsAt),
	})
	if err != nil {
		return nil, mapServiceError(err, "failed to create session")
	}

	return connect.NewResponse(&v1.CreateSessionResponse{
		Session: sessionToProto(session),
	}), nil
}

func (s *SessionServer) GetSession(ctx context.Context, req *connect.Request[v1.GetSessionRequest]) (*connect.Response[v1.GetSessionResponse], error) {
	if req.Msg.Id == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("id required"))
	}

	session, err := s.Session.Get(req.Msg.Id)
	if err != nil {
		return nil, mapServiceError(err, "failed to get session")
	}

	return connect.NewResponse(&v1.GetSessionResponse{
		Session: sessionToProto(session),
	}), nil
}

func (s *SessionServer) ListSessionsByCampaign(ctx context.Context, req *connect.Request[v1.ListSessionsByCampaignRequest]) (*connect.Response[v1.ListSessionsByCampaignResponse], error) {
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}

	sessions, err := s.Session.ListByCampaign(req.Msg.CampaignId)
	if err != nil {
		return nil, mapServiceError(err, "failed to list sessions")
	}

	protoSessions := make([]*v1.Session, len(sessions))
	for i, session := range sessions {
		protoSessions[i] = sessionToProto(session)
	}

	return connect.NewResponse(&v1.ListSessionsByCampaignResponse{
		Sessions: protoSessions,
	}), nil
}

func sessionToProto(session *model.Session) *v1.Session {
	if session == nil {
		return nil
	}
	proto := &v1.Session{
		Id:         session.ID,
		CampaignId: session.CampaignID,
		Title:      session.Title,
		CreatedAt:  timestamppb.New(session.CreatedAt),
		UpdatedAt:  timestamppb.New(session.UpdatedAt),
	}
	if session.Description.Valid {
		proto.Description = &session.Description.String
	}
	if session.StartsAt.Valid {
		proto.StartsAt = timestamppb.New(session.StartsAt.Time)
	}
	return proto
}
