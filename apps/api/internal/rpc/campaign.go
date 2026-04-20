package rpc

import (
	"context"
	"errors"
	"log/slog"

	"connectrpc.com/connect"
	v1 "github.com/BBruington/party-planner/api/gen/planner/v1"
	"github.com/BBruington/party-planner/api/gen/planner/v1/plannerv1connect"
	model "github.com/BBruington/party-planner/api/internal/models"
	"github.com/BBruington/party-planner/api/internal/service"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type CampaignServer struct {
	plannerv1connect.UnimplementedCampaignServiceHandler
	Campaign *service.CampaignService
	Log      *slog.Logger
}

func (s *CampaignServer) CreateCampaign(ctx context.Context, req *connect.Request[v1.CreateCampaignRequest]) (*connect.Response[v1.CreateCampaignResponse], error) {
	if req.Msg.UserId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("user id required"))
	}
	if req.Msg.Title == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign title required"))
	}
	campaign, err := s.Campaign.Create(&model.CreateCampaignRequest{
		UserID:      req.Msg.UserId,
		Title:       req.Msg.Title,
		Description: sqlNullString(req.Msg.Description),
		Tags:        req.Msg.Tags,
	})

	if err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to create campaign")
	}
	return connect.NewResponse(&v1.CreateCampaignResponse{Campaign: campaignToProto(campaign)}), nil
}

func (s *CampaignServer) GetCampaign(ctx context.Context, req *connect.Request[v1.GetCampaignRequest]) (*connect.Response[v1.GetCampaignResponse], error) {
	if req.Msg.Id == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}
	campaign, err := s.Campaign.GetById(req.Msg.Id)
	if err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to get campaign")
	}
	return connect.NewResponse(&v1.GetCampaignResponse{Campaign: campaignToProto(campaign)}), nil
}

func campaignToProto(campaign *model.Campaign) *v1.Campaign {
	if campaign == nil {
		return nil
	}
	proto := &v1.Campaign{
		Id:        campaign.ID,
		UserId:    campaign.UserID,
		Title:     campaign.Title,
		CreatedAt: timestamppb.New(campaign.CreatedAt),
		UpdatedAt: timestamppb.New(campaign.UpdatedAt),
		Tags:      campaign.Tags,
	}
	if campaign.Description.Valid {
		proto.Description = &campaign.Description.String
	}
	if campaign.DeletedAt.Valid {
		proto.DeletedAt = timestamppb.New(campaign.DeletedAt.Time)
	}
	return proto
}
