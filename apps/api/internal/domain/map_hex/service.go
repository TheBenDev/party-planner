package map_hex

import (
	"context"
	"errors"
	"fmt"
	"log/slog"

	model "github.com/BBruington/party-planner/api/internal/models"
)

var ErrNotFound = errors.New("map hex not found")

type Store interface {
	GetCampaignMap(ctx context.Context, campaignID string) ([]*model.MapHex, error)
	UpsertMapHex(ctx context.Context, req *model.UpsertMapHexRequest) (*model.MapHex, error)
	ClearMapHex(ctx context.Context, campaignID string, q, r int32) error
}

type Service struct {
	DB  Store
	Log *slog.Logger
}

func (s *Service) GetCampaignMap(ctx context.Context, campaignID string) ([]*model.MapHex, error) {
	hexes, err := s.DB.GetCampaignMap(ctx, campaignID)
	if err != nil {
		return nil, fmt.Errorf("get campaign map: %w", err)
	}
	return hexes, nil
}

func (s *Service) UpsertMapHex(ctx context.Context, req *model.UpsertMapHexRequest) (*model.MapHex, error) {
	hex, err := s.DB.UpsertMapHex(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("upsert map hex: %w", err)
	}
	return hex, nil
}

func (s *Service) ClearMapHex(ctx context.Context, campaignID string, q, r int32) error {
	if err := s.DB.ClearMapHex(ctx, campaignID, q, r); err != nil {
		return fmt.Errorf("clear map hex: %w", err)
	}
	return nil
}
