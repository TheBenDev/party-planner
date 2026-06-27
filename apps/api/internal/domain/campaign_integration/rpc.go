package campaign_integration

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"

	"connectrpc.com/connect"
	v1 "github.com/BBruington/party-planner/api/gen/planner/v1"
	"github.com/BBruington/party-planner/api/gen/planner/v1/plannerv1connect"
	model "github.com/BBruington/party-planner/api/internal/models"
	"google.golang.org/protobuf/types/known/structpb"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// Servicer interface defines service operations for RPC
type Servicer interface {
	GetByCampaign(ctx context.Context, campaignID string, source model.IntegrationSource) (*model.CampaignIntegration, error)
	CreateDiscord(ctx context.Context, req *model.CreateDiscordCampaignIntegrationRequest) (*model.CampaignIntegration, error)
	ListByCampaign(ctx context.Context, campaignID string) ([]*model.CampaignIntegration, error)
	Update(ctx context.Context, req *model.UpdateCampaignIntegrationRequest) (*model.CampaignIntegration, error)
	Remove(ctx context.Context, campaignID string, source model.IntegrationSource) error
}

// Server implements the CampaignIntegrationService ConnectRPC handler
type Server struct {
	plannerv1connect.UnimplementedCampaignIntegrationServiceHandler
	CampaignIntegration Servicer
	Log                 *slog.Logger
}

func (s *Server) GetCampaignIntegration(ctx context.Context, req *connect.Request[v1.GetCampaignIntegrationRequest]) (*connect.Response[v1.GetCampaignIntegrationResponse], error) {
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}
	if req.Msg.Source == v1.IntegrationSource_INTEGRATION_SOURCE_UNSPECIFIED {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign integration required"))
	}
	source, err := protoToIntegrationSource(req.Msg.Source)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("invalid campaign integration"))
	}
	campaignIntegration, err := s.CampaignIntegration.GetByCampaign(ctx, req.Msg.CampaignId, source)
	if err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to get campaign integration")
	}
	return connect.NewResponse(&v1.GetCampaignIntegrationResponse{Integration: toProto(campaignIntegration)}), nil
}

func (s *Server) CreateCampaignIntegration(ctx context.Context, req *connect.Request[v1.CreateCampaignIntegrationRequest]) (*connect.Response[v1.CreateCampaignIntegrationResponse], error) {
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}

	switch p := req.Msg.Integration.(type) {
	case *v1.CreateCampaignIntegrationRequest_Discord:
		if p.Discord == nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("discord integration params required"))
		}
		if p.Discord.Code == "" {
			return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("discord code required"))
		}

		campaignIntegration, err := s.CampaignIntegration.CreateDiscord(ctx, &model.CreateDiscordCampaignIntegrationRequest{
			CampaignID: req.Msg.CampaignId,
			Code:       p.Discord.Code,
		})
		if err != nil {
			return nil, mapError(ctx, s.Log, err, "failed to create discord integration")
		}

		return connect.NewResponse(&v1.CreateCampaignIntegrationResponse{
			Integration: toProto(campaignIntegration),
		}), nil

	default:
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("unsupported or missing integration params"))
	}
}

func (s *Server) ListCampaignIntegrationsByCampaign(ctx context.Context, req *connect.Request[v1.ListCampaignIntegrationsByCampaignRequest]) (*connect.Response[v1.ListCampaignIntegrationsByCampaignResponse], error) {
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}

	integrations, err := s.CampaignIntegration.ListByCampaign(ctx, req.Msg.CampaignId)
	if err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to list campaign integrations")
	}

	protoIntegrations := make([]*v1.CampaignIntegration, 0, len(integrations))
	for _, integration := range integrations {
		protoIntegrations = append(protoIntegrations, toProto(integration))
	}

	return connect.NewResponse(&v1.ListCampaignIntegrationsByCampaignResponse{
		Integrations: protoIntegrations,
	}), nil
}

func (s *Server) UpdateCampaignIntegration(ctx context.Context, req *connect.Request[v1.UpdateCampaignIntegrationRequest]) (*connect.Response[v1.UpdateCampaignIntegrationResponse], error) {
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}
	switch p := req.Msg.Integration.(type) {
	case *v1.UpdateCampaignIntegrationRequest_Discord:
		if p.Discord == nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("discord integration params required"))
		}
		discord := &model.UpdateDiscordIntegrationParams{
			EnableSessionReminders:     p.Discord.EnableSessionReminders,
			SessionCreateAnnouncements: p.Discord.SessionCreateAnnouncements,
			Timezone:                   p.Discord.Timezone,
		}
		if p.Discord.DefaultChannel != nil {
			discord.DefaultChannel = &model.DiscordChannel{
				ID:   p.Discord.DefaultChannel.Id,
				Name: p.Discord.DefaultChannel.Name,
			}
		}
		if p.Discord.RecapChannel != nil {
			discord.RecapChannel = &model.DiscordChannel{
				ID:   p.Discord.RecapChannel.Id,
				Name: p.Discord.RecapChannel.Name,
			}
		}
		if p.Discord.SessionReminderChannel != nil {
			discord.SessionReminderChannel = &model.DiscordChannel{
				ID:   p.Discord.SessionReminderChannel.Id,
				Name: p.Discord.SessionReminderChannel.Name,
			}
		}
		updated, err := s.CampaignIntegration.Update(ctx, &model.UpdateCampaignIntegrationRequest{
			CampaignID: req.Msg.CampaignId,
			Source:     model.IntegrationSourceDiscord,
			Discord:    discord,
		})
		if err != nil {
			return nil, mapError(ctx, s.Log, err, "failed to update discord integration")
		}
		return connect.NewResponse(&v1.UpdateCampaignIntegrationResponse{
			Integration: toProto(updated),
		}), nil
	default:
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("unsupported or missing integration params"))
	}
}

func (s *Server) RemoveCampaignIntegration(ctx context.Context, req *connect.Request[v1.RemoveCampaignIntegrationRequest]) (*connect.Response[v1.RemoveCampaignIntegrationResponse], error) {
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}
	if req.Msg.Source == v1.IntegrationSource_INTEGRATION_SOURCE_UNSPECIFIED {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("integration source required"))
	}
	source, err := protoToIntegrationSource(req.Msg.Source)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("invalid campaign integration"))
	}
	if err := s.CampaignIntegration.Remove(ctx, req.Msg.CampaignId, source); err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to remove campaign integration")
	}
	return connect.NewResponse(&v1.RemoveCampaignIntegrationResponse{}), nil
}

// ── Proto conversion ──────────────────────────────────────────────────────────

func sourceToProto(source model.IntegrationSource) v1.IntegrationSource {
	switch source {
	case model.IntegrationSourceDiscord:
		return v1.IntegrationSource_INTEGRATION_SOURCE_DISCORD
	case model.IntegrationSourceGoogleCalendar:
		return v1.IntegrationSource_INTEGRATION_SOURCE_GOOGLE_CALENDAR
	default:
		return v1.IntegrationSource_INTEGRATION_SOURCE_UNSPECIFIED
	}
}

func toProto(integration *model.CampaignIntegration) *v1.CampaignIntegration {
	if integration == nil {
		return nil
	}

	proto := &v1.CampaignIntegration{
		Id:         integration.ID,
		CampaignId: integration.CampaignID,
		ExternalId: integration.ExternalID,
		Source:     sourceToProto(integration.Source),
		CreatedAt:  timestamppb.New(integration.CreatedAt),
		UpdatedAt:  timestamppb.New(integration.UpdatedAt),
	}

	if integration.Metadata != nil {
		if b, err := json.Marshal(integration.Metadata); err == nil {
			s := &structpb.Struct{}
			if s.UnmarshalJSON(b) == nil {
				proto.Metadata = s
			}
		}
	}

	if integration.Settings != nil {
		if b, err := json.Marshal(integration.Settings); err == nil {
			s := &structpb.Struct{}
			if s.UnmarshalJSON(b) == nil {
				proto.Settings = s
			}
		}
	}

	return proto
}

func protoToIntegrationSource(s v1.IntegrationSource) (model.IntegrationSource, error) {
	switch s {
	case v1.IntegrationSource_INTEGRATION_SOURCE_DISCORD:
		return model.IntegrationSourceDiscord, nil
	case v1.IntegrationSource_INTEGRATION_SOURCE_GOOGLE_CALENDAR:
		return model.IntegrationSourceGoogleCalendar, nil
	default:
		return "", fmt.Errorf("unknown integration source: %v", s)
	}
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
	case ErrInvalidChannel:
		return connect.NewError(connect.CodeInvalidArgument, err)
	case ErrChannelNotFound:
		return connect.NewError(connect.CodeInvalidArgument, err)
	default:
		log.ErrorContext(ctx, fallback, "error", err)
		return connect.NewError(connect.CodeInternal, errors.New(fallback))
	}
}
