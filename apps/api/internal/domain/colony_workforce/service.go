package colony_workforce

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
	ErrNotFound       = errors.New("colony workforce not found")
	ErrColonyNotFound = errors.New("colony not found")
	ErrInvalidColony  = errors.New("colony does not exist or does not belong to campaign")
)

type Store interface {
	GetColonyByCampaign(ctx context.Context, colonyID, campaignID string) error
	ListWorkforceByColony(ctx context.Context, colonyID string) ([]*model.ColonyWorkforce, error)
	SeedWorkforce(ctx context.Context, colonyID string) error
	UpsertColonyWorkforces(ctx context.Context, req *model.UpsertColonyWorkforceRequest) ([]*model.ColonyWorkforce, error)
}

type Service struct {
	DB  Store
	Log *slog.Logger
}

func (s *Service) SeedWorkforce(ctx context.Context, colonyID string) error {
	if err := s.DB.SeedWorkforce(ctx, colonyID); err != nil {
		return fmt.Errorf("seed workforce: %w", err)
	}
	return nil
}

func (s *Service) ListByColony(ctx context.Context, colonyID, campaignID string) ([]*model.ColonyWorkforce, error) {
	if err := s.DB.GetColonyByCampaign(ctx, colonyID, campaignID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrColonyNotFound
		}
		return nil, fmt.Errorf("verify colony: %w", err)
	}
	workforce, err := s.DB.ListWorkforceByColony(ctx, colonyID)
	if err != nil {
		return nil, fmt.Errorf("list workforce by colony: %w", err)
	}
	return workforce, nil
}

func (s *Service) UpsertMany(ctx context.Context, req *model.UpsertColonyWorkforceRequest) ([]*model.ColonyWorkforce, error) {
	if err := s.DB.GetColonyByCampaign(ctx, req.ColonyID, req.CampaignID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrColonyNotFound
		}
		return nil, fmt.Errorf("verify colony: %w", err)
	}
	workforces, err := s.DB.UpsertColonyWorkforces(ctx, req)
	if err != nil {
		if mapped := mapPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("upsert colony workforce: %w", err)
	}
	return workforces, nil
}

func mapPgError(err error) error {
	if pg.IsError(err, pg.ForeignKeyViolation) {
		switch pg.Constraint(err) {
		case "fk_colony_workforce_colony_id":
			return ErrInvalidColony
		}
	}
	return err
}
