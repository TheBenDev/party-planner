package session

import (
	"context"
	"database/sql"
	"errors"
	"log/slog"
	"time"

	"connectrpc.com/connect"
	"google.golang.org/protobuf/types/known/timestamppb"

	v1 "github.com/BBruington/party-planner/api/gen/planner/v1"
	"github.com/BBruington/party-planner/api/gen/planner/v1/plannerv1connect"
	model "github.com/BBruington/party-planner/api/internal/models"
)

// Server implements the SessionService ConnectRPC handler.
type Server struct {
	plannerv1connect.UnimplementedSessionServiceHandler
	Session *Service
	Log     *slog.Logger
}

func (s *Server) CreateSession(ctx context.Context, req *connect.Request[v1.CreateSessionRequest]) (*connect.Response[v1.CreateSessionResponse], error) {
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
		Description:     nullString(req.Msg.Description),
		SeriesID:        nullString(req.Msg.SeriesId),
		ScheduledAt:     scheduledAt,
		DurationMinutes: durationMinutes,
	})
	if err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to create session")
	}

	return connect.NewResponse(&v1.CreateSessionResponse{
		Session: toProto(session),
	}), nil
}

func (s *Server) GetSession(ctx context.Context, req *connect.Request[v1.GetSessionRequest]) (*connect.Response[v1.GetSessionResponse], error) {
	if req.Msg.Id == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("id required"))
	}
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}

	session, err := s.Session.GetByID(ctx, req.Msg.Id, req.Msg.CampaignId)
	if err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to get session")
	}

	return connect.NewResponse(&v1.GetSessionResponse{
		Session: toProto(session),
	}), nil
}

func (s *Server) RemoveSession(ctx context.Context, req *connect.Request[v1.RemoveSessionRequest]) (*connect.Response[v1.RemoveSessionResponse], error) {
	if req.Msg.Id == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("id required"))
	}
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}

	if err := s.Session.Remove(ctx, req.Msg.Id, req.Msg.CampaignId); err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to remove session")
	}

	return connect.NewResponse(&v1.RemoveSessionResponse{}), nil
}

func (s *Server) UpdateSession(ctx context.Context, req *connect.Request[v1.UpdateSessionRequest]) (*connect.Response[v1.UpdateSessionResponse], error) {
	if req.Msg.Id == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("id required"))
	}
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}

	session, err := s.Session.Update(ctx, &model.UpdateSessionRequest{
		ID:          req.Msg.Id,
		CampaignID:  req.Msg.CampaignId,
		Title:       nullString(req.Msg.Title),
		Description: nullString(req.Msg.Description),
		Recap:       nullString(req.Msg.Recap),
	})
	if err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to update session")
	}

	return connect.NewResponse(&v1.UpdateSessionResponse{
		Session: toProto(session),
	}), nil
}

// ── Proto conversion ──────────────────────────────────────────────────────────

func toProto(session *model.Session) *v1.Session {
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

func nullString(s *string) sql.NullString {
	if s == nil {
		return sql.NullString{}
	}
	return sql.NullString{String: *s, Valid: true}
}
