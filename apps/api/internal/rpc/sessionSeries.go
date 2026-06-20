package rpc

import (
	"context"
	"database/sql"
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

const (
	defaultDurationMinutes = int32(180)
	minDurationMinutes     = int32(15)
	maxDurationMinutes     = int32(720)
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

	if _, err := time.LoadLocation(req.Msg.Timezone); err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("invalid timezone"))
	}

	durationMinutes := defaultDurationMinutes
	if req.Msg.DurationMinutes != nil {
		durationMinutes = *req.Msg.DurationMinutes
		if durationMinutes < minDurationMinutes || durationMinutes > maxDurationMinutes {
			return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("duration minutes must be between 15 and 720"))
		}
	}

	series, err := s.SessionSeries.Create(ctx, &model.CreateSessionSeriesRequest{
		CampaignID:      req.Msg.CampaignId,
		Title:           req.Msg.Title,
		Description:     sqlNullString(req.Msg.Description),
		RRule:           sqlNullString(req.Msg.Rrule),
		StartTime:       sql.NullString{String: req.Msg.StartTime, Valid: true},
		SeriesStartDate: req.Msg.SeriesStartDate.AsTime().UTC(),
		SeriesEndDate:   sqlNullableTime(req.Msg.SeriesEndDate),
		Timezone:        req.Msg.Timezone,
		DurationMinutes: durationMinutes,
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

	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}

	series, err := s.SessionSeries.Get(req.Msg.Id, req.Msg.CampaignId)
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

	protoSeries := make([]*v1.SessionSeriesWithDetails, len(seriesList))
	for i, sd := range seriesList {
		protoSessions := make([]*v1.Session, len(sd.Sessions))
		for j, sess := range sd.Sessions {
			protoSessions[j] = sessionToProto(sess)
		}
		protoExceptions := make([]*timestamppb.Timestamp, len(sd.Exceptions))
		for j, exc := range sd.Exceptions {
			protoExceptions[j] = timestamppb.New(exc)
		}
		protoSeries[i] = &v1.SessionSeriesWithDetails{
			Series:     sessionSeriesToProto(sd.Series),
			Sessions:   protoSessions,
			Exceptions: protoExceptions,
		}
	}

	return connect.NewResponse(&v1.ListSessionSeriesByCampaignResponse{
		Series: protoSeries,
	}), nil
}

func (s *SessionSeriesServer) UpdateSessionSeries(ctx context.Context, req *connect.Request[v1.UpdateSessionSeriesRequest]) (*connect.Response[v1.UpdateSessionSeriesResponse], error) {
	if req.Msg.Id == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("id required"))
	}
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}
	if req.Msg.SeriesEndDate != nil {
		if err := req.Msg.SeriesEndDate.CheckValid(); err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("invalid series end date"))
		}
	}

	series, err := s.SessionSeries.Update(&model.UpdateSessionSeriesRequest{
		ID:            req.Msg.Id,
		CampaignID:    req.Msg.CampaignId,
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
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}

	if err := s.SessionSeries.Remove(ctx, req.Msg.Id, req.Msg.CampaignId, req.Msg.UserId); err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to remove session series")
	}

	return connect.NewResponse(&v1.RemoveSessionSeriesResponse{}), nil
}

func (s *SessionSeriesServer) ExcludeSessionFromSeries(ctx context.Context, req *connect.Request[v1.ExcludeSessionFromSeriesRequest]) (*connect.Response[v1.ExcludeSessionFromSeriesResponse], error) {
	if req.Msg.SeriesId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("series id required"))
	}
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}
	if req.Msg.ExcludedDate == nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("excluded date required"))
	}
	if err := req.Msg.ExcludedDate.CheckValid(); err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("invalid excluded date"))
	}

	if err := s.SessionSeries.ExcludeFromSeries(ctx, req.Msg.SeriesId, req.Msg.CampaignId, req.Msg.ExcludedDate.AsTime()); err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to exclude session from series")
	}

	return connect.NewResponse(&v1.ExcludeSessionFromSeriesResponse{}), nil
}

func (s *SessionSeriesServer) RemoveSeriesException(ctx context.Context, req *connect.Request[v1.RemoveSeriesExceptionRequest]) (*connect.Response[v1.RemoveSeriesExceptionResponse], error) {
	if req.Msg.SeriesId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("series id required"))
	}
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}
	if req.Msg.ExcludedDate == nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("excluded date required"))
	}
	if err := req.Msg.ExcludedDate.CheckValid(); err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("invalid excluded date"))
	}

	if err := s.SessionSeries.RemoveException(req.Msg.SeriesId, req.Msg.CampaignId, req.Msg.ExcludedDate.AsTime()); err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to remove series exception")
	}

	return connect.NewResponse(&v1.RemoveSeriesExceptionResponse{}), nil
}

func (s *SessionSeriesServer) AddToGoogleCalendar(ctx context.Context, req *connect.Request[v1.AddToGoogleCalendarRequest]) (*connect.Response[v1.AddToGoogleCalendarResponse], error) {
	if req.Msg.SeriesId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("series id required"))
	}
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}
	if req.Msg.UserId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("user id required"))
	}

	series, err := s.SessionSeries.AddToGoogleCalendar(ctx, req.Msg.SeriesId, req.Msg.CampaignId, req.Msg.UserId)
	if err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to add series to google calendar")
	}
	return connect.NewResponse(&v1.AddToGoogleCalendarResponse{
		Series: sessionSeriesToProto(series),
	}), nil
}

func (s *SessionSeriesServer) RemoveFromGoogleCalendar(ctx context.Context, req *connect.Request[v1.RemoveFromGoogleCalendarRequest]) (*connect.Response[v1.RemoveFromGoogleCalendarResponse], error) {
	if req.Msg.SeriesId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("series id required"))
	}
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}
	if req.Msg.UserId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("user id required"))
	}

	series, err := s.SessionSeries.RemoveFromGoogleCalendar(ctx, req.Msg.SeriesId, req.Msg.CampaignId, req.Msg.UserId)
	if err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to remove series from google calendar")
	}
	return connect.NewResponse(&v1.RemoveFromGoogleCalendarResponse{
		Series: sessionSeriesToProto(series),
	}), nil
}

func (s *SessionSeriesServer) AnnounceToDiscord(ctx context.Context, req *connect.Request[v1.AnnounceToDiscordRequest]) (*connect.Response[v1.AnnounceToDiscordResponse], error) {
	if req.Msg.SeriesId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("series id required"))
	}
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}

	series, err := s.SessionSeries.AnnounceToDiscord(ctx, req.Msg.SeriesId, req.Msg.CampaignId)
	if err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to announce series to discord")
	}

	return connect.NewResponse(&v1.AnnounceToDiscordResponse{
		Series: sessionSeriesToProto(series),
	}), nil
}

func (s *SessionSeriesServer) GetDiscordEvent(ctx context.Context, req *connect.Request[v1.GetDiscordEventRequest]) (*connect.Response[v1.GetDiscordEventResponse], error) {
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}
	if req.Msg.SeriesId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("series id required"))
	}
	if req.Msg.DiscordEventId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("discord event id required"))
	}

	info, err := s.SessionSeries.GetDiscordEvent(ctx, req.Msg.CampaignId, req.Msg.SeriesId, req.Msg.DiscordEventId)
	if err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to get discord event")
	}

	protoEvent := &v1.DiscordEventInfo{
		GuildId:   info.GuildID,
		EventId:   info.EventID,
		Name:      info.Name,
		StartTime: timestamppb.New(info.StartTime),
		Status:    int32(info.Status),
	}
	if info.EndTime != nil {
		protoEvent.EndTime = timestamppb.New(*info.EndTime)
	}

	return connect.NewResponse(&v1.GetDiscordEventResponse{
		Event: protoEvent,
	}), nil
}

func (s *SessionSeriesServer) GetSeriesPoll(ctx context.Context, req *connect.Request[v1.GetSeriesPollRequest]) (*connect.Response[v1.GetSeriesPollResponse], error) {
	if req.Msg.SeriesId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("series id required"))
	}
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}

	poll, err := s.SessionSeries.GetPoll(ctx, req.Msg.SeriesId, req.Msg.CampaignId)
	if err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to get series poll")
	}

	return connect.NewResponse(&v1.GetSeriesPollResponse{
		Poll: pollToProto(poll),
	}), nil
}

func (s *SessionSeriesServer) PollSeries(ctx context.Context, req *connect.Request[v1.PollSeriesRequest]) (*connect.Response[v1.PollSeriesResponse], error) {
	if req.Msg.SeriesId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("series id required"))
	}
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}
	if len(req.Msg.Options) == 0 {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("at least one option required"))
	}

	options := make([]time.Time, len(req.Msg.Options))
	for i, ts := range req.Msg.Options {
		if err := ts.CheckValid(); err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("invalid option timestamp"))
		}
		options[i] = ts.AsTime()
	}

	if err := s.SessionSeries.CreateDiscordPoll(ctx, req.Msg.SeriesId, req.Msg.CampaignId, options); err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to create series poll")
	}

	return connect.NewResponse(&v1.PollSeriesResponse{}), nil
}

func pollToProto(p *model.Poll) *v1.Poll {
	if p == nil {
		return nil
	}
	answers := make([]*v1.PollAnswer, len(p.Answers))
	for i, a := range p.Answers {
		answers[i] = &v1.PollAnswer{
			Text:      a.Text,
			VoteCount: a.VoteCount,
		}
	}
	return &v1.Poll{
		Question:    p.Question,
		Answers:     answers,
		IsFinalized: p.IsFinalized,
	}
}

func sessionSeriesToProto(s *model.SessionSeries) *v1.SessionSeries {
	if s == nil {
		return nil
	}
	proto := &v1.SessionSeries{
		Id:              s.ID,
		CampaignId:      s.CampaignID,
		Title:           s.Title,
		Rrule:           s.RRule.String,
		StartTime:       s.StartTime.String,
		SeriesStartDate: timestamppb.New(s.SeriesStartDate),
		CreatedAt:       timestamppb.New(s.CreatedAt),
		UpdatedAt:       timestamppb.New(s.UpdatedAt),
		Timezone:        s.Timezone,
		DurationMinutes: s.DurationMinutes,
	}
	if s.Description.Valid {
		proto.Description = &s.Description.String
	}
	if s.SeriesEndDate.Valid {
		proto.SeriesEndDate = timestamppb.New(s.SeriesEndDate.Time)
	}
	if s.DiscordEventID.Valid {
		proto.DiscordEventId = &s.DiscordEventID.String
	}
	if s.GoogleCalendarEventID.Valid {
		proto.GoogleCalendarEventId = &s.GoogleCalendarEventID.String
	}
	return proto
}
