package region_test

import (
	"context"
	"database/sql"
	"errors"
	"log/slog"
	"testing"

	"github.com/BBruington/party-planner/api/internal/domain/region"
	model "github.com/BBruington/party-planner/api/internal/models"
	"github.com/BBruington/party-planner/api/internal/pg"
	"github.com/jackc/pgx/v5/pgconn"
)

type mockServiceStore struct {
	region              *model.Region
	regions             []*model.RegionWithLocations
	regionWithLocations *model.RegionWithLocations

	createRegionErr error
	getRegionErr    error
	listRegionsErr  error
	updateRegionErr error
	deleteRegionErr error
}

func (m *mockServiceStore) CreateRegion(_ context.Context, _ *model.CreateRegionRequest) (*model.Region, error) {
	return m.region, m.createRegionErr
}
func (m *mockServiceStore) GetRegion(_ context.Context, _, _ string) (*model.RegionWithLocations, error) {
	return m.regionWithLocations, m.getRegionErr
}
func (m *mockServiceStore) ListRegionsByCampaign(_ context.Context, _ string) ([]*model.RegionWithLocations, error) {
	return m.regions, m.listRegionsErr
}
func (m *mockServiceStore) UpdateRegion(_ context.Context, _ *model.UpdateRegionRequest) (*model.Region, error) {
	return m.region, m.updateRegionErr
}
func (m *mockServiceStore) DeleteRegion(_ context.Context, _, _ string) (*model.Region, error) {
	return m.region, m.deleteRegionErr
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func newService(store region.Store) *region.Service {
	return &region.Service{DB: store, Log: slog.Default()}
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

func TestRegionServiceCreate_HappyPath(t *testing.T) {
	want := testRegion()
	got, err := newService(&mockServiceStore{region: want}).Create(context.Background(), &model.CreateRegionRequest{CampaignID: want.CampaignID, Name: want.Name})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != want.ID {
		t.Errorf("got id %q, want %q", got.ID, want.ID)
	}
}

func TestRegionServiceCreate_UniqueViolation(t *testing.T) {
	_, err := newService(&mockServiceStore{createRegionErr: pgUniqueViolation()}).Create(context.Background(), &model.CreateRegionRequest{})
	assertError(t, err, region.ErrRegionAlreadyExists)
}

func TestRegionServiceCreate_FKViolation(t *testing.T) {
	_, err := newService(&mockServiceStore{createRegionErr: pgFKViolation("fk_region_campaign_id")}).Create(context.Background(), &model.CreateRegionRequest{})
	assertError(t, err, region.ErrRegionInvalidCampaign)
}

// ── GetByID ───────────────────────────────────────────────────────────────────

func TestRegionServiceGetByID_HappyPath(t *testing.T) {
	want := testRegion()
	got, err := newService(&mockServiceStore{regionWithLocations: &model.RegionWithLocations{Region: want, Locations: []*model.Location{}}}).GetByID(context.Background(), want.ID, want.CampaignID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.Region.ID != want.ID {
		t.Errorf("got id %q, want %q", got.Region.ID, want.ID)
	}
}

func TestRegionServiceGetByID_NotFound(t *testing.T) {
	_, err := newService(&mockServiceStore{getRegionErr: sql.ErrNoRows}).GetByID(context.Background(), "region-1", "campaign-1")
	assertError(t, err, region.ErrRegionNotFound)
}

// ── ListByCampaign ────────────────────────────────────────────────────────────

func TestRegionServiceListByCampaign_Error(t *testing.T) {
	sentinel := errors.New("db error")
	_, err := newService(&mockServiceStore{listRegionsErr: sentinel}).ListByCampaign(context.Background(), "campaign-1")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !errors.Is(err, sentinel) {
		t.Errorf("got %v, want wrapped %v", err, sentinel)
	}
}

func TestRegionServiceListByCampaign_HappyPath(t *testing.T) {
	want := testRegion()
	wantList := []*model.RegionWithLocations{{Region: want, Locations: []*model.Location{}}}
	got, err := newService(&mockServiceStore{regions: wantList}).ListByCampaign(context.Background(), want.CampaignID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 1 || got[0].Region.ID != want.ID {
		t.Errorf("got %v, want region id %q", got, want.ID)
	}
}

// ── Update ────────────────────────────────────────────────────────────────────

func TestRegionServiceUpdate_HappyPath(t *testing.T) {
	want := testRegion()
	got, err := newService(&mockServiceStore{region: want}).Update(context.Background(), &model.UpdateRegionRequest{ID: want.ID, CampaignID: want.CampaignID})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != want.ID {
		t.Errorf("got id %q, want %q", got.ID, want.ID)
	}
}

func TestRegionServiceUpdate_NotFound(t *testing.T) {
	_, err := newService(&mockServiceStore{getRegionErr: sql.ErrNoRows}).Update(context.Background(), &model.UpdateRegionRequest{ID: "region-1", CampaignID: "campaign-1"})
	assertError(t, err, region.ErrRegionNotFound)
}

func TestRegionServiceUpdate_UniqueViolation(t *testing.T) {
	_, err := newService(&mockServiceStore{updateRegionErr: pgUniqueViolation()}).Update(context.Background(), &model.UpdateRegionRequest{ID: "region-1", CampaignID: "campaign-1"})
	assertError(t, err, region.ErrRegionAlreadyExists)
}

func TestRegionServiceUpdate_FKViolation(t *testing.T) {
	_, err := newService(&mockServiceStore{updateRegionErr: pgFKViolation("fk_region_campaign_id")}).Update(context.Background(), &model.UpdateRegionRequest{ID: "region-1", CampaignID: "campaign-1"})
	assertError(t, err, region.ErrRegionInvalidCampaign)
}

func TestRegionServiceUpdate_GenericError(t *testing.T) {
	sentinel := errors.New("db error")
	_, err := newService(&mockServiceStore{updateRegionErr: sentinel}).Update(context.Background(), &model.UpdateRegionRequest{ID: "region-1", CampaignID: "campaign-1"})
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !errors.Is(err, sentinel) {
		t.Errorf("got %v, want wrapped %v", err, sentinel)
	}
}

// ── Delete ────────────────────────────────────────────────────────────────────

func TestRegionServiceDelete_HappyPath(t *testing.T) {
	want := testRegion()
	got, err := newService(&mockServiceStore{region: want}).Delete(context.Background(), want.ID, want.CampaignID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != want.ID {
		t.Errorf("got id %q, want %q", got.ID, want.ID)
	}
}

func TestRegionServiceDelete_NotFound(t *testing.T) {
	_, err := newService(&mockServiceStore{getRegionErr: sql.ErrNoRows}).Delete(context.Background(), "region-1", "campaign-1")
	assertError(t, err, region.ErrRegionNotFound)
}

func TestRegionServiceDelete_GenericError(t *testing.T) {
	sentinel := errors.New("db error")
	_, err := newService(&mockServiceStore{deleteRegionErr: sentinel}).Delete(context.Background(), "region-1", "campaign-1")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !errors.Is(err, sentinel) {
		t.Errorf("got %v, want wrapped %v", err, sentinel)
	}
}
