package service

import (
	"database/sql"
	"errors"
	"fmt"
	"log/slog"

	"github.com/BBruington/party-planner/api/internal/db"
	model "github.com/BBruington/party-planner/api/internal/models"
)

// -----------------------------------------------------------------------------
// Errors
// -----------------------------------------------------------------------------

var (
	ErrLocationAlreadyExists   = errors.New("location already exists")
	ErrLocationInvalidCampaign = errors.New("campaign does not exist")
	ErrLocationNotFound        = errors.New("location not found")
)

// -----------------------------------------------------------------------------
// Service
// -----------------------------------------------------------------------------

type LocationService struct {
	DB  *db.DB
	Log *slog.Logger
}

// -----------------------------------------------------------------------------
// Methods
// -----------------------------------------------------------------------------

func (s *LocationService) Create(req *model.CreateLocationRequest) (*model.Location, error) {
	created, err := s.DB.CreateLocation(req)
	if err != nil {
		if mapped := mapLocationPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("create location error: %w", err)
	}
	return created, nil
}

func (s *LocationService) Get(id string) (*model.Location, error) {
	location, err := s.DB.GetLocation(id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrLocationNotFound
		}
		return nil, fmt.Errorf("get location error: %w", err)
	}
	return location, nil
}

func (s *LocationService) ListByCampaign(campaignId string) ([]*model.Location, error) {
	locations, err := s.DB.ListLocationsByCampaign(campaignId)
	if err != nil {
		return nil, fmt.Errorf("list locations by campaign error: %w", err)
	}
	return locations, nil
}

func (s *LocationService) Update(req *model.UpdateLocationRequest) (*model.Location, error) {
	_, err := s.Get(req.ID)
	if err != nil {
		return nil, err
	}
	updated, err := s.DB.UpdateLocation(req)
	if err != nil {
		if mapped := mapLocationPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("update location error: %w", err)
	}
	return updated, nil
}

func (s *LocationService) Remove(id string) error {
	_, err := s.Get(id)
	if err != nil {
		return err
	}
	if err := s.DB.RemoveLocation(id); err != nil {
		return fmt.Errorf("remove location error: %w", err)
	}
	return nil
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

func mapLocationPgError(err error) error {
	if isPgError(err, pgErrUniqueViolation) {
		return ErrLocationAlreadyExists
	}
	if isPgError(err, pgErrForeignKeyViolation) {
		switch pgConstraint(err) {
		case "fk_location_campaign_id":
			return ErrLocationInvalidCampaign
		}
	}
	return err
}
