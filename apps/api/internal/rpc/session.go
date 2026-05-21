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

func (s *SessionServer) AnnounceSession(ctx context.Context, req *connect.Request[v1.AnnounceSessionRequest]) (*connect.Response[v1.AnnounceSessionResponse], error) {
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}
	if req.Msg.SessionId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("session id required"))
	}

	err := s.Session.Announce(ctx, req.Msg.SessionId, req.Msg.CampaignId)
	if err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to announce session to discord")
	}

	return connect.NewResponse(&v1.AnnounceSessionResponse{}), nil
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

	sessionStatus, err := protoToSessionStatus(req.Msg.Status)
	if err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to create session")
	}

	session, err := s.Session.Create(&model.CreateSessionRequest{
		CampaignID:  req.Msg.CampaignId,
		Title:       req.Msg.Title,
		Description: sqlNullString(req.Msg.Description),
		Status:      sessionStatus,
		StartsAt:    sqlNullableTime(req.Msg.StartsAt),
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

	session, err := s.Session.Get(req.Msg.Id)
	if err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to get session")
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
		return nil, mapServiceError(ctx, s.Log, err, "failed to list sessions")
	}

	protoSessions := make([]*v1.Session, len(sessions))
	for i, session := range sessions {
		protoSessions[i] = sessionToProto(session)
	}

	return connect.NewResponse(&v1.ListSessionsByCampaignResponse{
		Sessions: protoSessions,
	}), nil
}

func (s *SessionServer) RemoveSession(ctx context.Context, req *connect.Request[v1.RemoveSessionRequest]) (*connect.Response[v1.RemoveSessionResponse], error) {
	if req.Msg.Id == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("id required"))
	}

	if err := s.Session.Remove(req.Msg.Id); err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to remove session")
	}

	return connect.NewResponse(&v1.RemoveSessionResponse{}), nil
}

func (s *SessionServer) UpdateSession(ctx context.Context, req *connect.Request[v1.UpdateSessionRequest]) (*connect.Response[v1.UpdateSessionResponse], error) {
	if req.Msg.Id == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("id required"))
	}

	if req.Msg.StartsAt != nil {
		if err := req.Msg.StartsAt.CheckValid(); err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("invalid starts_at"))
		}
	}

	sessionStatus, err := protoToSessionStatus(req.Msg.Status)
	if err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to update session")
	}

	session, err := s.Session.Update(&model.UpdateSessionRequest{
		ID:          req.Msg.Id,
		Title:       sqlNullString(req.Msg.Title),
		Description: sqlNullString(req.Msg.Description),
		Status:      sessionStatus,
		StartsAt:    sqlNullableTime(req.Msg.StartsAt),
	})

	if err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to update session")
	}

	return connect.NewResponse(&v1.UpdateSessionResponse{
		Session: sessionToProto(session),
	}), nil
}

func protoToSessionStatus(s v1.SessionStatus) (model.SessionStatus, error) {
	switch s {
	case v1.SessionStatus_SESSION_STATUS_CONFIRMED:
		return model.SessionStatusConfirmed, nil
	case v1.SessionStatus_SESSION_STATUS_DRAFT:
		return model.SessionStatusDraft, nil
	case v1.SessionStatus_SESSION_STATUS_POLLING:
		return model.SessionStatusPolling, nil
	default:
		return "", errors.New("invalid session status")
	}
}

func sessionStatusToProto(s model.SessionStatus) v1.SessionStatus {
	switch s {
	case model.SessionStatusConfirmed:
		return v1.SessionStatus_SESSION_STATUS_CONFIRMED
	case model.SessionStatusDraft:
		return v1.SessionStatus_SESSION_STATUS_DRAFT
	case model.SessionStatusPolling:
		return v1.SessionStatus_SESSION_STATUS_POLLING
	default:
		return v1.SessionStatus_SESSION_STATUS_UNSPECIFIED
	}
}

func sessionToProto(session *model.Session) *v1.Session {
	if session == nil {
		return nil
	}
	proto := &v1.Session{
		Id:         session.ID,
		CampaignId: session.CampaignID,
		Status:     sessionStatusToProto(session.Status),
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
