package rpc

import (
	"context"
	"errors"
	"fmt"
	"log/slog"

	"connectrpc.com/connect"
	plannerv1 "github.com/BBruington/party-planner/api/gen/planner/v1"
	v1 "github.com/BBruington/party-planner/api/gen/planner/v1"
	"github.com/BBruington/party-planner/api/gen/planner/v1/plannerv1connect"
	model "github.com/BBruington/party-planner/api/internal/models"
	"github.com/BBruington/party-planner/api/internal/service"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type CampaignUserServer struct {
	plannerv1connect.UnimplementedCampaignUserServiceHandler
	CampaignUser *service.CampaignUserService
	Log          *slog.Logger
}

func (s *CampaignUserServer) CreateCampaignUser(ctx context.Context, req *connect.Request[v1.CreateCampaignUserRequest]) (*connect.Response[v1.CreateCampaignUserResponse], error) {
	if req.Msg.UserId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("user id required"))
	}
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}
	if req.Msg.Role == plannerv1.CampaignUserRole_CAMPAIGN_USER_ROLE_UNSPECIFIED {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign user role required"))
	}

	role, err := protoToCampaignUserRole(req.Msg.Role)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	campaignUser, err := s.CampaignUser.Create(&model.CreateCampaignUserRequest{
		CampaignID: req.Msg.CampaignId,
		UserID:     req.Msg.UserId,
		Role:       role,
	})
	if err != nil {
		return nil, mapServiceError(err, "failed to create campaign user")
	}

	return connect.NewResponse(&v1.CreateCampaignUserResponse{
		CampaignUser: campaignUserToProto(campaignUser),
	}), nil
}

func (s *CampaignUserServer) GetCampaignUser(ctx context.Context, req *connect.Request[v1.GetCampaignUserRequest]) (*connect.Response[v1.GetCampaignUserResponse], error) {
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}
	if req.Msg.UserId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("user id required"))
	}

	campaignUser, err := s.CampaignUser.Get(req.Msg.CampaignId, req.Msg.UserId)
	if err != nil {
		return nil, mapServiceError(err, "failed to get campaign user")
	}

	return connect.NewResponse(&v1.GetCampaignUserResponse{
		CampaignUser: campaignUserToProto(campaignUser),
	}), nil
}

func (s *CampaignUserServer) UpdateCampaignUserRole(ctx context.Context, req *connect.Request[v1.UpdateCampaignUserRoleRequest]) (*connect.Response[v1.UpdateCampaignUserRoleResponse], error) {
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}
	if req.Msg.UserId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("user id required"))
	}
	if req.Msg.Role == plannerv1.CampaignUserRole_CAMPAIGN_USER_ROLE_UNSPECIFIED {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign user role required"))
	}

	role, err := protoToCampaignUserRole(req.Msg.Role)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	campaignUser, err := s.CampaignUser.UpdateRole(req.Msg.CampaignId, req.Msg.UserId, role)
	if err != nil {
		return nil, mapServiceError(err, "failed to update campaign user role")
	}

	return connect.NewResponse(&v1.UpdateCampaignUserRoleResponse{
		CampaignUser: campaignUserToProto(campaignUser),
	}), nil
}

func (s *CampaignUserServer) RemoveCampaignUser(ctx context.Context, req *connect.Request[v1.RemoveCampaignUserRequest]) (*connect.Response[v1.RemoveCampaignUserResponse], error) {
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}
	if req.Msg.UserId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("user id required"))
	}

	err := s.CampaignUser.Remove(req.Msg.CampaignId, req.Msg.UserId)
	if err != nil {
		return nil, mapServiceError(err, "failed to remove campaign user")
	}

	return connect.NewResponse(&v1.RemoveCampaignUserResponse{}), nil
}

func protoToCampaignUserRole(role v1.CampaignUserRole) (model.CampaignUserRole, error) {
	switch role {
	case v1.CampaignUserRole_CAMPAIGN_USER_ROLE_PLAYER:
		return model.CampaignUserRolePlayer, nil
	case v1.CampaignUserRole_CAMPAIGN_USER_ROLE_DUNGEON_MASTER:
		return model.CampaignUserRoleDungeonMaster, nil
	default:
		return "", fmt.Errorf("unknown campaign user role: %v", role)
	}
}
func campaignUserSourceToProto(source model.CampaignUserRole) v1.CampaignUserRole {
	switch source {
	case model.CampaignUserRolePlayer:
		return v1.CampaignUserRole_CAMPAIGN_USER_ROLE_PLAYER
	case model.CampaignUserRoleDungeonMaster:
		return v1.CampaignUserRole_CAMPAIGN_USER_ROLE_DUNGEON_MASTER
	default:
		return v1.CampaignUserRole_CAMPAIGN_USER_ROLE_UNSPECIFIED
	}
}

func campaignUserToProto(campaignUser *model.CampaignUser) *v1.CampaignUser {
	if campaignUser == nil {
		return nil
	}

	proto := &v1.CampaignUser{
		UserId:     campaignUser.UserID,
		CampaignId: campaignUser.CampaignID,
		Role:       campaignUserSourceToProto(campaignUser.Role),
		CreatedAt:  timestamppb.New(campaignUser.CreatedAt),
		UpdatedAt:  timestamppb.New(campaignUser.UpdatedAt),
	}

	return proto
}
