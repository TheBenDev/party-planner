package rpc

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"

	"connectrpc.com/connect"
	plannerv1 "github.com/BBruington/party-planner/api/gen/planner/v1"
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
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("Campaign Id Required"))
	}
	if req.Msg.Source == plannerv1.IntegrationSource_INTEGRATION_SOURCE_UNSPECIFIED {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("Campaign Integration Required"))
	}
	source, err := protoToIntegrationSource(req.Msg.Source)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("Invalid Campaign Integration"))
	}
	campaignIntegration, err := s.CampaignIntegration.GetByCampaign(req.Msg.CampaignId, source)
	if err != nil {
		return nil, mapServiceError(err, "failed to get campaign integration")
	}
	return connect.NewResponse(&v1.GetCampaignIntegrationResponse{Integration: campaignIntegrationToProto(campaignIntegration)}), nil
}

func (s *CampaignIntegrationServer) CreateCampaignIntegration(ctx context.Context, req *connect.Request[v1.CreateCampaignIntegrationRequest]) (*connect.Response[v1.CreateCampaignIntegrationResponse], error) {
	if req.Msg.ExternalId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("Integration Id Required"))
	}
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("Campaign Id Required"))
	}
	if req.Msg.Source == plannerv1.IntegrationSource_INTEGRATION_SOURCE_UNSPECIFIED {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("Campaign Integration Required"))
	}
	source, err := protoToIntegrationSource(req.Msg.Source)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}
	var metadata, settings json.RawMessage

	if req.Msg.Metadata != nil {
		b, err := req.Msg.Metadata.MarshalJSON()
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("invalid metadata"))
		}
		metadata = b
	}

	if req.Msg.Settings != nil {
		b, err := req.Msg.Settings.MarshalJSON()
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("invalid settings"))
		}
		settings = b
	}

	campaignIntegration, err := s.CampaignIntegration.Create(&model.CreateCampaignIntegrationRequest{
		CampaignID: req.Msg.CampaignId,
		ExternalID: req.Msg.ExternalId,
		Source:     source,
		Metadata:   metadata,
		Settings:   settings,
	})
	if err != nil {
		return nil, mapServiceError(err, "failed to create campaign integration")
	}

	return connect.NewResponse(&v1.CreateCampaignIntegrationResponse{
		Integration: campaignIntegrationToProto(campaignIntegration),
	}), nil
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

func protoToIntegrationSource(s plannerv1.IntegrationSource) (model.IntegrationSource, error) {
	switch s {
	case plannerv1.IntegrationSource_INTEGRATION_SOURCE_DISCORD:
		return model.IntegrationSourceDiscord, nil
	default:
		return "", fmt.Errorf("unknown integration source: %v", s)
	}
}
