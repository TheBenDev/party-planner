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

type UserServer struct {
	plannerv1connect.UnimplementedUserServiceHandler
	User *service.UserService
	Log  *slog.Logger
}

func (s *UserServer) GetUser(ctx context.Context, req *connect.Request[v1.GetUserRequest]) (*connect.Response[v1.GetUserResponse], error) {
	if req.Msg.ExternalId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("User Clerk Id Required"))
	}

	user, err := s.User.GetByClerkId(req.Msg.ExternalId)
	if err != nil {
		return nil, fmt.Errorf("failed to get user")
	}

	return connect.NewResponse(&v1.GetUserResponse{User: userToProto(user)}), nil

}

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

func mapUserError(ctx context.Context, log *slog.Logger, err error, keyvals ...any) error {
	switch {
	case errors.Is(err, service.ErrUserNotFound):
		return connect.NewError(connect.CodeNotFound, errMsg("user not found"))
	default:
		return internalErr(ctx, log, "user service error", err, keyvals...)
	}
}
