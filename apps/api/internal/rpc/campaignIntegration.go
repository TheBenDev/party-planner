package rpc

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
	"github.com/BBruington/party-planner/api/internal/service"
	"google.golang.org/protobuf/types/known/structpb"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type CampaignIntegrationServer struct {
	plannerv1connect.UnimplementedCampaignIntegrationServiceHandler
	CampaignIntegration *service.CampaignIntegrationService
	Log                 *slog.Logger
}

func (s *CampaignIntegrationServer) GetCampaignIntegration(ctx context.Context, req *connect.Request[v1.GetCampaignIntegrationRequest]) (*connect.Response[v1.GetCampaignIntegrationResponse], error) {
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
	campaignIntegration, err := s.CampaignIntegration.GetByCampaign(req.Msg.CampaignId, source)
	if err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to get campaign integration")
	}
	return connect.NewResponse(&v1.GetCampaignIntegrationResponse{Integration: campaignIntegrationToProto(campaignIntegration)}), nil
}

func (s *CampaignIntegrationServer) CreateCampaignIntegration(ctx context.Context, req *connect.Request[v1.CreateCampaignIntegrationRequest]) (*connect.Response[v1.CreateCampaignIntegrationResponse], error) {
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

		campaignIntegration, err := s.CampaignIntegration.CreateDiscordIntegration(ctx, &model.CreateDiscordCampaignIntegrationRequest{
			CampaignID: req.Msg.CampaignId,
			Code:       p.Discord.Code,
		})
		if err != nil {
			return nil, mapServiceError(ctx, s.Log, err, "failed to create discord integration")
		}

		return connect.NewResponse(&v1.CreateCampaignIntegrationResponse{
			Integration: campaignIntegrationToProto(campaignIntegration),
		}), nil

	default:
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("unsupported or missing integration params"))
	}
}

func (s *CampaignIntegrationServer) ListCampaignIntegrationsByCampaign(ctx context.Context, req *connect.Request[v1.ListCampaignIntegrationsByCampaignRequest]) (*connect.Response[v1.ListCampaignIntegrationsByCampaignResponse], error) {
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}

	integrations, err := s.CampaignIntegration.ListByCampaign(req.Msg.CampaignId)
	if err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to list campaign integrations")
	}

	proto := make([]*v1.CampaignIntegration, 0, len(integrations))
	for _, integration := range integrations {
		proto = append(proto, campaignIntegrationToProto(integration))
	}

	return connect.NewResponse(&v1.ListCampaignIntegrationsByCampaignResponse{
		Integrations: proto,
	}), nil
}

func (s *CampaignIntegrationServer) UpdateCampaignIntegration(ctx context.Context, req *connect.Request[v1.UpdateCampaignIntegrationRequest]) (*connect.Response[v1.UpdateCampaignIntegrationResponse], error) {
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}
	switch p := req.Msg.Integration.(type) {
	case *v1.UpdateCampaignIntegrationRequest_Discord:
		if p.Discord == nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("discord integration params required"))
		}
		updated, err := s.CampaignIntegration.UpdateDiscordChannelID(ctx, req.Msg.CampaignId, p.Discord.ChannelId)
		if err != nil {
			return nil, mapServiceError(ctx, s.Log, err, "failed to update discord integration")
		}
		return connect.NewResponse(&v1.UpdateCampaignIntegrationResponse{
			Integration: campaignIntegrationToProto(updated),
		}), nil
	default:
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("unsupported or missing integration params"))
	}
}

func (s *CampaignIntegrationServer) RemoveCampaignIntegration(ctx context.Context, req *connect.Request[v1.RemoveCampaignIntegrationRequest]) (*connect.Response[v1.RemoveCampaignIntegrationResponse], error) {
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
	if err := s.CampaignIntegration.Remove(req.Msg.CampaignId, source); err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to remove campaign integration")
	}
	return connect.NewResponse(&v1.RemoveCampaignIntegrationResponse{}), nil
}

func campaignIntegrationSourceToProto(source model.IntegrationSource) v1.IntegrationSource {
	switch source {
	case model.IntegrationSourceDiscord:
		return v1.IntegrationSource_INTEGRATION_SOURCE_DISCORD
	default:
		return v1.IntegrationSource_INTEGRATION_SOURCE_UNSPECIFIED
	}
}

func campaignIntegrationToProto(integration *model.CampaignIntegration) *v1.CampaignIntegration {
	if integration == nil {
		return nil
	}

	source := campaignIntegrationSourceToProto(integration.Source)

	proto := &v1.CampaignIntegration{
		Id:         integration.ID,
		CampaignId: integration.CampaignID,
		ExternalId: integration.ExternalID,
		Source:     source,
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
	default:
		return "", fmt.Errorf("unknown integration source: %v", s)
	}
}
