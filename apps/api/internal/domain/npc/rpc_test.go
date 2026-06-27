package npc_test

import (
	"context"
	"log/slog"
	"testing"

	"connectrpc.com/connect"
	v1 "github.com/BBruington/party-planner/api/gen/planner/v1"
	"github.com/BBruington/party-planner/api/internal/domain/npc"
	model "github.com/BBruington/party-planner/api/internal/models"
)

type mockStore struct {
	npcs []*model.Npc
	err  error
}

func (m *mockStore) CreateNpc(_ context.Context, _ *model.CreateNpcRequest) (*model.Npc, error) {
	return m.one(), m.err
}
func (m *mockStore) GetNpc(_ context.Context, _, _ string) (*model.Npc, error) {
	return m.one(), m.err
}
func (m *mockStore) ListNpcsByCampaign(_ context.Context, _ string) ([]*model.Npc, error) {
	return m.npcs, m.err
}
func (m *mockStore) GetNpcByNameAndCampaign(_ context.Context, _, _ string) (*model.Npc, error) {
	return m.one(), m.err
}
func (m *mockStore) UpdateNpc(_ context.Context, _ *model.UpdateNpcRequest) (*model.Npc, error) {
	return m.one(), m.err
}
func (m *mockStore) RemoveNpc(_ context.Context, _, _ string) error { return m.err }

func (m *mockStore) one() *model.Npc {
	if len(m.npcs) == 0 {
		return nil
	}
	return m.npcs[0]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func testNpc() *model.Npc {
	return &model.Npc{
		ID:                    "npc-1",
		CampaignID:            "campaign-1",
		Name:                  "Tavern Keeper",
		Status:                model.CharacterStatusAlive,
		RelationToPartyStatus: model.RelationToPartyAlly,
		Aliases:               []string{},
	}
}

func newServer(store npc.Store) *npc.Server {
	return &npc.Server{
		Npc: &npc.Service{DB: store, Log: slog.Default()},
		Log: slog.Default(),
	}
}

func validationServer() *npc.Server {
	return &npc.Server{Log: slog.Default()}
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

// ── Validation tests ──────────────────────────────────────────────────────────

func TestCreateNpc_Validation(t *testing.T) {
	server := validationServer()
	tests := []struct {
		name string
		req  *v1.CreateNpcRequest
	}{
		{"missing campaign id", &v1.CreateNpcRequest{
			Name:                  "Keeper",
			Status:                v1.CharacterStatus_CHARACTER_STATUS_ALIVE,
			RelationToPartyStatus: v1.RelationToParty_RELATION_TO_PARTY_ALLY,
		}},
		{"missing name", &v1.CreateNpcRequest{
			CampaignId:            "campaign-1",
			Status:                v1.CharacterStatus_CHARACTER_STATUS_ALIVE,
			RelationToPartyStatus: v1.RelationToParty_RELATION_TO_PARTY_ALLY,
		}},
		{"missing status", &v1.CreateNpcRequest{
			CampaignId:            "campaign-1",
			Name:                  "Keeper",
			RelationToPartyStatus: v1.RelationToParty_RELATION_TO_PARTY_ALLY,
		}},
		{"missing relation to party", &v1.CreateNpcRequest{
			CampaignId: "campaign-1",
			Name:       "Keeper",
			Status:     v1.CharacterStatus_CHARACTER_STATUS_ALIVE,
		}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.CreateNpc(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

func TestGetNpc_Validation(t *testing.T) {
	server := validationServer()
	tests := []struct {
		name string
		req  *v1.GetNpcRequest
	}{
		{"missing id", &v1.GetNpcRequest{CampaignId: "campaign-1"}},
		{"missing campaign id", &v1.GetNpcRequest{Id: "npc-1"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.GetNpc(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

func TestUpdateNpc_Validation(t *testing.T) {
	server := validationServer()
	tests := []struct {
		name string
		req  *v1.UpdateNpcRequest
	}{
		{"missing id", &v1.UpdateNpcRequest{CampaignId: "campaign-1"}},
		{"missing campaign id", &v1.UpdateNpcRequest{Id: "npc-1"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.UpdateNpc(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

func TestRemoveNpc_Validation(t *testing.T) {
	server := validationServer()
	tests := []struct {
		name string
		req  *v1.RemoveNpcRequest
	}{
		{"missing id", &v1.RemoveNpcRequest{CampaignId: "campaign-1"}},
		{"missing campaign id", &v1.RemoveNpcRequest{Id: "npc-1"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.RemoveNpc(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

// ── Happy path tests ──────────────────────────────────────────────────────────

func TestCreateNpc_HappyPath(t *testing.T) {
	want := testNpc()
	server := newServer(&mockStore{npcs: []*model.Npc{want}})

	resp, err := server.CreateNpc(context.Background(), connect.NewRequest(&v1.CreateNpcRequest{
		CampaignId:            want.CampaignID,
		Name:                  want.Name,
		Status:                v1.CharacterStatus_CHARACTER_STATUS_ALIVE,
		RelationToPartyStatus: v1.RelationToParty_RELATION_TO_PARTY_ALLY,
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Msg.Npc.Id != want.ID {
		t.Errorf("got id %q, want %q", resp.Msg.Npc.Id, want.ID)
	}
	if resp.Msg.Npc.Name != want.Name {
		t.Errorf("got name %q, want %q", resp.Msg.Npc.Name, want.Name)
	}
}

func TestGetNpc_HappyPath(t *testing.T) {
	want := testNpc()
	server := newServer(&mockStore{npcs: []*model.Npc{want}})

	resp, err := server.GetNpc(context.Background(), connect.NewRequest(&v1.GetNpcRequest{
		Id:         want.ID,
		CampaignId: want.CampaignID,
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Msg.Npc.Id != want.ID {
		t.Errorf("got id %q, want %q", resp.Msg.Npc.Id, want.ID)
	}
}
