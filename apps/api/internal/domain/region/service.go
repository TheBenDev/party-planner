package region

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
	ErrRegionNotFound        = errors.New("region not found")
	ErrRegionAlreadyExists   = errors.New("region already exists")
	ErrRegionInvalidCampaign = errors.New("campaign does not exist")
)

type Store interface {
	CreateRegion(ctx context.Context, req *model.CreateRegionRequest) (*model.Region, error)
	GetRegion(ctx context.Context, id, campaignID string) (*model.Region, error)
	ListRegionsByCampaign(ctx context.Context, campaignID string) ([]*model.RegionWithLocations, error)
	UpdateRegion(ctx context.Context, req *model.UpdateRegionRequest) (*model.Region, error)
	DeleteRegion(ctx context.Context, id, campaignID string) (*model.Region, error)
}

type Service struct {
	DB  Store
	Log *slog.Logger
}

func (s *Service) Create(ctx context.Context, req *model.CreateRegionRequest) (*model.Region, error) {
	region, err := s.DB.CreateRegion(ctx, req)
	if err != nil {
		if mapped := mapPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("create region: %w", err)
	}
	return region, nil
}

func (s *Service) GetByID(ctx context.Context, id, campaignID string) (*model.Region, error) {
	region, err := s.DB.GetRegion(ctx, id, campaignID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrRegionNotFound
		}
		return nil, fmt.Errorf("get region: %w", err)
	}
	return region, nil
}

func (s *Service) ListByCampaign(ctx context.Context, campaignID string) ([]*model.RegionWithLocations, error) {
	regions, err := s.DB.ListRegionsByCampaign(ctx, campaignID)
	if err != nil {
		return nil, fmt.Errorf("list regions by campaign: %w", err)
	}
	return regions, nil
}

func (s *Service) Update(ctx context.Context, req *model.UpdateRegionRequest) (*model.Region, error) {
	if _, err := s.GetByID(ctx, req.ID, req.CampaignID); err != nil {
		return nil, err
	}
	region, err := s.DB.UpdateRegion(ctx, req)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrRegionNotFound
		}
		if mapped := mapPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("update region: %w", err)
	}
	return region, nil
}

func (s *Service) Delete(ctx context.Context, id, campaignID string) (*model.Region, error) {
	if _, err := s.GetByID(ctx, id, campaignID); err != nil {
		return nil, err
	}
	region, err := s.DB.DeleteRegion(ctx, id, campaignID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrRegionNotFound
		}
		return nil, fmt.Errorf("delete region: %w", err)
	}
	return region, nil
}

func mapPgError(err error) error {
	if pg.IsError(err, pg.UniqueViolation) {
		return ErrRegionAlreadyExists
	}
	if pg.IsError(err, pg.ForeignKeyViolation) && pg.Constraint(err) == "fk_region_campaign_id" {
		return ErrRegionInvalidCampaign
	}
	return err
}
