package rpc

import (
	"context"
	"errors"
	"fmt"
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

	if req.Msg.OriginalStartsAt != nil {
		if err := req.Msg.OriginalStartsAt.CheckValid(); err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("invalid original_starts_at"))
		}
	}

	if (req.Msg.SeriesId != nil && *req.Msg.SeriesId != "") != (req.Msg.OriginalStartsAt != nil) {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("series_id and original_starts_at must be provided together"))
	}

	durationMinutes := int32(180)
	if req.Msg.DurationMinutes != nil {
		durationMinutes = *req.Msg.DurationMinutes
	}

	session, err := s.Session.Create(ctx, &model.CreateSessionRequest{
		CampaignID:       req.Msg.CampaignId,
		Title:            req.Msg.Title,
		Description:      sqlNullString(req.Msg.Description),
		SeriesID:         sqlNullString(req.Msg.SeriesId),
		OriginalStartsAt: sqlNullableTime(req.Msg.OriginalStartsAt),
		Status:           sessionStatus,
		StartsAt:         sqlNullableTime(req.Msg.StartsAt),
		DurationMinutes:  durationMinutes,
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

func (s *SessionServer) GetSessionPoll(ctx context.Context, req *connect.Request[v1.GetSessionPollRequest]) (*connect.Response[v1.GetSessionPollResponse], error) {
	if req.Msg.SessionId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("session id required"))
	}
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}

	poll, err := s.Session.GetPoll(ctx, req.Msg.SessionId, req.Msg.CampaignId)
	if err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to get session poll")
	}

	protoAnswers := make([]*v1.PollAnswer, len(poll.Answers))
	for i, a := range poll.Answers {
		protoAnswers[i] = &v1.PollAnswer{
			Text:      a.Text,
			VoteCount: a.VoteCount,
		}
	}

	return connect.NewResponse(&v1.GetSessionPollResponse{
		Poll: &v1.Poll{
			Question:    poll.Question,
			Answers:     protoAnswers,
			IsFinalized: poll.IsFinalized,
		},
	}), nil
}

func (s *SessionServer) ListOneOffSessionsByCampaign(ctx context.Context, req *connect.Request[v1.ListOneOffSessionsByCampaignRequest]) (*connect.Response[v1.ListOneOffSessionsByCampaignResponse], error) {
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}

	sessions, err := s.Session.ListOneOffByCampaign(req.Msg.CampaignId)
	if err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to list one-off sessions")
	}

	protoSessions := make([]*v1.Session, len(sessions))
	for i, session := range sessions {
		protoSessions[i] = sessionToProto(session)
	}

	return connect.NewResponse(&v1.ListOneOffSessionsByCampaignResponse{
		Sessions: protoSessions,
	}), nil
}

func (s *SessionServer) PollSession(ctx context.Context, req *connect.Request[v1.PollSessionRequest]) (*connect.Response[v1.PollSessionResponse], error) {
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}
	if req.Msg.SessionId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("session id required"))
	}
	if len(req.Msg.Options) == 0 {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("at least one poll option required"))
	}

	options := make([]time.Time, 0, len(req.Msg.Options))

	for i, ts := range req.Msg.Options {
		if err := ts.CheckValid(); err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("invalid timestamp at options[%d]: %w", i, err))
		}
		options = append(options, ts.AsTime())
	}

	if err := s.Session.Poll(ctx, req.Msg.SessionId, req.Msg.CampaignId, options); err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to poll session")
	}

	return connect.NewResponse(&v1.PollSessionResponse{}), nil
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

	if req.Msg.StartsAt != nil {
		if err := req.Msg.StartsAt.CheckValid(); err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("invalid starts_at"))
		}
	}

	sessionStatus, err := protoToSessionStatus(req.Msg.Status)
	if err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to update session")
	}

	session, err := s.Session.Update(ctx, &model.UpdateSessionRequest{
		ID:          req.Msg.Id,
		CampaignID:  req.Msg.CampaignId,
		Title:       sqlNullString(req.Msg.Title),
		Description: sqlNullString(req.Msg.Description),
		Status:      sessionStatus,
		StartsAt:    sqlNullableTime(req.Msg.StartsAt),
		Recap:       sqlNullString(req.Msg.Recap),
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
		Id:              session.ID,
		CampaignId:      session.CampaignID,
		Status:          sessionStatusToProto(session.Status),
		Title:           session.Title,
		CreatedAt:       timestamppb.New(session.CreatedAt),
		UpdatedAt:       timestamppb.New(session.UpdatedAt),
		DurationMinutes: session.DurationMinutes,
	}
	if session.Description.Valid {
		proto.Description = &session.Description.String
	}
	if session.PollID.Valid {
		proto.PollId = &session.PollID.String
	}
	if session.StartsAt.Valid {
		proto.StartsAt = timestamppb.New(session.StartsAt.Time)
	}
	if session.AnnouncedAt.Valid {
		proto.AnnouncedAt = timestamppb.New(session.AnnouncedAt.Time)
	}
	if session.SeriesID.Valid {
		proto.SeriesId = &session.SeriesID.String
	}
	if session.OriginalStartsAt.Valid {
		proto.OriginalStartsAt = timestamppb.New(session.OriginalStartsAt.Time)
	}
	if session.DiscordEventID.Valid {
		proto.DiscordEventId = &session.DiscordEventID.String
	}
	if session.Recap.Valid {
		proto.Recap = &session.Recap.String
	}
	return proto
}
