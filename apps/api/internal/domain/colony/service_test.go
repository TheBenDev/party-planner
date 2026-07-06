package colony_test

import (
	"context"
	"database/sql"
	"errors"
	"log/slog"
	"testing"

	"github.com/BBruington/party-planner/api/internal/domain/colony"
	model "github.com/BBruington/party-planner/api/internal/models"
	"github.com/BBruington/party-planner/api/internal/pg"
	"github.com/jackc/pgx/v5/pgconn"
)

type mockServiceStore struct {
	colony *model.Colony

	createColonyErr        error
	getColonyByCampaignErr error
	updateColonyErr        error
	removeColonyErr        error
}

func (m *mockServiceStore) CreateColony(_ context.Context, _ *model.CreateColonyRequest) (*model.Colony, error) {
	return m.colony, m.createColonyErr
}
func (m *mockServiceStore) GetColonyByCampaign(_ context.Context, _ string) (*model.Colony, error) {
	return m.colony, m.getColonyByCampaignErr
}
func (m *mockServiceStore) UpdateColony(_ context.Context, _ *model.UpdateColonyRequest) (*model.Colony, error) {
	return m.colony, m.updateColonyErr
}
func (m *mockServiceStore) RemoveColony(_ context.Context, _, _ string) error {
	return m.removeColonyErr
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func newService(store colony.Store) *colony.Service {
	return &colony.Service{DB: store, Log: slog.Default()}
}

func pgUniqueViolation() error {
	return &pgconn.PgError{Code: pg.UniqueViolation}
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

// ── Create ────────────────────────────────────────────────────────────────────

func TestColonyServiceCreate_HappyPath(t *testing.T) {
	want := testColony()
	got, err := newService(&mockServiceStore{colony: want}).Create(context.Background(), &model.CreateColonyRequest{CampaignID: want.CampaignID})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != want.ID {
		t.Errorf("got id %q, want %q", got.ID, want.ID)
	}
}

func TestColonyServiceCreate_UniqueViolation(t *testing.T) {
	_, err := newService(&mockServiceStore{createColonyErr: pgUniqueViolation()}).Create(context.Background(), &model.CreateColonyRequest{})
	assertError(t, err, colony.ErrAlreadyExists)
}

func TestColonyServiceCreate_FK_InvalidCampaign(t *testing.T) {
	_, err := newService(&mockServiceStore{createColonyErr: pgFKViolation("fk_colony_campaign_id")}).Create(context.Background(), &model.CreateColonyRequest{})
	assertError(t, err, colony.ErrInvalidCampaign)
}

// ── GetByCampaign ─────────────────────────────────────────────────────────────

func TestColonyServiceGetByCampaign_HappyPath(t *testing.T) {
	want := testColony()
	got, err := newService(&mockServiceStore{colony: want}).GetByCampaign(context.Background(), want.CampaignID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != want.ID {
		t.Errorf("got id %q, want %q", got.ID, want.ID)
	}
}

func TestColonyServiceGetByCampaign_NotFound(t *testing.T) {
	_, err := newService(&mockServiceStore{getColonyByCampaignErr: sql.ErrNoRows}).GetByCampaign(context.Background(), "campaign-1")
	assertError(t, err, colony.ErrNotFound)
}

// ── Update ────────────────────────────────────────────────────────────────────

func TestColonyServiceUpdate_HappyPath(t *testing.T) {
	want := testColony()
	got, err := newService(&mockServiceStore{colony: want}).Update(context.Background(), &model.UpdateColonyRequest{ID: want.ID, CampaignID: want.CampaignID})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != want.ID {
		t.Errorf("got id %q, want %q", got.ID, want.ID)
	}
}

func TestColonyServiceUpdate_NotFound(t *testing.T) {
	_, err := newService(&mockServiceStore{updateColonyErr: sql.ErrNoRows}).Update(context.Background(), &model.UpdateColonyRequest{ID: "colony-1", CampaignID: "campaign-1"})
	assertError(t, err, colony.ErrNotFound)
}

func TestColonyServiceUpdate_FK_InvalidCampaign(t *testing.T) {
	_, err := newService(&mockServiceStore{updateColonyErr: pgFKViolation("fk_colony_campaign_id")}).Update(context.Background(), &model.UpdateColonyRequest{ID: "colony-1", CampaignID: "campaign-1"})
	assertError(t, err, colony.ErrInvalidCampaign)
}

// ── Remove ────────────────────────────────────────────────────────────────────

func TestColonyServiceRemove_HappyPath(t *testing.T) {
	want := testColony()
	if err := newService(&mockServiceStore{colony: want}).Remove(context.Background(), want.ID, want.CampaignID); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}
