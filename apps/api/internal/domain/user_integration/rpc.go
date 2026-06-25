package user_integration

import (
	"context"
	"errors"
	"log/slog"

	"connectrpc.com/connect"
	"google.golang.org/protobuf/types/known/timestamppb"

	v1 "github.com/BBruington/party-planner/api/gen/planner/v1"
	"github.com/BBruington/party-planner/api/gen/planner/v1/plannerv1connect"
)

// Server implements the UserIntegrationService ConnectRPC handler.
type Server struct {
	plannerv1connect.UnimplementedUserIntegrationServiceHandler
	Service *Service
	Log     *slog.Logger
}

func (s *Server) ConnectGoogleCalendar(ctx context.Context, req *connect.Request[v1.ConnectGoogleCalendarRequest]) (*connect.Response[v1.ConnectGoogleCalendarResponse], error) {
	if req.Msg.UserId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("user_id required"))
	}
	if req.Msg.Code == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("code required"))
	}
	if err := s.Service.Connect(ctx, req.Msg.UserId, req.Msg.Code); err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to connect google calendar")
	}
	return connect.NewResponse(&v1.ConnectGoogleCalendarResponse{}), nil
}

func (s *Server) DisconnectGoogleCalendar(ctx context.Context, req *connect.Request[v1.DisconnectGoogleCalendarRequest]) (*connect.Response[v1.DisconnectGoogleCalendarResponse], error) {
	if req.Msg.UserId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("user_id required"))
	}
	if err := s.Service.Disconnect(ctx, req.Msg.UserId); err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to disconnect google calendar")
	}
	return connect.NewResponse(&v1.DisconnectGoogleCalendarResponse{}), nil
}

func (s *Server) GetGoogleCalendarStatus(ctx context.Context, req *connect.Request[v1.GetGoogleCalendarStatusRequest]) (*connect.Response[v1.GetGoogleCalendarStatusResponse], error) {
	if req.Msg.UserId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("user_id required"))
	}
	connected, err := s.Service.GetStatus(ctx, req.Msg.UserId)
	if err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to get google calendar status")
	}
	return connect.NewResponse(&v1.GetGoogleCalendarStatusResponse{Connected: connected}), nil
}

func (s *Server) CheckCalendarConflicts(ctx context.Context, req *connect.Request[v1.CheckCalendarConflictsRequest]) (*connect.Response[v1.CheckCalendarConflictsResponse], error) {
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign_id required"))
	}
	if req.Msg.StartsAt == nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("starts_at required"))
	}
	if err := req.Msg.StartsAt.CheckValid(); err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("invalid starts_at"))
	}
	conflicts, err := s.Service.CheckConflicts(ctx, req.Msg.CampaignId, req.Msg.StartsAt.AsTime(), req.Msg.DurationMinutes)
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

// ── Error mapping ─────────────────────────────────────────────────────────────

func mapServiceError(ctx context.Context, log *slog.Logger, err error, fallback string) error {
	switch err {
	case ErrUserIntegrationNotFound:
		return connect.NewError(connect.CodeFailedPrecondition, err)
	case ErrInsufficientCalendarScope:
		return connect.NewError(connect.CodeFailedPrecondition, err)
	case ErrSeriesMissingStartTime:
		return connect.NewError(connect.CodeFailedPrecondition, err)
	default:
		log.ErrorContext(ctx, fallback, "error", err)
		return connect.NewError(connect.CodeInternal, errors.New(fallback))
	}
}
