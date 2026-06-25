package npc_test

import (
	"database/sql"
	"errors"
	"log/slog"
	"testing"

	"github.com/BBruington/party-planner/api/internal/domain/npc"
	model "github.com/BBruington/party-planner/api/internal/models"
	"github.com/BBruington/party-planner/api/internal/pg"
	"github.com/jackc/pgx/v5/pgconn"
)

type mockServiceStore struct {
	npc *model.Npc

	createNpcErr error
	getNpcErr    error
	updateNpcErr error
	removeNpcErr error
}

func (m *mockServiceStore) CreateNpc(_ *model.CreateNpcRequest) (*model.Npc, error) {
	return m.npc, m.createNpcErr
}
func (m *mockServiceStore) GetNpc(_, _ string) (*model.Npc, error) {
	return m.npc, m.getNpcErr
}
func (m *mockServiceStore) ListNpcsByCampaign(_ string) ([]*model.Npc, error) {
	return nil, nil
}
func (m *mockServiceStore) GetNpcByNameAndCampaign(_, _ string) (*model.Npc, error) {
	return m.npc, m.getNpcErr
}
func (m *mockServiceStore) UpdateNpc(_ *model.UpdateNpcRequest) (*model.Npc, error) {
	return m.npc, m.updateNpcErr
}
func (m *mockServiceStore) RemoveNpc(_, _ string) error {
	return m.removeNpcErr
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func newService(store npc.Store) *npc.Service {
	return &npc.Service{DB: store, Log: slog.Default()}
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

func TestNpcServiceCreate_HappyPath(t *testing.T) {
	want := testNpc()
	got, err := newService(&mockServiceStore{npc: want}).Create(&model.CreateNpcRequest{CampaignID: want.CampaignID, Name: want.Name})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != want.ID {
		t.Errorf("got id %q, want %q", got.ID, want.ID)
	}
}

func TestNpcServiceCreate_UniqueViolation(t *testing.T) {
	_, err := newService(&mockServiceStore{createNpcErr: pgUniqueViolation()}).Create(&model.CreateNpcRequest{})
	assertError(t, err, npc.ErrAlreadyExists)
}

func TestNpcServiceCreate_FK_InvalidCampaign(t *testing.T) {
	_, err := newService(&mockServiceStore{createNpcErr: pgFKViolation("fk_npc_campaign_id")}).Create(&model.CreateNpcRequest{})
	assertError(t, err, npc.ErrInvalidCampaign)
}

func TestNpcServiceCreate_FK_InvalidOriginLocation(t *testing.T) {
	_, err := newService(&mockServiceStore{createNpcErr: pgFKViolation("fk_npc_origin_location_id")}).Create(&model.CreateNpcRequest{})
	assertError(t, err, npc.ErrInvalidOriginLocation)
}

func TestNpcServiceCreate_FK_InvalidCurrentLocation(t *testing.T) {
	_, err := newService(&mockServiceStore{createNpcErr: pgFKViolation("fk_npc_current_location_id")}).Create(&model.CreateNpcRequest{})
	assertError(t, err, npc.ErrInvalidCurrentLocation)
}

func TestNpcServiceCreate_FK_InvalidSessionEncountered(t *testing.T) {
	_, err := newService(&mockServiceStore{createNpcErr: pgFKViolation("fk_npc_session_encountered_id")}).Create(&model.CreateNpcRequest{})
	assertError(t, err, npc.ErrInvalidSessionEncountered)
}

// ── GetByID ───────────────────────────────────────────────────────────────────

func TestNpcServiceGetByID_HappyPath(t *testing.T) {
	want := testNpc()
	got, err := newService(&mockServiceStore{npc: want}).GetByID(want.ID, want.CampaignID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != want.ID {
		t.Errorf("got id %q, want %q", got.ID, want.ID)
	}
}

func TestNpcServiceGetByID_NotFound(t *testing.T) {
	_, err := newService(&mockServiceStore{getNpcErr: sql.ErrNoRows}).GetByID("npc-1", "campaign-1")
	assertError(t, err, npc.ErrNotFound)
}

// ── Update ────────────────────────────────────────────────────────────────────

func TestNpcServiceUpdate_HappyPath(t *testing.T) {
	want := testNpc()
	got, err := newService(&mockServiceStore{npc: want}).Update(&model.UpdateNpcRequest{ID: want.ID, CampaignID: want.CampaignID})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != want.ID {
		t.Errorf("got id %q, want %q", got.ID, want.ID)
	}
}

func TestNpcServiceUpdate_NotFound(t *testing.T) {
	_, err := newService(&mockServiceStore{getNpcErr: sql.ErrNoRows}).Update(&model.UpdateNpcRequest{ID: "npc-1", CampaignID: "campaign-1"})
	assertError(t, err, npc.ErrNotFound)
}

// ── Remove ────────────────────────────────────────────────────────────────────

func TestNpcServiceRemove_HappyPath(t *testing.T) {
	want := testNpc()
	if err := newService(&mockServiceStore{npc: want}).Remove(want.ID, want.CampaignID); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestNpcServiceRemove_NotFound(t *testing.T) {
	err := newService(&mockServiceStore{getNpcErr: sql.ErrNoRows}).Remove("npc-1", "campaign-1")
	assertError(t, err, npc.ErrNotFound)
}
