package colony_workforce_test

import (
	"context"
	"database/sql"
	"errors"
	"log/slog"
	"testing"

	"github.com/BBruington/party-planner/api/internal/domain/colony_workforce"
	model "github.com/BBruington/party-planner/api/internal/models"
	"github.com/BBruington/party-planner/api/internal/pg"
	"github.com/jackc/pgx/v5/pgconn"
)

type mockServiceStore struct {
	workforceList []*model.ColonyWorkforce

	getColonyByCampaignErr error
	listWorkforceErr       error
	upsertWorkforceErr     error
	seedWorkForceErr       error
}

func (m *mockServiceStore) GetColonyByCampaign(_ context.Context, _, _ string) error {
	return m.getColonyByCampaignErr
}
func (m *mockServiceStore) ListWorkforceByColony(_ context.Context, _ string) ([]*model.ColonyWorkforce, error) {
	return m.workforceList, m.listWorkforceErr
}
func (m *mockServiceStore) UpsertColonyWorkforces(_ context.Context, _ *model.UpsertColonyWorkforceRequest) ([]*model.ColonyWorkforce, error) {
	return m.workforceList, m.upsertWorkforceErr
}
func (m *mockServiceStore) SeedWorkforce(_ context.Context, _ string) error {
	return m.seedWorkForceErr
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func newService(store colony_workforce.Store) *colony_workforce.Service {
	return &colony_workforce.Service{DB: store, Log: slog.Default()}
}

func pgFKViolation(constraint string) error {
	return &pgconn.PgError{Code: pg.ForeignKeyViolation, ConstraintName: constraint}
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

// ── ListByColony ──────────────────────────────────────────────────────────────

func TestWorkforceServiceListByColony_HappyPath(t *testing.T) {
	want := testWorkforce()
	got, err := newService(&mockServiceStore{workforceList: []*model.ColonyWorkforce{want}}).ListByColony(context.Background(), want.ColonyID, "campaign-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 1 || got[0].ID != want.ID {
		t.Errorf("got %v, want one workforce with id %q", got, want.ID)
	}
}

func TestWorkforceServiceListByColony_ColonyNotFound(t *testing.T) {
	_, err := newService(&mockServiceStore{getColonyByCampaignErr: sql.ErrNoRows}).ListByColony(context.Background(), "colony-1", "campaign-1")
	assertError(t, err, colony_workforce.ErrColonyNotFound)
}

// ── UpsertMany ────────────────────────────────────────────────────────────────

func TestWorkforceServiceUpsertMany_HappyPath(t *testing.T) {
	want := testWorkforce()
	got, err := newService(&mockServiceStore{workforceList: []*model.ColonyWorkforce{want}}).UpsertMany(context.Background(), &model.UpsertColonyWorkforceRequest{
		ColonyID:   want.ColonyID,
		CampaignID: "campaign-1",
		Workforces: []*model.WorkforceItem{{WorkerType: want.WorkerType, Count: want.Count}},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 1 || got[0].ID != want.ID {
		t.Errorf("got %v, want one workforce with id %q", got, want.ID)
	}
}

func TestWorkforceServiceUpsertMany_ColonyNotFound(t *testing.T) {
	_, err := newService(&mockServiceStore{getColonyByCampaignErr: sql.ErrNoRows}).UpsertMany(context.Background(), &model.UpsertColonyWorkforceRequest{
		ColonyID:   "colony-1",
		CampaignID: "campaign-1",
		Workforces: []*model.WorkforceItem{{WorkerType: model.WorkerTypeFarmer, Count: 1}},
	})
	assertError(t, err, colony_workforce.ErrColonyNotFound)
}

func TestWorkforceServiceUpsertMany_FK_InvalidColony(t *testing.T) {
	_, err := newService(&mockServiceStore{upsertWorkforceErr: pgFKViolation("fk_colony_workforce_colony_id")}).UpsertMany(context.Background(), &model.UpsertColonyWorkforceRequest{
		ColonyID:   "colony-1",
		CampaignID: "campaign-1",
		Workforces: []*model.WorkforceItem{{WorkerType: model.WorkerTypeFarmer, Count: 1}},
	})
	assertError(t, err, colony_workforce.ErrInvalidColony)
}
