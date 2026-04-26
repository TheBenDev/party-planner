package service

import (
	"database/sql"
	"errors"
	"fmt"
	"log/slog"

	"github.com/BBruington/party-planner/api/internal/db"
	model "github.com/BBruington/party-planner/api/internal/models"
)

var (
	ErrUserNotFound        = errors.New("user not found")
	ErrUserAlreadyExists   = errors.New("user already exists")
	ErrUserEmailTaken      = errors.New("email already in use")
	ErrUserExternalIdTaken = errors.New("clerk external id already in use")
)

type UserService struct {
	DB  *db.DB
	Log *slog.Logger
}

func (s *UserService) Create(user *model.CreateUserRequest) (*model.User, error) {
	created, err := s.DB.CreateUser(user)
	if err != nil {
		if mapped := mapUserPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("create user error: %w", err)
	}
	return created, nil
}

func (s *UserService) Delete(clerkID string) (*model.User, error) {
	user, err := s.DB.DeleteUser(clerkID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			s.Log.Warn("delete user called for unknown external id", "external_id", clerkID)
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("delete user: %w", err)
	}
	return user, nil
}

func (s *UserService) GetByClerkId(clerkID string) (*model.User, error) {
	user, err := s.DB.GetUserByClerkId(clerkID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("get user error: %w", err)
	}
	return user, nil
}

func (s *UserService) GetByEmail(email string) (*model.User, error) {
	user, err := s.DB.GetUserByEmail(email)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("get user error: %w", err)
	}
	return user, nil
}

func (s *UserService) GetAuth(clerkId string, campaignId *string) (*model.GetAuthResponse, error) {
	user, err := s.GetByClerkId(clerkId)
	if err != nil {
		return nil, err
	}
	if campaignId != nil {
		s.Log.Info("GETTING CAMPAIGN WITH GIVEN ID")
		campaign, err := s.DB.GetCampaign(*campaignId)
		if err != nil {
			return nil, fmt.Errorf("get campaign error: %w", err)
		}
		member, err := s.DB.GetCampaignUser(*campaignId, user.ID)
		if err != nil {
			return nil, fmt.Errorf("get campaign user error: %w", err)
		}

		return &model.GetAuthResponse{
			User:     user,
			Role:     &member.Role,
			Campaign: campaign,
		}, nil
	}
	members, err := s.DB.ListCampaignUsersByUser(user.ID)
	if err != nil {
		if mapped := mapCampaignUserPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("list campaign users by user error: %w", err)
	}
	if len(members) == 0 {
		return &model.GetAuthResponse{
			User:     user,
			Campaign: nil,
			Role:     nil,
		}, nil
	}

	campaign, err := s.DB.GetCampaign(members[0].CampaignID)
	if err != nil {
		return nil, fmt.Errorf("get campaign error: %w", err)
	}

	return &model.GetAuthResponse{
		User:     user,
		Campaign: campaign,
		Role:     &members[0].Role,
	}, nil
}

func (s *UserService) Update(user *model.UpdateUserRequest) (*model.User, error) {
	updated, err := s.DB.UpdateUserByClerkId(user)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("update user error: %w", err)
	}
	return updated, nil
}

func mapUserPgError(err error) error {
	if isPgError(err, pgErrUniqueViolation) {
		switch pgConstraint(err) {
		case "users_email_unique":
			return ErrUserEmailTaken
		case "users_external_id_unique":
			return ErrUserExternalIdTaken
		}
		return ErrUserAlreadyExists
	}
	return err
}
