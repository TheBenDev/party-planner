package user

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"

	model "github.com/BBruington/party-planner/api/internal/models"
	"github.com/BBruington/party-planner/api/internal/pg"
)

// Domain errors.
var (
	ErrNotFound        = errors.New("user not found")
	ErrAlreadyExists   = errors.New("user already exists")
	ErrEmailTaken      = errors.New("email already in use")
	ErrExternalIDTaken = errors.New("clerk external id already in use")
)

type Store interface {
	CreateUser(ctx context.Context, req *model.CreateUserRequest) (*model.User, error)
	DeleteUser(ctx context.Context, externalID string) (*model.User, error)
	GetUserByClerkID(ctx context.Context, externalID string) (*model.User, error)
	GetUserByEmail(ctx context.Context, email string) (*model.User, error)
	GetUserByID(ctx context.Context, userID string) (*model.User, error)
	UpdateUserByClerkID(ctx context.Context, req *model.UpdateUserRequest) (*model.User, error)
	GetCampaign(ctx context.Context, id string) (*model.Campaign, error)
	GetCampaignUser(ctx context.Context, campaignID, userID string) (*model.Member, error)
	ListCampaignUsersByUser(ctx context.Context, userID string) ([]*model.MemberWithUser, error)
}

type Service struct {
	DB  Store
	Log *slog.Logger
}

func (s *Service) Create(ctx context.Context, req *model.CreateUserRequest) (*model.User, error) {
	created, err := s.DB.CreateUser(ctx, req)
	if err != nil {
		if mapped := mapPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("create user: %w", err)
	}
	return created, nil
}

func (s *Service) Delete(ctx context.Context, externalID string) (*model.User, error) {
	user, err := s.DB.DeleteUser(ctx, externalID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("delete user: %w", err)
	}
	return user, nil
}

func (s *Service) GetByClerkID(ctx context.Context, externalID string) (*model.User, error) {
	user, err := s.DB.GetUserByClerkID(ctx, externalID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get user: %w", err)
	}
	return user, nil
}

func (s *Service) GetByEmail(ctx context.Context, email string) (*model.User, error) {
	user, err := s.DB.GetUserByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get user: %w", err)
	}
	return user, nil
}

func (s *Service) GetAuth(ctx context.Context, externalID string, campaignID *string) (*model.GetAuthResponse, error) {
	user, err := s.GetByClerkID(ctx, externalID)
	if err != nil {
		return nil, err
	}

	if campaignID != nil {
		campaign, err := s.DB.GetCampaign(ctx, *campaignID)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return &model.GetAuthResponse{
					User:     user,
					Campaign: nil,
					Role:     nil,
				}, nil
			}
			return nil, fmt.Errorf("get campaign: %w", err)
		}

		member, err := s.DB.GetCampaignUser(ctx, *campaignID, user.ID)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return &model.GetAuthResponse{
					User:     user,
					Campaign: nil,
					Role:     nil,
				}, nil
			}
			return nil, fmt.Errorf("get campaign user: %w", err)
		}

		return &model.GetAuthResponse{
			User:     user,
			Campaign: campaign,
			Role:     &member.Role,
		}, nil
	}

	members, err := s.DB.ListCampaignUsersByUser(ctx, user.ID)
	if err != nil {
		return nil, fmt.Errorf("list campaign users: %w", err)
	}

	if len(members) == 0 {
		return &model.GetAuthResponse{
			User:     user,
			Campaign: nil,
			Role:     nil,
		}, nil
	}

	campaign, err := s.DB.GetCampaign(ctx, members[0].CampaignID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return &model.GetAuthResponse{
				User:     user,
				Campaign: nil,
				Role:     nil,
			}, nil
		}
		return nil, fmt.Errorf("get campaign: %w", err)
	}

	return &model.GetAuthResponse{
		User:     user,
		Campaign: campaign,
		Role:     &members[0].Role,
	}, nil
}

func (s *Service) Update(ctx context.Context, req *model.UpdateUserRequest) (*model.User, error) {
	updated, err := s.DB.UpdateUserByClerkID(ctx, req)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("update user: %w", err)
	}
	return updated, nil
}

func mapPgError(err error) error {
	if pg.IsError(err, pg.UniqueViolation) {
		constraint := pg.Constraint(err)
		switch constraint {
		case "users_email_unique":
			return ErrEmailTaken
		case "users_external_id_unique":
			return ErrExternalIDTaken
		}
		return ErrAlreadyExists
	}
	return err
}
