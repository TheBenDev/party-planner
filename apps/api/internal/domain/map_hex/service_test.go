package map_hex_test

import (
	"context"
	"errors"
	"log/slog"
	"testing"

	map_hex "github.com/BBruington/party-planner/api/internal/domain/map_hex"
	model "github.com/BBruington/party-planner/api/internal/models"
)

type mockStore struct {
	hex   *model.MapHex
	hexes []*model.MapHex

	getCampaignMapErr error
	upsertMapHexErr   error
	clearMapHexErr    error
}

func (m *mockStore) GetCampaignMap(_ context.Context, _ string) ([]*model.MapHex, error) {
	return m.hexes, m.getCampaignMapErr
}

func (m *mockStore) UpsertMapHex(_ context.Context, _ *model.UpsertMapHexRequest) (*model.MapHex, error) {
	return m.hex, m.upsertMapHexErr
}

func (m *mockStore) ClearMapHex(_ context.Context, _ string, _, _ int32) error {
	return m.clearMapHexErr
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func newService(store map_hex.Store) *map_hex.Service {
	return &map_hex.Service{DB: store, Log: slog.Default()}
}

func assertError(t *testing.T, err error, want error) {
	t.Helper()
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !errors.Is(err, want) {
		t.Errorf("got %v, want %v", err, want)
	}
}

// ── GetCampaignMap ────────────────────────────────────────────────────────────

func TestMapHexServiceGetCampaignMap_HappyPath(t *testing.T) {
	want := testMapHex()
	hexes, err := newService(&mockStore{hexes: []*model.MapHex{want}}).GetCampaignMap(context.Background(), "campaign-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(hexes) != 1 {
		t.Fatalf("got %d hexes, want 1", len(hexes))
	}
	if hexes[0].ID != want.ID {
		t.Errorf("got id %q, want %q", hexes[0].ID, want.ID)
	}
}

func TestMapHexServiceGetCampaignMap_StoreError(t *testing.T) {
	storeErr := errors.New("db failure")
	_, err := newService(&mockStore{getCampaignMapErr: storeErr}).GetCampaignMap(context.Background(), "campaign-1")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

// ── UpsertMapHex ──────────────────────────────────────────────────────────────

func TestMapHexServiceUpsertMapHex_HappyPath(t *testing.T) {
	want := testMapHex()
	got, err := newService(&mockStore{hex: want}).UpsertMapHex(context.Background(), &model.UpsertMapHexRequest{
		CampaignID: "campaign-1",
		Q:          want.Q,
		R:          want.R,
		Terrain:    want.Terrain,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != want.ID {
		t.Errorf("got id %q, want %q", got.ID, want.ID)
	}
}

func TestMapHexServiceUpsertMapHex_StoreError(t *testing.T) {
	storeErr := errors.New("db failure")
	_, err := newService(&mockStore{upsertMapHexErr: storeErr}).UpsertMapHex(context.Background(), &model.UpsertMapHexRequest{})
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

// ── ClearMapHex ───────────────────────────────────────────────────────────────

func TestMapHexServiceClearMapHex_HappyPath(t *testing.T) {
	err := newService(&mockStore{}).ClearMapHex(context.Background(), "campaign-1", 2, -1)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestMapHexServiceClearMapHex_StoreError(t *testing.T) {
	storeErr := errors.New("db failure")
	err := newService(&mockStore{clearMapHexErr: storeErr}).ClearMapHex(context.Background(), "campaign-1", 2, -1)
	assertError(t, err, storeErr)
}
