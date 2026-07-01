package location

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"

	model "github.com/BBruington/party-planner/api/internal/models"
	"github.com/BBruington/party-planner/api/internal/pg"
)

var (
	ErrLocationAlreadyExists   = errors.New("location already exists")
	ErrLocationInvalidCampaign = errors.New("campaign does not exist")
	ErrLocationRegionNotFound  = errors.New("location region not found")
	ErrLocationInvalidRegion   = errors.New("region does not exist or does not belong to campaign")
	ErrLocationNotFound        = errors.New("location not found")
)

type Store interface {
	CreateLocation(ctx context.Context, req *model.CreateLocationRequest) (*model.Location, error)
	GetLocation(ctx context.Context, id, campaignID string) (*model.Location, error)
	UpdateLocation(ctx context.Context, req *model.UpdateLocationRequest) (*model.Location, error)
	DeleteLocation(ctx context.Context, id, campaignID string) (*model.Location, error)
}

type Service struct {
	DB  Store
	Log *slog.Logger
}

func (s *Service) Create(ctx context.Context, req *model.CreateLocationRequest) (*model.Location, error) {
	location, err := s.DB.CreateLocation(ctx, req)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrLocationInvalidRegion
		}
		if mapped := mapPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("create location: %w", err)
	}
	return location, nil
}

func (s *Service) GetByID(ctx context.Context, id, campaignID string) (*model.Location, error) {
	location, err := s.DB.GetLocation(ctx, id, campaignID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrLocationNotFound
		}
		return nil, fmt.Errorf("get location: %w", err)
	}
	return location, nil
}

func (s *Service) Update(ctx context.Context, req *model.UpdateLocationRequest) (*model.Location, error) {
	if _, err := s.GetByID(ctx, req.ID, req.CampaignID); err != nil {
		return nil, err
	}
	location, err := s.DB.UpdateLocation(ctx, req)
	if err != nil {
		if mapped := mapPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("update location: %w", err)
	}
	return location, nil
}

func (s *Service) Delete(ctx context.Context, id, campaignID string) (*model.Location, error) {
	if _, err := s.GetByID(ctx, id, campaignID); err != nil {
		return nil, err
	}
	location, err := s.DB.DeleteLocation(ctx, id, campaignID)
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
	if pg.IsError(err, pg.ForeignKeyViolation) && pg.Constraint(err) == "fk_location_region_id" {
		return ErrLocationRegionNotFound
	}
	return err
}
