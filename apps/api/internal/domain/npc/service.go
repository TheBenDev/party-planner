package npc

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"

	"github.com/BBruington/party-planner/api/internal/pg"
	model "github.com/BBruington/party-planner/api/internal/models"
)

// Domain errors.
var (
	ErrNotFound                  = errors.New("npc not found")
	ErrAlreadyExists             = errors.New("npc already exists")
	ErrInvalidCampaign           = errors.New("campaign does not exist")
	ErrInvalidCurrentLocation    = errors.New("current location does not exist")
	ErrInvalidOriginLocation     = errors.New("origin location does not exist")
	ErrInvalidSessionEncountered = errors.New("session encountered does not exist")
)

type Store interface {
	CreateNpc(ctx context.Context, npc *model.CreateNpcRequest) (*model.Npc, error)
	GetNpc(ctx context.Context, id, campaignID string) (*model.Npc, error)
	ListNpcsByCampaign(ctx context.Context, campaignID string) ([]*model.Npc, error)
	GetNpcByNameAndCampaign(ctx context.Context, name, campaignID string) (*model.Npc, error)
	UpdateNpc(ctx context.Context, npc *model.UpdateNpcRequest) (*model.Npc, error)
	RemoveNpc(ctx context.Context, id, campaignID string) error
}

type Service struct {
	DB  Store
	Log *slog.Logger
}

func (s *Service) Create(ctx context.Context, npc *model.CreateNpcRequest) (*model.Npc, error) {
	created, err := s.DB.CreateNpc(ctx, npc)
	if err != nil {
		if mapped := mapPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("create npc: %w", err)
	}
	return created, nil
}

func (s *Service) GetByID(ctx context.Context, id, campaignID string) (*model.Npc, error) {
	npc, err := s.DB.GetNpc(ctx, id, campaignID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get npc: %w", err)
	}
	return npc, nil
}

func (s *Service) ListByCampaign(ctx context.Context, campaignID string) ([]*model.Npc, error) {
	npcs, err := s.DB.ListNpcsByCampaign(ctx, campaignID)
	if err != nil {
		return nil, fmt.Errorf("list npcs by campaign: %w", err)
	}
	return npcs, nil
}

func (s *Service) GetByNameAndCampaign(ctx context.Context, name, campaignID string) (*model.Npc, error) {
	npc, err := s.DB.GetNpcByNameAndCampaign(ctx, name, campaignID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get npc by name and campaign: %w", err)
	}
	return npc, nil
}

func (s *Service) Update(ctx context.Context, npc *model.UpdateNpcRequest) (*model.Npc, error) {
	_, err := s.GetByID(ctx, npc.ID, npc.CampaignID)
	if err != nil {
		return nil, err
	}

	updated, err := s.DB.UpdateNpc(ctx, npc)
	if err != nil {
		if mapped := mapPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("update npc: %w", err)
	}
	return updated, nil
}

func (s *Service) Remove(ctx context.Context, id, campaignID string) error {
	_, err := s.GetByID(ctx, id, campaignID)
	if err != nil {
		return err
	}

	if err := s.DB.RemoveNpc(ctx, id, campaignID); err != nil {
		return fmt.Errorf("remove npc: %w", err)
	}
	return nil
}

func mapPgError(err error) error {
	if pg.IsError(err, pg.UniqueViolation) {
		return ErrAlreadyExists
	}
	if pg.IsError(err, pg.ForeignKeyViolation) {
		switch pg.Constraint(err) {
		case "fk_npc_campaign_id":
			return ErrInvalidCampaign
		case "fk_npc_origin_location_id":
			return ErrInvalidOriginLocation
		case "fk_npc_current_location_id":
			return ErrInvalidCurrentLocation
		case "fk_npc_session_encountered_id":
			return ErrInvalidSessionEncountered
		}
	}
	return err
}
