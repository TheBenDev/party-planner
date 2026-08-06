package colony

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
	ErrNotFound        = errors.New("colony not found")
	ErrAlreadyExists   = errors.New("colony already exists")
	ErrInvalidCampaign = errors.New("campaign does not exist")
)

type Store interface {
	RunInTx(ctx context.Context, fn func(context.Context, Store) error) error
	CreateColony(ctx context.Context, req *model.CreateColonyRequest) (*model.Colony, error)
	GetColonyByCampaign(ctx context.Context, campaignID string) (*model.Colony, error)
	GetColonyByCampaignForUpdate(ctx context.Context, campaignID string) (*model.Colony, error)
	UpdateColony(ctx context.Context, req *model.UpdateColonyRequest) (*model.Colony, error)
	RemoveColony(ctx context.Context, id, campaignID string) error
}

type WorkforceStore interface {
	SeedWorkforce(ctx context.Context, colonyID string) error
}

type Service struct {
	DB          Store
	WorkforceDB WorkforceStore
	Log         *slog.Logger
}

func (s *Service) Create(ctx context.Context, req *model.CreateColonyRequest) (*model.Colony, error) {
	colony, err := s.DB.CreateColony(ctx, req)
	if err != nil {
		if mapped := mapPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("create colony: %w", err)
	}
	if err := s.WorkforceDB.SeedWorkforce(ctx, colony.ID); err != nil {
		s.Log.ErrorContext(ctx, "failed to seed colony workforce", "colonyId", colony.ID, "error", err)
	}
	return colony, nil
}

func (s *Service) GetByCampaign(ctx context.Context, campaignID string) (*model.Colony, error) {
	colony, err := s.DB.GetColonyByCampaign(ctx, campaignID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get colony by campaign: %w", err)
	}
	return colony, nil
}

func (s *Service) Update(ctx context.Context, req *model.UpdateColonyRequest) (*model.Colony, error) {
	colony, err := s.DB.UpdateColony(ctx, req)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		if mapped := mapPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("update colony: %w", err)
	}
	return colony, nil
}

func (s *Service) AdvanceColonyDay(ctx context.Context, id, campaignID string) (*model.Colony, error) {
	var result *model.Colony
	err := s.DB.RunInTx(ctx, func(ctx context.Context, tx Store) error {
		colony, err := tx.GetColonyByCampaignForUpdate(ctx, campaignID)
		if err != nil {
			return err
		}

		lifespanDays := colony.LifespanDays + 1
		food := max(colony.Food-colony.ColonistCount, 0)

		var lastShipment sql.NullInt32
		if colony.ShipmentAt.Valid {
			lastShipmentVal := int32(0)
			if colony.LastShipment.Valid {
				lastShipmentVal = colony.LastShipment.Int32
			}
			if colony.ShipmentAt.Int32+lastShipmentVal-colony.LifespanDays == 0 {
				lastShipment = sql.NullInt32{Int32: lifespanDays, Valid: true}
			}
		}

		result, err = tx.UpdateColony(ctx, &model.UpdateColonyRequest{
			ID:           id,
			CampaignID:   campaignID,
			Food:         sql.NullInt32{Int32: food, Valid: true},
			LifespanDays: sql.NullInt32{Int32: lifespanDays, Valid: true},
			LastShipment: lastShipment,
		})
		return err
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("advance colony day: %w", err)
	}
	return result, nil
}

func (s *Service) Remove(ctx context.Context, id, campaignID string) error {
	if err := s.DB.RemoveColony(ctx, id, campaignID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		return fmt.Errorf("remove colony: %w", err)
	}
	return nil
}

func mapPgError(err error) error {
	if pg.IsError(err, pg.UniqueViolation) {
		return ErrAlreadyExists
	}
	if pg.IsError(err, pg.ForeignKeyViolation) {
		switch pg.Constraint(err) {
		case "fk_colony_campaign_id":
			return ErrInvalidCampaign
		}
	}
	return err
}
