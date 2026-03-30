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
	ErrNpcNotFound                  = errors.New("npc not found")
	ErrNpcAlreadyExists             = errors.New("npc already exists")
	ErrNpcInvalidCampaign           = errors.New("campaign does not exist")
	ErrNpcInvalidOriginLocation     = errors.New("origin location does not exist")
	ErrNpcInvalidCurrentLocation    = errors.New("current location does not exist")
	ErrNpcInvalidSessionEncountered = errors.New("session encountered does not exist")
)

type NpcService struct {
	DB  *db.DB
	Log *slog.Logger
}

func (s *NpcService) Create(npc *model.CreateNpcRequest) (*model.Npc, error) {
	created, err := s.DB.CreateNpc(npc)
	if err != nil {
		if mapped := mapNonPlayerCharacterPgError(err); mapped != err {
			return nil, mapped
		}
		return nil, fmt.Errorf("create npc error: %w", err)
	}
	return created, nil
}

func (s *NpcService) Get(id string) (*model.Npc, error) {
	npc, err := s.DB.GetNpc(id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNpcNotFound
		}
		return nil, fmt.Errorf("get npc error: %w", err)
	}
	return npc, nil
}

func (s *NpcService) ListByCampaign(campaignId string) ([]*model.Npc, error) {
	npcs, err := s.DB.ListNpcsByCampaign(campaignId)
	if err != nil {
		return nil, fmt.Errorf("list npcs by campaign error: %w", err)
	}
	return npcs, nil
}

func mapNonPlayerCharacterPgError(err error) error {
	if isPgError(err, pgErrUniqueViolation) {
		return ErrNpcAlreadyExists
	}
	if isPgError(err, pgErrForeignKeyViolation) {
		switch pgConstraint(err) {
		case "fk_npc_campaign_id":
			return ErrNpcInvalidCampaign
		case "fk_npc_origin_location_id":
			return ErrNpcInvalidOriginLocation
		case "fk_npc_current_location_id":
			return ErrNpcInvalidCurrentLocation
		case "fk_npc_session_encountered_id":
			return ErrNpcInvalidSessionEncountered
		}
	}
	return err
}
