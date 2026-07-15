package user

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

// Server implements the UserService ConnectRPC handler.
type Server struct {
	plannerv1connect.UnimplementedUserServiceHandler
	User *Service
	Log  *slog.Logger
}

func (s *Server) CreateUser(ctx context.Context, req *connect.Request[v1.CreateUserRequest]) (*connect.Response[v1.CreateUserResponse], error) {
	if req.Msg.ExternalId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("user clerk id required"))
	}
	if req.Msg.Email == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("user email required"))
	}

	user, err := s.User.Create(ctx, &model.CreateUserRequest{
		ExternalId: req.Msg.ExternalId,
		Email:      req.Msg.Email,
		Avatar:     sqlNullString(req.Msg.Avatar),
		FirstName:  sqlNullString(req.Msg.FirstName),
		LastName:   sqlNullString(req.Msg.LastName),
	})
	if err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to create user")
	}

	return connect.NewResponse(&v1.CreateUserResponse{User: userToProto(user)}), nil
}

func (s *Server) DeleteUser(ctx context.Context, req *connect.Request[v1.DeleteUserRequest]) (*connect.Response[v1.DeleteUserResponse], error) {
	if req.Msg.ExternalId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("user clerk id required"))
	}
	_, err := s.User.Delete(ctx, req.Msg.ExternalId)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return connect.NewResponse(&v1.DeleteUserResponse{}), nil
		}
		return nil, mapError(ctx, s.Log, err, "failed to delete user")
	}
	return connect.NewResponse(&v1.DeleteUserResponse{}), nil
}

func (s *Server) GetUser(ctx context.Context, req *connect.Request[v1.GetUserRequest]) (*connect.Response[v1.GetUserResponse], error) {
	if req.Msg.ExternalId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("user clerk id required"))
	}

	user, err := s.User.GetByClerkID(ctx, req.Msg.ExternalId)
	if err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to get user")
	}
	return connect.NewResponse(&v1.GetUserResponse{User: userToProto(user)}), nil
}

func (s *Server) GetAuth(ctx context.Context, req *connect.Request[v1.GetAuthRequest]) (*connect.Response[v1.GetAuthResponse], error) {
	if req.Msg.ClerkId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("user clerk id required"))
	}

	auth, err := s.User.GetAuth(ctx, req.Msg.ClerkId, req.Msg.CampaignId)
	if err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to get auth")
	}

	var role *v1.MemberRole
	if auth.Role != nil {
		r := memberRoleToProto(*auth.Role)
		role = &r
	}
	return connect.NewResponse(&v1.GetAuthResponse{
		User:     userToProto(auth.User),
		Campaign: campaignToProto(auth.Campaign),
		Role:     role,
		ColonyId: auth.ColonyId,
	}), nil
}

func (s *Server) GetUserByEmail(ctx context.Context, req *connect.Request[v1.GetUserByEmailRequest]) (*connect.Response[v1.GetUserByEmailResponse], error) {
	if req.Msg.Email == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("user email required"))
	}

	user, err := s.User.GetByEmail(ctx, req.Msg.Email)
	if err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to get user by email")
	}

	return connect.NewResponse(&v1.GetUserByEmailResponse{User: userToProto(user)}), nil
}

func (s *Server) UpdateUser(ctx context.Context, req *connect.Request[v1.UpdateUserRequest]) (*connect.Response[v1.UpdateUserResponse], error) {
	if req.Msg.ExternalId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("user clerk id required"))
	}

	user, err := s.User.Update(ctx, &model.UpdateUserRequest{
		ExternalId: req.Msg.ExternalId,
		Avatar:     sqlNullString(req.Msg.Avatar),
		FirstName:  sqlNullString(req.Msg.FirstName),
		LastName:   sqlNullString(req.Msg.LastName),
	})
	if err != nil {
		return nil, mapError(ctx, s.Log, err, "failed to update user")
	}

	return connect.NewResponse(&v1.UpdateUserResponse{User: userToProto(user)}), nil
}

// ── Proto conversion ──────────────────────────────────────────────────────────

func userToProto(user *model.User) *v1.User {
	if user == nil {
		return nil
	}
	proto := &v1.User{
		Id:         user.ID,
		Email:      user.Email,
		ExternalId: user.ExternalId,
		CreatedAt:  timestamppb.New(user.CreatedAt),
		UpdatedAt:  timestamppb.New(user.UpdatedAt),
	}

	if user.Avatar.Valid {
		proto.Avatar = &user.Avatar.String
	}
	if user.FirstName.Valid {
		proto.FirstName = &user.FirstName.String
	}
	if user.LastName.Valid {
		proto.LastName = &user.LastName.String
	}
	if user.DeletedAt.Valid {
		proto.DeletedAt = timestamppb.New(user.DeletedAt.Time)
	}

	return proto
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

// ── Error mapping ─────────────────────────────────────────────────────────────

func mapError(ctx context.Context, log *slog.Logger, err error, fallback string) error {
	switch err {
	case ErrNotFound:
		return connect.NewError(connect.CodeNotFound, err)
	case ErrAlreadyExists:
		return connect.NewError(connect.CodeAlreadyExists, err)
	case ErrEmailTaken:
		return connect.NewError(connect.CodeAlreadyExists, err)
	case ErrExternalIDTaken:
		return connect.NewError(connect.CodeAlreadyExists, err)
	default:
		log.ErrorContext(ctx, fallback, "error", err)
		return connect.NewError(connect.CodeInternal, errors.New(fallback))
	}
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func sqlNullString(s *string) sql.NullString {
	if s == nil {
		return sql.NullString{}
	}
	return sql.NullString{String: *s, Valid: true}
}
