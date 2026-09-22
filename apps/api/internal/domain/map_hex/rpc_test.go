package map_hex_test

import (
	"context"
	"log/slog"
	"testing"

	"connectrpc.com/connect"
	v1 "github.com/BBruington/party-planner/api/gen/planner/v1"
	map_hex "github.com/BBruington/party-planner/api/internal/domain/map_hex"
	model "github.com/BBruington/party-planner/api/internal/models"
)

// ── Helpers ───────────────────────────────────────────────────────────────────

func testMapHex() *model.MapHex {
	return &model.MapHex{
		ID:         "hex-1",
		CampaignID: "campaign-1",
		Q:          2,
		R:          -1,
		Terrain:    "forest",
	}
}

func newServer(store map_hex.Store) *map_hex.Server {
	svc := map_hex.Service{DB: store, Log: slog.Default()}
	return &map_hex.Server{Map: &svc, Log: slog.Default()}
}

func validationServer() *map_hex.Server {
	return &map_hex.Server{Log: slog.Default()}
}

func assertCode(t *testing.T, err error, want connect.Code) {
	t.Helper()
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if connect.CodeOf(err) != want {
		t.Errorf("got code %v, want %v", connect.CodeOf(err), want)
	}
}

// ── Validation ────────────────────────────────────────────────────────────────

func TestGetCampaignMap_Validation(t *testing.T) {
	_, err := validationServer().GetCampaignMap(context.Background(), connect.NewRequest(&v1.GetCampaignMapRequest{}))
	assertCode(t, err, connect.CodeInvalidArgument)
}

func TestUpsertMapHex_Validation(t *testing.T) {
	server := validationServer()
	tests := []struct {
		name string
		req  *v1.UpsertMapHexRequest
	}{
		{"missing campaign id", &v1.UpsertMapHexRequest{Terrain: "forest"}},
		{"missing terrain", &v1.UpsertMapHexRequest{CampaignId: "campaign-1"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.UpsertMapHex(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

func TestClearMapHex_Validation(t *testing.T) {
	_, err := validationServer().ClearMapHex(context.Background(), connect.NewRequest(&v1.ClearMapHexRequest{}))
	assertCode(t, err, connect.CodeInvalidArgument)
}

// ── Happy paths ───────────────────────────────────────────────────────────────

func TestGetCampaignMap_HappyPath(t *testing.T) {
	want := testMapHex()
	server := newServer(&mockStore{hexes: []*model.MapHex{want}})

	resp, err := server.GetCampaignMap(context.Background(), connect.NewRequest(&v1.GetCampaignMapRequest{
		CampaignId: "campaign-1",
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(resp.Msg.Hexes) != 1 {
		t.Fatalf("got %d hexes, want 1", len(resp.Msg.Hexes))
	}
	if resp.Msg.Hexes[0].Id != want.ID {
		t.Errorf("got id %q, want %q", resp.Msg.Hexes[0].Id, want.ID)
	}
}

func TestUpsertMapHex_HappyPath(t *testing.T) {
	want := testMapHex()
	server := newServer(&mockStore{hex: want})

	resp, err := server.UpsertMapHex(context.Background(), connect.NewRequest(&v1.UpsertMapHexRequest{
		CampaignId: "campaign-1",
		Q:          want.Q,
		R:          want.R,
		Terrain:    want.Terrain,
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Msg.Hex.Id != want.ID {
		t.Errorf("got id %q, want %q", resp.Msg.Hex.Id, want.ID)
	}
	if resp.Msg.Hex.Terrain != want.Terrain {
		t.Errorf("got terrain %q, want %q", resp.Msg.Hex.Terrain, want.Terrain)
	}
}

func TestClearMapHex_HappyPath(t *testing.T) {
	server := newServer(&mockStore{})

	_, err := server.ClearMapHex(context.Background(), connect.NewRequest(&v1.ClearMapHexRequest{
		CampaignId: "campaign-1",
		Q:          2,
		R:          -1,
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}
