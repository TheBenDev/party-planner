package session_series

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
	"google.golang.org/protobuf/types/known/timestamppb"
)

const (
	defaultDurationMinutes = int32(180)
	minDurationMinutes     = int32(15)
	maxDurationMinutes     = int32(720)
)

// SessionSeriesServicer defines the operations the RPC layer depends on.
type SessionSeriesServicer interface {
	Create(ctx context.Context, req *model.CreateSessionSeriesRequest) (*model.SessionSeries, error)
	Get(ctx context.Context, id string, campaignID string) (*model.SessionSeries, error)
	ListByCampaign(ctx context.Context, campaignID string) ([]*model.SessionSeriesWithDetails, error)
	Update(ctx context.Context, req *model.UpdateSessionSeriesRequest) (*model.SessionSeries, error)
	Remove(ctx context.Context, id string, campaignID string, userID string) error
	ExcludeFromSeries(ctx context.Context, seriesID string, campaignID string, excludedDate time.Time) error
	RemoveException(ctx context.Context, seriesID string, campaignID string, excludedDate time.Time) error
	AddToGoogleCalendar(ctx context.Context, seriesID string, campaignID string, userID string) (*model.SessionSeries, error)
	RemoveFromGoogleCalendar(ctx context.Context, seriesID string, campaignID string, userID string) (*model.SessionSeries, error)
	CreateDiscordEvent(ctx context.Context, seriesID string, campaignID string) (*model.SessionSeries, error)
	GetDiscordEvent(ctx context.Context, campaignID string, seriesID string, discordEventID string) (*model.DiscordEventInfo, error)
	GetPoll(ctx context.Context, seriesID string, campaignID string) (*model.Poll, error)
	CreateDiscordPoll(ctx context.Context, seriesID string, campaignID string, options []time.Time) error
}

// Server implements the SessionSeriesService ConnectRPC handler.
type Server struct {
	plannerv1connect.UnimplementedSessionSeriesServiceHandler
	SessionSeries SessionSeriesServicer
	Log           *slog.Logger
}

func (s *Server) CreateSessionSeries(ctx context.Context, req *connect.Request[v1.CreateSessionSeriesRequest]) (*connect.Response[v1.CreateSessionSeriesResponse], error) {
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
		Description:     nullString(req.Msg.Description),
		RRule:           nullString(req.Msg.Rrule),
		StartTime:       sql.NullString{String: req.Msg.StartTime, Valid: true},
		SeriesStartDate: req.Msg.SeriesStartDate.AsTime().UTC(),
		SeriesEndDate:   nullableTime(req.Msg.SeriesEndDate),
		Timezone:        req.Msg.Timezone,
		DurationMinutes: durationMinutes,
	})
	if err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to create session series")
	}
	return connect.NewResponse(&v1.CreateSessionSeriesResponse{Series: sessionSeriesToProto(series)}), nil
}

func (s *Server) GetSessionSeries(ctx context.Context, req *connect.Request[v1.GetSessionSeriesRequest]) (*connect.Response[v1.GetSessionSeriesResponse], error) {
	if req.Msg.Id == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("id required"))
	}
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}
	series, err := s.SessionSeries.Get(ctx, req.Msg.Id, req.Msg.CampaignId)
	if err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to get session series")
	}
	return connect.NewResponse(&v1.GetSessionSeriesResponse{Series: sessionSeriesToProto(series)}), nil
}

func (s *Server) ListSessionSeriesByCampaign(ctx context.Context, req *connect.Request[v1.ListSessionSeriesByCampaignRequest]) (*connect.Response[v1.ListSessionSeriesByCampaignResponse], error) {
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}
	seriesList, err := s.SessionSeries.ListByCampaign(ctx, req.Msg.CampaignId)
	if err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to list session series")
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
	return connect.NewResponse(&v1.ListSessionSeriesByCampaignResponse{Series: protoSeries}), nil
}

func (s *Server) UpdateSessionSeries(ctx context.Context, req *connect.Request[v1.UpdateSessionSeriesRequest]) (*connect.Response[v1.UpdateSessionSeriesResponse], error) {
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
	series, err := s.SessionSeries.Update(ctx, &model.UpdateSessionSeriesRequest{
		ID:            req.Msg.Id,
		CampaignID:    req.Msg.CampaignId,
		Title:         req.Msg.Title,
		Description:   nullString(req.Msg.Description),
		RRule:         req.Msg.Rrule,
		StartTime:     req.Msg.StartTime,
		SeriesEndDate: nullableTime(req.Msg.SeriesEndDate),
		Timezone:      req.Msg.Timezone,
	})
	if err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to update session series")
	}
	return connect.NewResponse(&v1.UpdateSessionSeriesResponse{Series: sessionSeriesToProto(series)}), nil
}

func (s *Server) RemoveSessionSeries(ctx context.Context, req *connect.Request[v1.RemoveSessionSeriesRequest]) (*connect.Response[v1.RemoveSessionSeriesResponse], error) {
	if req.Msg.Id == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("id required"))
	}
	if req.Msg.UserId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("user id required"))
	}
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}
	if err := s.SessionSeries.Remove(ctx, req.Msg.Id, req.Msg.CampaignId, req.Msg.UserId); err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to remove session series")
	}
	return connect.NewResponse(&v1.RemoveSessionSeriesResponse{}), nil
}

func (s *Server) ExcludeSessionFromSeries(ctx context.Context, req *connect.Request[v1.ExcludeSessionFromSeriesRequest]) (*connect.Response[v1.ExcludeSessionFromSeriesResponse], error) {
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
		return nil, mapError(ctx, s.Log, err, "failed to exclude session from series")
	}
	return connect.NewResponse(&v1.ExcludeSessionFromSeriesResponse{}), nil
}

func (s *Server) RemoveSeriesException(ctx context.Context, req *connect.Request[v1.RemoveSeriesExceptionRequest]) (*connect.Response[v1.RemoveSeriesExceptionResponse], error) {
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
	if err := s.SessionSeries.RemoveException(ctx, req.Msg.SeriesId, req.Msg.CampaignId, req.Msg.ExcludedDate.AsTime()); err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to remove series exception")
	}
	return connect.NewResponse(&v1.RemoveSeriesExceptionResponse{}), nil
}

func (s *Server) AddToGoogleCalendar(ctx context.Context, req *connect.Request[v1.AddToGoogleCalendarRequest]) (*connect.Response[v1.AddToGoogleCalendarResponse], error) {
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
		return nil, mapError(ctx, s.Log, err, "failed to add series to google calendar")
	}
	return connect.NewResponse(&v1.AddToGoogleCalendarResponse{Series: sessionSeriesToProto(series)}), nil
}

func (s *Server) RemoveFromGoogleCalendar(ctx context.Context, req *connect.Request[v1.RemoveFromGoogleCalendarRequest]) (*connect.Response[v1.RemoveFromGoogleCalendarResponse], error) {
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
		return nil, mapError(ctx, s.Log, err, "failed to remove series from google calendar")
	}
	return connect.NewResponse(&v1.RemoveFromGoogleCalendarResponse{Series: sessionSeriesToProto(series)}), nil
}

func (s *Server) CreateDiscordEvent(ctx context.Context, req *connect.Request[v1.CreateDiscordEventRequest]) (*connect.Response[v1.CreateDiscordEventResponse], error) {
	if req.Msg.SeriesId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("series id required"))
	}
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}
	series, err := s.SessionSeries.CreateDiscordEvent(ctx, req.Msg.SeriesId, req.Msg.CampaignId)
	if err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to create discord event for series")
	}
	return connect.NewResponse(&v1.CreateDiscordEventResponse{Series: sessionSeriesToProto(series)}), nil
}

func (s *Server) GetDiscordEvent(ctx context.Context, req *connect.Request[v1.GetDiscordEventRequest]) (*connect.Response[v1.GetDiscordEventResponse], error) {
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
		return nil, mapError(ctx, s.Log, err, "failed to get discord event")
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
	return connect.NewResponse(&v1.GetDiscordEventResponse{Event: protoEvent}), nil
}

func (s *Server) GetSeriesPoll(ctx context.Context, req *connect.Request[v1.GetSeriesPollRequest]) (*connect.Response[v1.GetSeriesPollResponse], error) {
	if req.Msg.SeriesId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("series id required"))
	}
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}
	poll, err := s.SessionSeries.GetPoll(ctx, req.Msg.SeriesId, req.Msg.CampaignId)
	if err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to get series poll")
	}
	return connect.NewResponse(&v1.GetSeriesPollResponse{Poll: pollToProto(poll)}), nil
}

func (s *Server) PollSeries(ctx context.Context, req *connect.Request[v1.PollSeriesRequest]) (*connect.Response[v1.PollSeriesResponse], error) {
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
		return nil, mapError(ctx, s.Log, err, "failed to create series poll")
	}
	return connect.NewResponse(&v1.PollSeriesResponse{}), nil
}

// ── Proto converters ──────────────────────────────────────────────────────────

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

func sessionToProto(s *model.Session) *v1.Session {
	if s == nil {
		return nil
	}
	proto := &v1.Session{
		Id:         s.ID,
		CampaignId: s.CampaignID,
		Title:      s.Title,
		CreatedAt:  timestamppb.New(s.CreatedAt),
		UpdatedAt:  timestamppb.New(s.UpdatedAt),
	}
	if s.Description.Valid {
		proto.Description = &s.Description.String
	}
	if s.SeriesID.Valid {
		proto.SeriesId = &s.SeriesID.String
	}
	if s.Recap.Valid {
		proto.Recap = &s.Recap.String
	}
	proto.StartsAt = timestamppb.New(s.ScheduledAt)
	proto.DurationMinutes = s.DurationMinutes
	return proto
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

// ── Error mapping ─────────────────────────────────────────────────────────────

func mapError(ctx context.Context, log *slog.Logger, err error, fallback string) error {
	switch {
	case errors.Is(err, ErrSessionSeriesNotFound):
		return connect.NewError(connect.CodeNotFound, err)
	case errors.Is(err, ErrSessionSeriesAlreadyExists):
		return connect.NewError(connect.CodeAlreadyExists, err)
	case errors.Is(err, ErrSessionSeriesInvalidCampaign):
		return connect.NewError(connect.CodeInvalidArgument, err)
	case errors.Is(err, ErrSeriesExceptionAlreadyExists):
		return connect.NewError(connect.CodeAlreadyExists, err)
	case errors.Is(err, ErrSeriesMissingStartTime):
		return connect.NewError(connect.CodeFailedPrecondition, err)
	case errors.Is(err, ErrSeriesDiscordIntegrationNotFound):
		return connect.NewError(connect.CodeFailedPrecondition, err)
	case errors.Is(err, ErrSeriesPollNotFound):
		return connect.NewError(connect.CodeNotFound, err)
	case errors.Is(err, ErrSeriesAlreadyPolling):
		return connect.NewError(connect.CodeAlreadyExists, err)
	case errors.Is(err, ErrSeriesDiscordEventAlreadyExists):
		return connect.NewError(connect.CodeAlreadyExists, err)
	case errors.Is(err, ErrSeriesGoogleCalendarAlreadyExists):
		return connect.NewError(connect.CodeAlreadyExists, err)
	case errors.Is(err, ErrSeriesGoogleCalendarNotFound):
		return connect.NewError(connect.CodeNotFound, err)
	case errors.Is(err, ErrSeriesGoogleCalendarIntegrationNotSet):
		return connect.NewError(connect.CodeFailedPrecondition, err)
	case errors.Is(err, ErrDiscordEventNotFound):
		return connect.NewError(connect.CodeNotFound, err)
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

func nullableTime(ts *timestamppb.Timestamp) sql.NullTime {
	if ts == nil {
		return sql.NullTime{}
	}
	return sql.NullTime{Time: ts.AsTime(), Valid: true}
}
