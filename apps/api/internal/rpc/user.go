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

type UserServer struct {
	plannerv1connect.UnimplementedUserServiceHandler
	User *service.UserService
	Log  *slog.Logger
}

func (s *UserServer) CreateUser(ctx context.Context, req *connect.Request[v1.CreateUserRequest]) (*connect.Response[v1.CreateUserResponse], error) {
	if req.Msg.ExternalId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("user clerk id required"))
	}
	if req.Msg.Email == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("user email required"))
	}

	user, err := s.User.Create(&model.CreateUserRequest{
		ExternalId: req.Msg.ExternalId,
		Email:      req.Msg.Email,
		Avatar:     sqlNullString(req.Msg.Avatar),
		FirstName:  sqlNullString(req.Msg.FirstName),
		LastName:   sqlNullString(req.Msg.LastName),
	})
	if err != nil {
		return nil, mapServiceError(err, "failed to create user")
	}

	return connect.NewResponse(&v1.CreateUserResponse{User: userToProto(user)}), nil
}

func (s *UserServer) GetUser(ctx context.Context, req *connect.Request[v1.GetUserRequest]) (*connect.Response[v1.GetUserResponse], error) {
	if req.Msg.ExternalId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("user clerk id required"))
	}

	user, err := s.User.GetByClerkId(req.Msg.ExternalId)
	if err != nil {
		return nil, mapServiceError(err, "failed to get user")
	}

	return connect.NewResponse(&v1.GetUserResponse{User: userToProto(user)}), nil
}

func (s *UserServer) GetUserByEmail(ctx context.Context, req *connect.Request[v1.GetUserByEmailRequest]) (*connect.Response[v1.GetUserByEmailResponse], error) {
	if req.Msg.Email == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("user email required"))
	}

	user, err := s.User.GetByEmail(req.Msg.Email)
	if err != nil {
		return nil, mapServiceError(err, "failed to get user by email")
	}

	return connect.NewResponse(&v1.GetUserByEmailResponse{User: userToProto(user)}), nil
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
