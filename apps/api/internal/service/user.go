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
	ErrUserNotFound = errors.New("user not found")
)

type UserService struct {
	DB  *db.DB
	Log *slog.Logger
}

func (s *UserService) GetByClerkId(clerkID string) (*model.User, error) {
	user, err := s.DB.GetUserByClerkId(clerkID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("find user: %w", err)
	}

	return user, nil
}
