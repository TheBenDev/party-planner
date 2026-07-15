package campaign

import (
	"context"
	"database/sql"
	"errors"
	"log/slog"

	"connectrpc.com/connect"
	"google.golang.org/protobuf/types/known/timestamppb"

	v1 "github.com/BBruington/party-planner/api/gen/planner/v1"
	"github.com/BBruington/party-planner/api/gen/planner/v1/plannerv1connect"
	model "github.com/BBruington/party-planner/api/internal/models"
)

// Server implements the CampaignService ConnectRPC handler.
type Server struct {
	plannerv1connect.UnimplementedCampaignServiceHandler
	Campaign *Service
	Log      *slog.Logger
}

func (s *Server) CreateCampaign(ctx context.Context, req *connect.Request[v1.CreateCampaignRequest]) (*connect.Response[v1.CreateCampaignResponse], error) {
	if req.Msg.UserId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("user id required"))
	}
	if req.Msg.Title == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign title required"))
	}
	campaign, err := s.Campaign.Create(ctx, &model.CreateCampaignRequest{
		UserID:      req.Msg.UserId,
		Title:       req.Msg.Title,
		Description: nullString(req.Msg.Description),
		Tags:        req.Msg.Tags,
	})
	if err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to create campaign")
	}
	return connect.NewResponse(&v1.CreateCampaignResponse{Campaign: toProto(campaign)}), nil
}

func (s *Server) GetCampaign(ctx context.Context, req *connect.Request[v1.GetCampaignRequest]) (*connect.Response[v1.GetCampaignResponse], error) {
	if req.Msg.Id == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}
	campaignAuth, err := s.Campaign.GetByID(ctx, req.Msg.Id)
	if err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to get campaign")
	}
	resp := &v1.GetCampaignResponse{Campaign: toProto(campaignAuth.Campaign)}
	if campaignAuth.ColonyID != nil {
		resp.ColonyId = campaignAuth.ColonyID
	}
	return connect.NewResponse(resp), nil
}

func (s *Server) UpdateCampaign(ctx context.Context, req *connect.Request[v1.UpdateCampaignRequest]) (*connect.Response[v1.UpdateCampaignResponse], error) {
	if req.Msg.Id == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}
	if req.Msg.UserId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("user id required"))
	}
	campaign, err := s.Campaign.Update(ctx, req.Msg.UserId, &model.UpdateCampaignRequest{
		ID:          req.Msg.Id,
		Title:       req.Msg.Title,
		Description: nullString(req.Msg.Description),
		Tags:        req.Msg.Tags,
	})
	if err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to update campaign")
	}
	return connect.NewResponse(&v1.UpdateCampaignResponse{Campaign: toProto(campaign)}), nil
}

func (s *Server) DeleteCampaign(ctx context.Context, req *connect.Request[v1.DeleteCampaignRequest]) (*connect.Response[v1.DeleteCampaignResponse], error) {
	if req.Msg.Id == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}
	if req.Msg.UserId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("user id required"))
	}
	campaign, err := s.Campaign.Delete(ctx, req.Msg.UserId, req.Msg.Id)
	if err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to delete campaign")
	}
	return connect.NewResponse(&v1.DeleteCampaignResponse{Campaign: toProto(campaign)}), nil
}

// ── Proto conversion ──────────────────────────────────────────────────────────

func toProto(c *model.Campaign) *v1.Campaign {
	if c == nil {
		return nil
	}
	proto := &v1.Campaign{
		Id:        c.ID,
		UserId:    c.UserID,
		Title:     c.Title,
		CreatedAt: timestamppb.New(c.CreatedAt),
		UpdatedAt: timestamppb.New(c.UpdatedAt),
		Tags:      c.Tags,
	}
	if c.Description.Valid {
		proto.Description = &c.Description.String
	}
	if c.DeletedAt.Valid {
		proto.DeletedAt = timestamppb.New(c.DeletedAt.Time)
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
	case ErrInvalidUser:
		return connect.NewError(connect.CodeInvalidArgument, err)
	case ErrNotAuthorized:
		return connect.NewError(connect.CodePermissionDenied, err)
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
