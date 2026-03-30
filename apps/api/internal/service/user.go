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
