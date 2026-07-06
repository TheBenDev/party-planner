package colony_workforce_test

import (
	"context"
	"log/slog"
	"testing"

	"connectrpc.com/connect"
	v1 "github.com/BBruington/party-planner/api/gen/planner/v1"
	"github.com/BBruington/party-planner/api/internal/domain/colony_workforce"
	model "github.com/BBruington/party-planner/api/internal/models"
)

type mockStore struct {
	workforce []*model.ColonyWorkforce
	err       error
}

func (m *mockStore) GetColonyByCampaign(_ context.Context, _, _ string) error { return m.err }
func (m *mockStore) ListWorkforceByColony(_ context.Context, _ string) ([]*model.ColonyWorkforce, error) {
	return m.workforce, m.err
}
func (m *mockStore) UpsertColonyWorkforce(_ context.Context, _ *model.UpsertColonyWorkforceRequest) (*model.ColonyWorkforce, error) {
	return m.one(), m.err
}

func (m *mockStore) one() *model.ColonyWorkforce {
	if len(m.workforce) == 0 {
		return nil
	}
	return m.workforce[0]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func testWorkforce() *model.ColonyWorkforce {
	return &model.ColonyWorkforce{
		ID:         "workforce-1",
		ColonyID:   "colony-1",
		WorkerType: model.WorkerTypeFarmer,
		Count:      10,
	}
}

func newServer(store colony_workforce.Store) *colony_workforce.Server {
	return &colony_workforce.Server{
		ColonyWorkforce: &colony_workforce.Service{DB: store, Log: slog.Default()},
		Log:             slog.Default(),
	}
}

func validationServer() *colony_workforce.Server {
	return &colony_workforce.Server{Log: slog.Default()}
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

func TestListColonyWorkforce_Validation(t *testing.T) {
	tests := []struct {
		name string
		req  *v1.ListColonyWorkforceRequest
	}{
		{"missing colony id", &v1.ListColonyWorkforceRequest{CampaignId: "campaign-1"}},
		{"missing campaign id", &v1.ListColonyWorkforceRequest{ColonyId: "colony-1"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := validationServer().ListColonyWorkforce(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

func TestUpsertColonyWorkforce_Validation(t *testing.T) {
	tests := []struct {
		name string
		req  *v1.UpsertColonyWorkforceRequest
	}{
		{"missing colony id", &v1.UpsertColonyWorkforceRequest{CampaignId: "campaign-1", WorkerType: v1.WorkerType_WORKER_TYPE_FARMER}},
		{"missing campaign id", &v1.UpsertColonyWorkforceRequest{ColonyId: "colony-1", WorkerType: v1.WorkerType_WORKER_TYPE_FARMER}},
		{"unspecified worker type", &v1.UpsertColonyWorkforceRequest{ColonyId: "colony-1", CampaignId: "campaign-1"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := validationServer().UpsertColonyWorkforce(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

// ── Happy path tests ──────────────────────────────────────────────────────────

func TestListColonyWorkforce_HappyPath(t *testing.T) {
	want := testWorkforce()
	resp, err := newServer(&mockStore{workforce: []*model.ColonyWorkforce{want}}).ListColonyWorkforce(context.Background(), connect.NewRequest(&v1.ListColonyWorkforceRequest{
		ColonyId:   want.ColonyID,
		CampaignId: "campaign-1",
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(resp.Msg.Workforce) != 1 || resp.Msg.Workforce[0].Id != want.ID {
		t.Errorf("got %v, want one workforce with id %q", resp.Msg.Workforce, want.ID)
	}
}

func TestUpsertColonyWorkforce_HappyPath(t *testing.T) {
	want := testWorkforce()
	resp, err := newServer(&mockStore{workforce: []*model.ColonyWorkforce{want}}).UpsertColonyWorkforce(context.Background(), connect.NewRequest(&v1.UpsertColonyWorkforceRequest{
		ColonyId:   want.ColonyID,
		CampaignId: "campaign-1",
		WorkerType: v1.WorkerType_WORKER_TYPE_FARMER,
		Count:      want.Count,
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Msg.Workforce.Id != want.ID {
		t.Errorf("got id %q, want %q", resp.Msg.Workforce.Id, want.ID)
	}
}
