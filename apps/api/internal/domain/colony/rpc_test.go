package colony_test

import (
	"context"
	"log/slog"
	"testing"

	"connectrpc.com/connect"
	v1 "github.com/BBruington/party-planner/api/gen/planner/v1"
	"github.com/BBruington/party-planner/api/internal/domain/colony"
	model "github.com/BBruington/party-planner/api/internal/models"
)

type mockStore struct {
	colonies []*model.Colony
	err      error
}
type mockWorkforceStore struct {
	err error
}

func (m *mockWorkforceStore) SeedWorkforce(_ context.Context, _ string) error { return m.err }

func (m *mockStore) CreateColony(_ context.Context, _ *model.CreateColonyRequest) (*model.Colony, error) {
	return m.one(), m.err
}
func (m *mockStore) GetColonyByCampaign(_ context.Context, _ string) (*model.Colony, error) {
	return m.one(), m.err
}
func (m *mockStore) UpdateColony(_ context.Context, _ *model.UpdateColonyRequest) (*model.Colony, error) {
	return m.one(), m.err
}
func (m *mockStore) RemoveColony(_ context.Context, _, _ string) error { return m.err }

func (m *mockStore) one() *model.Colony {
	if len(m.colonies) == 0 {
		return nil
	}
	return m.colonies[0]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func testColony() *model.Colony {
	return &model.Colony{
		ID:         "colony-1",
		CampaignID: "campaign-1",
	}
}

func newServer(store colony.Store) *colony.Server {
	return &colony.Server{
		Colony: &colony.Service{DB: store, WorkforceDB: &mockWorkforceStore{}, Log: slog.Default()},
		Log:    slog.Default(),
	}
}

func validationServer() *colony.Server {
	return &colony.Server{Log: slog.Default()}
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

func TestCreateColony_Validation(t *testing.T) {
	_, err := validationServer().CreateColony(context.Background(), connect.NewRequest(&v1.CreateColonyRequest{}))
	assertCode(t, err, connect.CodeInvalidArgument)
}

func TestGetColonyByCampaign_Validation(t *testing.T) {
	_, err := validationServer().GetColonyByCampaign(context.Background(), connect.NewRequest(&v1.GetColonyByCampaignRequest{}))
	assertCode(t, err, connect.CodeInvalidArgument)
}

func TestUpdateColony_Validation(t *testing.T) {
	tests := []struct {
		name string
		req  *v1.UpdateColonyRequest
	}{
		{"missing id", &v1.UpdateColonyRequest{CampaignId: "campaign-1"}},
		{"missing campaign id", &v1.UpdateColonyRequest{Id: "colony-1"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := validationServer().UpdateColony(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

func TestRemoveColony_Validation(t *testing.T) {
	tests := []struct {
		name string
		req  *v1.RemoveColonyRequest
	}{
		{"missing id", &v1.RemoveColonyRequest{CampaignId: "campaign-1"}},
		{"missing campaign id", &v1.RemoveColonyRequest{Id: "colony-1"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := validationServer().RemoveColony(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

// ── Happy path tests ──────────────────────────────────────────────────────────

func TestCreateColony_HappyPath(t *testing.T) {
	want := testColony()
	resp, err := newServer(&mockStore{colonies: []*model.Colony{want}}).CreateColony(context.Background(), connect.NewRequest(&v1.CreateColonyRequest{
		CampaignId: want.CampaignID,
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Msg.Colony.Id != want.ID {
		t.Errorf("got id %q, want %q", resp.Msg.Colony.Id, want.ID)
	}
}

func TestGetColonyByCampaign_HappyPath(t *testing.T) {
	want := testColony()
	resp, err := newServer(&mockStore{colonies: []*model.Colony{want}}).GetColonyByCampaign(context.Background(), connect.NewRequest(&v1.GetColonyByCampaignRequest{
		CampaignId: want.CampaignID,
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Msg.Colony.Id != want.ID {
		t.Errorf("got id %q, want %q", resp.Msg.Colony.Id, want.ID)
	}
}

func TestUpdateColony_HappyPath(t *testing.T) {
	want := testColony()
	resp, err := newServer(&mockStore{colonies: []*model.Colony{want}}).UpdateColony(context.Background(), connect.NewRequest(&v1.UpdateColonyRequest{
		Id:         want.ID,
		CampaignId: want.CampaignID,
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Msg.Colony.Id != want.ID {
		t.Errorf("got id %q, want %q", resp.Msg.Colony.Id, want.ID)
	}
}

func TestRemoveColony_HappyPath(t *testing.T) {
	want := testColony()
	_, err := newServer(&mockStore{colonies: []*model.Colony{want}}).RemoveColony(context.Background(), connect.NewRequest(&v1.RemoveColonyRequest{
		Id:         want.ID,
		CampaignId: want.CampaignID,
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}
