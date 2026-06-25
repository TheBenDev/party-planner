package npc

import (
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
	CreateNpc(npc *model.CreateNpcRequest) (*model.Npc, error)
	GetNpc(id, campaignID string) (*model.Npc, error)
	ListNpcsByCampaign(campaignID string) ([]*model.Npc, error)
	GetNpcByNameAndCampaign(name, campaignID string) (*model.Npc, error)
	UpdateNpc(npc *model.UpdateNpcRequest) (*model.Npc, error)
	RemoveNpc(id, campaignID string) error
}

type Service struct {
	DB  Store
	Log *slog.Logger
}

func (s *Service) Create(npc *model.CreateNpcRequest) (*model.Npc, error) {
	created, err := s.DB.CreateNpc(npc)
	if err != nil {
		if mapped := mapPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("create npc: %w", err)
	}
	return created, nil
}

func (s *Service) GetByID(id, campaignID string) (*model.Npc, error) {
	npc, err := s.DB.GetNpc(id, campaignID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get npc: %w", err)
	}
	return npc, nil
}

func (s *Service) ListByCampaign(campaignID string) ([]*model.Npc, error) {
	npcs, err := s.DB.ListNpcsByCampaign(campaignID)
	if err != nil {
		return nil, fmt.Errorf("list npcs by campaign: %w", err)
	}
	return npcs, nil
}

func (s *Service) GetByNameAndCampaign(name, campaignID string) (*model.Npc, error) {
	npc, err := s.DB.GetNpcByNameAndCampaign(name, campaignID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get npc by name and campaign: %w", err)
	}
	return npc, nil
}

func (s *Service) Update(npc *model.UpdateNpcRequest) (*model.Npc, error) {
	_, err := s.GetByID(npc.ID, npc.CampaignID)
	if err != nil {
		return nil, err
	}

	updated, err := s.DB.UpdateNpc(npc)
	if err != nil {
		if mapped := mapPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("update npc: %w", err)
	}
	return updated, nil
}

func (s *Service) Remove(id, campaignID string) error {
	_, err := s.GetByID(id, campaignID)
	if err != nil {
		return err
	}

	if err := s.DB.RemoveNpc(id, campaignID); err != nil {
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
