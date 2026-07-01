package location_test

import (
	"context"
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

func (m *mockServiceStore) CreateLocation(_ context.Context, _ *model.CreateLocationRequest) (*model.Location, error) {
	return m.location, m.createLocationErr
}
func (m *mockServiceStore) GetLocation(_ context.Context, _, _ string) (*model.Location, error) {
	return m.location, m.getLocationErr
}
func (m *mockServiceStore) UpdateLocation(_ context.Context, _ *model.UpdateLocationRequest) (*model.Location, error) {
	return m.location, m.updateLocationErr
}
func (m *mockServiceStore) DeleteLocation(_ context.Context, _, _ string) (*model.Location, error) {
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
	got, err := newService(&mockServiceStore{location: want}).Create(context.Background(), &model.CreateLocationRequest{RegionID: want.RegionID, CampaignID: "campaign-1", Name: want.Name})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != want.ID {
		t.Errorf("got id %q, want %q", got.ID, want.ID)
	}
}

func TestLocationServiceCreate_UniqueViolation(t *testing.T) {
	_, err := newService(&mockServiceStore{createLocationErr: pgUniqueViolation()}).Create(context.Background(), &model.CreateLocationRequest{})
	assertError(t, err, location.ErrLocationAlreadyExists)
}

func TestLocationServiceCreate_FKViolation(t *testing.T) {
	_, err := newService(&mockServiceStore{createLocationErr: pgFKViolation("fk_location_region_id")}).Create(context.Background(), &model.CreateLocationRequest{})
	assertError(t, err, location.ErrLocationRegionNotFound)
}

func TestLocationServiceCreate_InvalidRegion(t *testing.T) {
	_, err := newService(&mockServiceStore{createLocationErr: sql.ErrNoRows}).Create(context.Background(), &model.CreateLocationRequest{})
	assertError(t, err, location.ErrLocationInvalidRegion)
}

// ── GetByID ───────────────────────────────────────────────────────────────────

func TestLocationServiceGetByID_HappyPath(t *testing.T) {
	want := testLocation()
	got, err := newService(&mockServiceStore{location: want}).GetByID(context.Background(), want.ID, "campaign-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != want.ID {
		t.Errorf("got id %q, want %q", got.ID, want.ID)
	}
}

func TestLocationServiceGetByID_NotFound(t *testing.T) {
	_, err := newService(&mockServiceStore{getLocationErr: sql.ErrNoRows}).GetByID(context.Background(), "location-1", "campaign-1")
	assertError(t, err, location.ErrLocationNotFound)
}

// ── Update ────────────────────────────────────────────────────────────────────

func TestLocationServiceUpdate_HappyPath(t *testing.T) {
	want := testLocation()
	got, err := newService(&mockServiceStore{location: want}).Update(context.Background(), &model.UpdateLocationRequest{ID: want.ID, CampaignID: "campaign-1"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != want.ID {
		t.Errorf("got id %q, want %q", got.ID, want.ID)
	}
}

func TestLocationServiceUpdate_NotFound(t *testing.T) {
	_, err := newService(&mockServiceStore{getLocationErr: sql.ErrNoRows}).Update(context.Background(), &model.UpdateLocationRequest{ID: "location-1", CampaignID: "campaign-1"})
	assertError(t, err, location.ErrLocationNotFound)
}

// ── Delete ────────────────────────────────────────────────────────────────────

func TestLocationServiceDelete_HappyPath(t *testing.T) {
	want := testLocation()
	got, err := newService(&mockServiceStore{location: want}).Delete(context.Background(), want.ID, "campaign-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != want.ID {
		t.Errorf("got id %q, want %q", got.ID, want.ID)
	}
}

func TestLocationServiceDelete_NotFound(t *testing.T) {
	_, err := newService(&mockServiceStore{getLocationErr: sql.ErrNoRows}).Delete(context.Background(), "location-1", "campaign-1")
	assertError(t, err, location.ErrLocationNotFound)
}
