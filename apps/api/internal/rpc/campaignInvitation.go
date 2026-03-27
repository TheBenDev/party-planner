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

type CampaignInvitationServer struct {
	plannerv1connect.UnimplementedCampaignInvitationServiceHandler
	CampaignInvitation *service.CampaignInvitationService
	Log                *slog.Logger
}

func (s *CampaignInvitationServer) CreateCampaignInvitation(ctx context.Context, req *connect.Request[v1.CreateCampaignInvitationRequest]) (*connect.Response[v1.CreateCampaignInvitationResponse], error) {
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}
	if req.Msg.InviterId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("inviter id required"))
	}
	if req.Msg.InviteeEmail == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("invitee email required"))
	}
	if req.Msg.Role == plannerv1.CampaignRole_CAMPAIGN_ROLE_UNSPECIFIED {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign role required"))
	}
	if req.Msg.ExpiresAt == nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("expires at required"))
	}

	role, err := protoToCampaignRole(req.Msg.Role)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	invitation, err := s.CampaignInvitation.Create(&model.CreateCampaignInvitationRequest{
		CampaignID:   req.Msg.CampaignId,
		InviterID:    req.Msg.InviterId,
		InviteeEmail: req.Msg.InviteeEmail,
		Role:         role,
		ExpiresAt:    req.Msg.ExpiresAt.AsTime(),
	})
	if err != nil {
		return nil, mapServiceError(err, "failed to create campaign invitation")
	}

	return connect.NewResponse(&v1.CreateCampaignInvitationResponse{
		Invitation: campaignInvitationToProto(invitation),
	}), nil
}

func (s *CampaignInvitationServer) GetCampaignInvitation(ctx context.Context, req *connect.Request[v1.GetCampaignInvitationRequest]) (*connect.Response[v1.GetCampaignInvitationResponse], error) {
	if req.Msg.Id == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("id required"))
	}

	invitation, err := s.CampaignInvitation.Get(req.Msg.Id)
	if err != nil {
		return nil, mapServiceError(err, "failed to get campaign invitation")
	}

	return connect.NewResponse(&v1.GetCampaignInvitationResponse{
		Invitation: campaignInvitationToProto(invitation),
	}), nil
}

func (s *CampaignInvitationServer) UpdateCampaignInvitationStatus(ctx context.Context, req *connect.Request[v1.UpdateCampaignInvitationStatusRequest]) (*connect.Response[v1.UpdateCampaignInvitationStatusResponse], error) {
	if req.Msg.Id == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("id required"))
	}
	if req.Msg.Status == plannerv1.InvitationStatus_INVITATION_STATUS_UNSPECIFIED {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("status required"))
	}

	status, err := protoToInvitationStatus(req.Msg.Status)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	invitation, err := s.CampaignInvitation.UpdateStatus(req.Msg.Id, status)
	if err != nil {
		return nil, mapServiceError(err, "failed to update campaign invitation status")
	}

	return connect.NewResponse(&v1.UpdateCampaignInvitationStatusResponse{
		Invitation: campaignInvitationToProto(invitation),
	}), nil
}

func protoToCampaignRole(role v1.CampaignRole) (model.CampaignRole, error) {
	switch role {
	case v1.CampaignRole_CAMPAIGN_ROLE_PLAYER:
		return model.CampaignRolePlayer, nil
	case v1.CampaignRole_CAMPAIGN_ROLE_GAME_MASTER:
		return model.CampaignRoleGameMaster, nil
	default:
		return "", fmt.Errorf("unknown campaign role: %v", role)
	}
}

func protoToInvitationStatus(status v1.InvitationStatus) (model.InvitationStatus, error) {
	switch status {
	case v1.InvitationStatus_INVITATION_STATUS_PENDING:
		return model.InvitationStatusPending, nil
	case v1.InvitationStatus_INVITATION_STATUS_ACCEPTED:
		return model.InvitationStatusAccepted, nil
	case v1.InvitationStatus_INVITATION_STATUS_DECLINED:
		return model.InvitationStatusDeclined, nil
	case v1.InvitationStatus_INVITATION_STATUS_EXPIRED:
		return model.InvitationStatusExpired, nil
	default:
		return "", fmt.Errorf("unknown invitation status: %v", status)
	}
}

func invitationStatusToProto(status model.InvitationStatus) v1.InvitationStatus {
	switch status {
	case model.InvitationStatusPending:
		return v1.InvitationStatus_INVITATION_STATUS_PENDING
	case model.InvitationStatusAccepted:
		return v1.InvitationStatus_INVITATION_STATUS_ACCEPTED
	case model.InvitationStatusDeclined:
		return v1.InvitationStatus_INVITATION_STATUS_DECLINED
	case model.InvitationStatusExpired:
		return v1.InvitationStatus_INVITATION_STATUS_EXPIRED
	default:
		return v1.InvitationStatus_INVITATION_STATUS_UNSPECIFIED
	}
}

func campaignRoleToProto(role model.CampaignRole) v1.CampaignRole {
	switch role {
	case model.CampaignRolePlayer:
		return v1.CampaignRole_CAMPAIGN_ROLE_PLAYER
	case model.CampaignRoleGameMaster:
		return v1.CampaignRole_CAMPAIGN_ROLE_GAME_MASTER
	default:
		return v1.CampaignRole_CAMPAIGN_ROLE_UNSPECIFIED
	}
}

func campaignInvitationToProto(invitation *model.CampaignInvitation) *v1.CampaignInvitation {
	if invitation == nil {
		return nil
	}
	proto := &v1.CampaignInvitation{
		Id:           invitation.ID,
		CampaignId:   invitation.CampaignID,
		InviterId:    invitation.InviterID,
		InviteeEmail: invitation.InviteeEmail,
		Role:         campaignRoleToProto(invitation.Role),
		Status:       invitationStatusToProto(invitation.Status),
		ExpiresAt:    timestamppb.New(invitation.ExpiresAt),
		CreatedAt:    timestamppb.New(invitation.CreatedAt),
		UpdatedAt:    timestamppb.New(invitation.UpdatedAt),
	}
	if invitation.AcceptedAt.Valid {
		proto.AcceptedAt = timestamppb.New(invitation.AcceptedAt.Time)
	}
	return proto
}
