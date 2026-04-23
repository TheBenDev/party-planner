package rpc

import (
	"context"
	"errors"
	"fmt"
	"log/slog"

	"connectrpc.com/connect"
	v1 "github.com/BBruington/party-planner/api/gen/planner/v1"
	"github.com/BBruington/party-planner/api/gen/planner/v1/plannerv1connect"
	model "github.com/BBruington/party-planner/api/internal/models"
	"github.com/BBruington/party-planner/api/internal/service"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type MemberServer struct {
	plannerv1connect.UnimplementedMemberServiceHandler
	Member *service.MemberService
	Log    *slog.Logger
}

func (s *MemberServer) CreateMember(ctx context.Context, req *connect.Request[v1.CreateMemberRequest]) (*connect.Response[v1.CreateMemberResponse], error) {
	if req.Msg.UserId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("user id required"))
	}
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}
	if req.Msg.Role == v1.MemberRole_MEMBER_ROLE_UNSPECIFIED {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign user role required"))
	}

	role, err := protoToMemberRole(req.Msg.Role)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	member, err := s.Member.Create(&model.CreateMemberRequest{
		CampaignID: req.Msg.CampaignId,
		UserID:     req.Msg.UserId,
		Role:       role,
	})
	if err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to create member")
	}

	return connect.NewResponse(&v1.CreateMemberResponse{
		Member: memberToProto(member),
	}), nil
}
func (s *MemberServer) GetMember(ctx context.Context, req *connect.Request[v1.GetMemberRequest]) (*connect.Response[v1.GetMemberResponse], error) {
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}
	if req.Msg.UserId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("user id required"))
	}

	member, err := s.Member.Get(req.Msg.CampaignId, req.Msg.UserId)
	if err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to get campaign user")
	}

	return connect.NewResponse(&v1.GetMemberResponse{
		Member: memberToProto(member),
	}), nil
}
func (s *MemberServer) ListMembersByCampaign(ctx context.Context, req *connect.Request[v1.ListMembersByCampaignRequest]) (*connect.Response[v1.ListMembersByCampaignResponse], error) {
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}
	members, err := s.Member.ListByCampaign(req.Msg.CampaignId)
	if err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to list campaign users by campaign")
	}

	return connect.NewResponse(&v1.ListMembersByCampaignResponse{Members: Map(members, memberToProto)}), nil
}

func (s *MemberServer) ListMembersByUser(ctx context.Context, req *connect.Request[v1.ListMembersByUserRequest]) (*connect.Response[v1.ListMembersByUserResponse], error) {
	if req.Msg.UserId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("user id required"))
	}
	members, err := s.Member.ListByUser(req.Msg.UserId)
	if err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to list campaign users by user")
	}

	return connect.NewResponse(&v1.ListMembersByUserResponse{Members: Map(members, memberToProto)}), nil
}

func (s *MemberServer) RemoveMember(ctx context.Context, req *connect.Request[v1.RemoveMemberRequest]) (*connect.Response[v1.RemoveMemberResponse], error) {
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}
	if req.Msg.UserId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("user id required"))
	}

	err := s.Member.Remove(req.Msg.CampaignId, req.Msg.UserId)
	if err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to remove campaign user")
	}

	return connect.NewResponse(&v1.RemoveMemberResponse{}), nil
}
func (s *MemberServer) AcceptCampaignInvitation(ctx context.Context, req *connect.Request[v1.AcceptCampaignInvitationRequest]) (*connect.Response[v1.AcceptCampaignInvitationResponse], error) {
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}
	if req.Msg.InviteeEmail == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("invitee email required"))
	}
	res, err := s.Member.AcceptInvitation(req.Msg.CampaignId, req.Msg.InviteeEmail)
	if err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to accept campaign invitation")
	}
	return connect.NewResponse(&v1.AcceptCampaignInvitationResponse{
		Invitation: campaignInvitationToProto(res.Invitation),
		Member:     memberToProto(res.Member),
	}), nil
}

func (s *MemberServer) DeclineCampaignInvitation(ctx context.Context, req *connect.Request[v1.DeclineCampaignInvitationRequest]) (*connect.Response[v1.DeclineCampaignInvitationResponse], error) {
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}
	if req.Msg.InviteeEmail == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("invitee email required"))
	}
	inv, err := s.Member.DeclineInvitation(req.Msg.CampaignId, req.Msg.InviteeEmail)

	if err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to decline campaign invitation")
	}
	return connect.NewResponse(&v1.DeclineCampaignInvitationResponse{Invitation: campaignInvitationToProto(inv.Invitation)}), nil
}

func (s *MemberServer) CreateCampaignInvitation(ctx context.Context, req *connect.Request[v1.CreateCampaignInvitationRequest]) (*connect.Response[v1.CreateCampaignInvitationResponse], error) {
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}
	if req.Msg.InviteeEmail == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("invitee email required"))
	}
	if req.Msg.InviterId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("inviter id required"))
	}
	if req.Msg.Role == v1.MemberRole_MEMBER_ROLE_UNSPECIFIED {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("role required"))
	}

	role, err := protoToMemberRole(req.Msg.Role)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	inv, err := s.Member.CreateInvitation(&model.CreateCampaignInvitationRequest{
		CampaignID:   req.Msg.CampaignId,
		InviteeEmail: req.Msg.InviteeEmail,
		InviterID:    req.Msg.InviterId,
		Token:        req.Msg.Token,
		Role:         role,
	})
	if err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to create campaign invitation")
	}

	return connect.NewResponse(&v1.CreateCampaignInvitationResponse{
		Invitation: campaignInvitationToProto(inv),
	}), nil
}

func (s *MemberServer) ListCampaignInvitations(ctx context.Context, req *connect.Request[v1.ListCampaignInvitationsRequest]) (*connect.Response[v1.ListCampaignInvitationsResponse], error) {
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}

	invitations, err := s.Member.ListInvitations(req.Msg.CampaignId)
	if err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to list campaign invitations")
	}

	return connect.NewResponse(&v1.ListCampaignInvitationsResponse{
		Invitations: Map(invitations, campaignInvitationToProto),
	}), nil
}

func (s *MemberServer) RevokeCampaignInvitation(ctx context.Context, req *connect.Request[v1.RevokeCampaignInvitationRequest]) (*connect.Response[v1.RevokeCampaignInvitationResponse], error) {
	if req.Msg.Id == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("invitation id required"))
	}
	if req.Msg.CampaignId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("campaign id required"))
	}

	inv, err := s.Member.RevokeInvitation(req.Msg.Id, req.Msg.CampaignId)
	if err != nil {
		return nil, mapServiceError(ctx, s.Log, err, "failed to revoke campaign invitation")
	}

	return connect.NewResponse(&v1.RevokeCampaignInvitationResponse{
		Invitation: campaignInvitationToProto(inv),
	}), nil
}

func protoToMemberRole(role v1.MemberRole) (model.MemberRole, error) {
	switch role {
	case v1.MemberRole_MEMBER_ROLE_PLAYER:
		return model.MemberRolePlayer, nil
	case v1.MemberRole_MEMBER_ROLE_DUNGEON_MASTER:
		return model.MemberRoleDungeonMaster, nil
	default:
		return "", fmt.Errorf("unknown campaign role: %v", role)
	}
}

func memberSourceToProto(source model.MemberRole) v1.MemberRole {
	switch source {
	case model.MemberRolePlayer:
		return v1.MemberRole_MEMBER_ROLE_PLAYER
	case model.MemberRoleDungeonMaster:
		return v1.MemberRole_MEMBER_ROLE_DUNGEON_MASTER
	default:
		return v1.MemberRole_MEMBER_ROLE_UNSPECIFIED
	}
}

func memberToProto(campaignUser *model.Member) *v1.Member {
	if campaignUser == nil {
		return nil
	}

	proto := &v1.Member{
		UserId:     campaignUser.UserID,
		CampaignId: campaignUser.CampaignID,
		Role:       memberSourceToProto(campaignUser.Role),
		CreatedAt:  timestamppb.New(campaignUser.CreatedAt),
		UpdatedAt:  timestamppb.New(campaignUser.UpdatedAt),
	}

	return proto
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
	case model.InvitationStatusRevoked:
		return v1.InvitationStatus_INVITATION_STATUS_REVOKED
	default:
		{
			return v1.InvitationStatus_INVITATION_STATUS_UNSPECIFIED
		}
	}
}

func memberRoleToProto(role model.MemberRole) v1.MemberRole {
	switch role {
	case model.MemberRolePlayer:
		return v1.MemberRole_MEMBER_ROLE_PLAYER
	case model.MemberRoleDungeonMaster:
		return v1.MemberRole_MEMBER_ROLE_DUNGEON_MASTER
	default:
		return v1.MemberRole_MEMBER_ROLE_UNSPECIFIED
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
		Role:         memberRoleToProto(invitation.Role),
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

func Map[T, U any](items []T, fn func(T) U) []U {
	result := make([]U, len(items))
	for i, item := range items {
		result[i] = fn(item)
	}
	return result
}
