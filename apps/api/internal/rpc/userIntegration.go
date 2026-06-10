package rpc

import (
	"context"
	"errors"
	"log/slog"

	"connectrpc.com/connect"
	v1 "github.com/BBruington/party-planner/api/gen/planner/v1"
	"github.com/BBruington/party-planner/api/gen/planner/v1/plannerv1connect"
	"github.com/BBruington/party-planner/api/internal/service"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type UserIntegrationServer struct {
	plannerv1connect.UnimplementedUserIntegrationServiceHandler
	GoogleCalendar *service.GoogleCalendarService
	Log            *slog.Logger
}

func (s *UserIntegrationServer) ConnectGoogleCalendar(ctx context.Context, req *connect.Request[v1.ConnectGoogleCalendarRequest]) (*connect.Response[v1.ConnectGoogleCalendarResponse], error) {
	if req.Msg.UserId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("user_id required"))
	}
	if req.Msg.Code == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("code required"))
	}
	if err := s.GoogleCalendar.Connect(ctx, req.Msg.UserId, req.Msg.Code); err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to connect google calendar")
	}
	return connect.NewResponse(&v1.ConnectGoogleCalendarResponse{}), nil
}

func (s *UserIntegrationServer) DisconnectGoogleCalendar(ctx context.Context, req *connect.Request[v1.DisconnectGoogleCalendarRequest]) (*connect.Response[v1.DisconnectGoogleCalendarResponse], error) {
	if req.Msg.UserId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("user_id required"))
	}
	if err := s.GoogleCalendar.Disconnect(ctx, req.Msg.UserId); err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to disconnect google calendar")
	}
	return connect.NewResponse(&v1.DisconnectGoogleCalendarResponse{}), nil
}

func (s *UserIntegrationServer) GetGoogleCalendarStatus(ctx context.Context, req *connect.Request[v1.GetGoogleCalendarStatusRequest]) (*connect.Response[v1.GetGoogleCalendarStatusResponse], error) {
	if req.Msg.UserId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("user_id required"))
	}
	connected, err := s.GoogleCalendar.GetStatus(ctx, req.Msg.UserId)
	if err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to get google calendar status")
	}
	return connect.NewResponse(&v1.GetGoogleCalendarStatusResponse{Connected: connected}), nil
}

func (s *UserIntegrationServer) CheckCalendarConflicts(ctx context.Context, req *connect.Request[v1.CheckCalendarConflictsRequest]) (*connect.Response[v1.CheckCalendarConflictsResponse], error) {
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign_id required"))
	}
	if req.Msg.StartsAt == nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("starts_at required"))
	}
	if err := req.Msg.StartsAt.CheckValid(); err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("invalid starts_at"))
	}
	conflicts, err := s.GoogleCalendar.CheckConflicts(ctx, req.Msg.CampaignId, req.Msg.StartsAt.AsTime(), req.Msg.DurationMinutes)
	if err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to check calendar conflicts")
	}

	protoConflicts := make([]*v1.CalendarConflict, 0, len(conflicts))
	for _, c := range conflicts {
		slots := make([]*v1.CalendarEventWindow, 0, len(c.BusySlots))
		for _, b := range c.BusySlots {
			slots = append(slots, &v1.CalendarEventWindow{
				Start: timestamppb.New(b.Start),
				End:   timestamppb.New(b.End),
			})
		}
		protoConflicts = append(protoConflicts, &v1.CalendarConflict{
			UserId:               c.UserID,
			CalendarEventWindows: slots,
		})
	}
	return connect.NewResponse(&v1.CheckCalendarConflictsResponse{Conflicts: protoConflicts}), nil
}

func (s *UserIntegrationServer) SyncSessionToCalendar(ctx context.Context, req *connect.Request[v1.SyncSessionToCalendarRequest]) (*connect.Response[v1.SyncSessionToCalendarResponse], error) {
	if req.Msg.UserId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("user_id required"))
	}
	if req.Msg.StartsAt == nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("starts_at required"))
	}
	if err := req.Msg.StartsAt.CheckValid(); err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("invalid starts_at"))
	}
	synced, err := s.GoogleCalendar.SyncSession(ctx, req.Msg.UserId, req.Msg.StartsAt.AsTime(), req.Msg.DurationMinutes, req.Msg.Title, req.Msg.Description)
	if err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to sync session to calendar")
	}
	return connect.NewResponse(&v1.SyncSessionToCalendarResponse{Synced: synced}), nil
}
