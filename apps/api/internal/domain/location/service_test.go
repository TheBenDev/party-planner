package location_test

import (
	"database/sql"
	"errors"
	"log/slog"
	"testing"

	"github.com/BBruington/party-planner/api/internal/domain/location"
	model "github.com/BBruington/party-planner/api/internal/models"
	"github.com/BBruington/party-planner/api/internal/pg"
	"github.com/jackc/pgx/v5/pgconn"
)

type mockServiceStore struct {
	location *model.Location

	createLocationErr error
	getLocationErr    error
	updateLocationErr error
	deleteLocationErr error
}

func (m *mockServiceStore) CreateLocation(_ *model.CreateLocationRequest) (*model.Location, error) {
	return m.location, m.createLocationErr
}
func (m *mockServiceStore) GetLocation(_, _ string) (*model.Location, error) {
	return m.location, m.getLocationErr
}
func (m *mockServiceStore) ListLocationsByCampaign(_ string) ([]*model.Location, error) {
	return nil, nil
}
func (m *mockServiceStore) UpdateLocation(_ *model.UpdateLocationRequest) (*model.Location, error) {
	return m.location, m.updateLocationErr
}
func (m *mockServiceStore) DeleteLocation(_, _ string) (*model.Location, error) {
	return m.location, m.deleteLocationErr
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func newService(store location.Store) *location.Service {
	return &location.Service{DB: store, Log: slog.Default()}
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

func TestLocationServiceCreate_HappyPath(t *testing.T) {
	want := testLocation()
	got, err := newService(&mockServiceStore{location: want}).Create(&model.CreateLocationRequest{CampaignID: want.CampaignID, Name: want.Name})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != want.ID {
		t.Errorf("got id %q, want %q", got.ID, want.ID)
	}
}

func TestLocationServiceCreate_UniqueViolation(t *testing.T) {
	_, err := newService(&mockServiceStore{createLocationErr: pgUniqueViolation()}).Create(&model.CreateLocationRequest{})
	assertError(t, err, location.ErrLocationAlreadyExists)
}

func TestLocationServiceCreate_FKViolation(t *testing.T) {
	_, err := newService(&mockServiceStore{createLocationErr: pgFKViolation("fk_location_campaign_id")}).Create(&model.CreateLocationRequest{})
	assertError(t, err, location.ErrLocationInvalidCampaign)
}

// ── GetByID ───────────────────────────────────────────────────────────────────

func TestLocationServiceGetByID_HappyPath(t *testing.T) {
	want := testLocation()
	got, err := newService(&mockServiceStore{location: want}).GetByID(want.ID, want.CampaignID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != want.ID {
		t.Errorf("got id %q, want %q", got.ID, want.ID)
	}
}

func TestLocationServiceGetByID_NotFound(t *testing.T) {
	_, err := newService(&mockServiceStore{getLocationErr: sql.ErrNoRows}).GetByID("location-1", "campaign-1")
	assertError(t, err, location.ErrLocationNotFound)
}

// ── Update ────────────────────────────────────────────────────────────────────

func TestLocationServiceUpdate_HappyPath(t *testing.T) {
	want := testLocation()
	got, err := newService(&mockServiceStore{location: want}).Update(&model.UpdateLocationRequest{ID: want.ID, CampaignID: want.CampaignID})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != want.ID {
		t.Errorf("got id %q, want %q", got.ID, want.ID)
	}
}

func TestLocationServiceUpdate_NotFound(t *testing.T) {
	_, err := newService(&mockServiceStore{getLocationErr: sql.ErrNoRows}).Update(&model.UpdateLocationRequest{ID: "location-1", CampaignID: "campaign-1"})
	assertError(t, err, location.ErrLocationNotFound)
}

// ── Delete ────────────────────────────────────────────────────────────────────

func TestLocationServiceDelete_HappyPath(t *testing.T) {
	want := testLocation()
	got, err := newService(&mockServiceStore{location: want}).Delete(want.ID, want.CampaignID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != want.ID {
		t.Errorf("got id %q, want %q", got.ID, want.ID)
	}
}

func TestLocationServiceDelete_NotFound(t *testing.T) {
	_, err := newService(&mockServiceStore{getLocationErr: sql.ErrNoRows}).Delete("location-1", "campaign-1")
	assertError(t, err, location.ErrLocationNotFound)
}
