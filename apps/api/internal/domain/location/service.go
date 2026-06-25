package location

import (
	"database/sql"
	"errors"
	"fmt"
	"log/slog"

	model "github.com/BBruington/party-planner/api/internal/models"
	"github.com/BBruington/party-planner/api/internal/pg"
)

// Domain errors.
var (
	ErrLocationAlreadyExists   = errors.New("location already exists")
	ErrLocationInvalidCampaign = errors.New("campaign does not exist")
	ErrLocationNotFound        = errors.New("location not found")
)

type Store interface {
	CreateLocation(req *model.CreateLocationRequest) (*model.Location, error)
	GetLocation(id, campaignID string) (*model.Location, error)
	ListLocationsByCampaign(campaignId string) ([]*model.Location, error)
	UpdateLocation(req *model.UpdateLocationRequest) (*model.Location, error)
	DeleteLocation(id, campaignID string) (*model.Location, error)
}

type Service struct {
	DB  Store
	Log *slog.Logger
}

func (s *Service) Create(req *model.CreateLocationRequest) (*model.Location, error) {
	location, err := s.DB.CreateLocation(req)
	if err != nil {
		if mapped := mapPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("create location: %w", err)
	}
	return location, nil
}

func (s *Service) GetByID(id, campaignID string) (*model.Location, error) {
	location, err := s.DB.GetLocation(id, campaignID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrLocationNotFound
		}
		return nil, fmt.Errorf("get location: %w", err)
	}
	return location, nil
}

func (s *Service) ListByCampaign(campaignId string) ([]*model.Location, error) {
	locations, err := s.DB.ListLocationsByCampaign(campaignId)
	if err != nil {
		return nil, fmt.Errorf("list locations by campaign error: %w", err)
	}
	return locations, nil
}

func (s *Service) Update(req *model.UpdateLocationRequest) (*model.Location, error) {
	if _, err := s.GetByID(req.ID, req.CampaignID); err != nil {
		return nil, err
	}
	location, err := s.DB.UpdateLocation(req)
	if err != nil {
		if mapped := mapPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("update location: %w", err)
	}
	return location, nil
}

func (s *Service) Delete(id, campaignID string) (*model.Location, error) {
	if _, err := s.GetByID(id, campaignID); err != nil {
		return nil, err
	}
	location, err := s.DB.DeleteLocation(id, campaignID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrLocationNotFound
		}
		return nil, fmt.Errorf("delete location: %w", err)
	}
	return location, nil
}

func mapPgError(err error) error {
	if pg.IsError(err, pg.UniqueViolation) {
		return ErrLocationAlreadyExists
	}
	if pg.IsError(err, pg.ForeignKeyViolation) && pg.Constraint(err) == "fk_location_campaign_id" {
		return ErrLocationInvalidCampaign
	}
	return err
}
