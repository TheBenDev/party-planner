package session_series_test

import (
	"context"
	"database/sql"
	"errors"
	"log/slog"
	"testing"
	"time"

	discord_domain "github.com/BBruington/party-planner/api/internal/adapter/discord"
	session_series "github.com/BBruington/party-planner/api/internal/domain/session_series"
	model "github.com/BBruington/party-planner/api/internal/models"
	"github.com/BBruington/party-planner/api/internal/pg"
	"github.com/jackc/pgx/v5/pgconn"
)

type mockSeriesStore struct {
	series      *model.SessionSeries
	integration *model.CampaignIntegration

	createSeriesErr           error
	getSeriesErr              error
	updateSeriesErr           error
	removeSeriesErr           error
	addSeriesExceptionErr     error
	removeSeriesExceptionErr  error
	getCampaignIntegrationErr error
}

func (m *mockSeriesStore) CreateSessionSeries(_ context.Context, _ *model.CreateSessionSeriesRequest) (*model.SessionSeries, error) {
	return m.series, m.createSeriesErr
}
func (m *mockSeriesStore) GetSessionSeries(_ context.Context, _, _ string) (*model.SessionSeries, error) {
	return m.series, m.getSeriesErr
}
func (m *mockSeriesStore) GetSessionSeriesForUpdate(_ context.Context, _, _ string) (*model.SessionSeries, error) {
	return m.series, m.getSeriesErr
}
func (m *mockSeriesStore) GetSessionSeriesByDiscordEventID(_ context.Context, _ string) (*model.SessionSeries, error) {
	return m.series, nil
}
func (m *mockSeriesStore) ListSessionSeriesByCampaign(_ context.Context, _ string) ([]*model.SessionSeries, error) {
	return nil, nil
}
func (m *mockSeriesStore) UpdateSessionSeries(_ context.Context, _ *model.UpdateSessionSeriesRequest) (*model.SessionSeries, error) {
	return m.series, m.updateSeriesErr
}
func (m *mockSeriesStore) RemoveSessionSeries(_ context.Context, _, _ string) error {
	return m.removeSeriesErr
}
func (m *mockSeriesStore) SetSeriesDiscordEventID(_ context.Context, _, _, _ string) error  { return nil }
func (m *mockSeriesStore) SetSeriesGoogleCalendarEventID(_ context.Context, _, _, _ string) error { return nil }
func (m *mockSeriesStore) ClearSeriesGoogleCalendarEventID(_ context.Context, _, _ string) error  { return nil }
func (m *mockSeriesStore) SetSeriesPollID(_ context.Context, _, _, _ string) error                { return nil }
func (m *mockSeriesStore) AddSeriesException(_ context.Context, _ string, _ string, _ time.Time) error {
	return m.addSeriesExceptionErr
}
func (m *mockSeriesStore) ListExceptionsForSeries(_ context.Context, _ []string) (map[string][]time.Time, error) {
	return map[string][]time.Time{}, nil
}
func (m *mockSeriesStore) RemoveSeriesException(_ context.Context, _ string, _ string, _ time.Time) error {
	return m.removeSeriesExceptionErr
}
func (m *mockSeriesStore) ListActiveSeries(_ context.Context) ([]*model.SessionSeries, error) {
	return nil, nil
}
func (m *mockSeriesStore) UpsertSessionForSeries(_ context.Context, _ *model.CreateSessionRequest) (*model.Session, error) {
	return nil, nil
}
func (m *mockSeriesStore) ListSeriesSessionsByCampaign(_ context.Context, _ string) ([]*model.Session, error) {
	return nil, nil
}
func (m *mockSeriesStore) GetCampaignIntegration(_ context.Context, _, _ string) (*model.CampaignIntegration, error) {
	return m.integration, m.getCampaignIntegrationErr
}
func (m *mockSeriesStore) RunInTx(ctx context.Context, fn func(context.Context, session_series.Store) error) error {
	return fn(ctx, m)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func newService(store session_series.Store) *session_series.Service {
	return &session_series.Service{
		DB:      store,
		Log:     slog.Default(),
		Discord: discord_domain.Service{},
	}
}

func pgUniqueViolation() error {
	return &pgconn.PgError{Code: pg.UniqueViolation}
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

func TestSeriesServiceCreate_HappyPath(t *testing.T) {
	want := testSeries()
	got, err := newService(&mockSeriesStore{series: want}).Create(context.Background(), &model.CreateSessionSeriesRequest{CampaignID: want.CampaignID, Title: want.Title})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != want.ID {
		t.Errorf("got id %q, want %q", got.ID, want.ID)
	}
}

func TestSeriesServiceCreate_UniqueViolation(t *testing.T) {
	_, err := newService(&mockSeriesStore{createSeriesErr: pgUniqueViolation()}).Create(context.Background(), &model.CreateSessionSeriesRequest{})
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

// ── Get ───────────────────────────────────────────────────────────────────────

func TestSeriesServiceGet_HappyPath(t *testing.T) {
	want := testSeries()
	got, err := newService(&mockSeriesStore{series: want}).Get(context.Background(), want.ID, want.CampaignID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != want.ID {
		t.Errorf("got id %q, want %q", got.ID, want.ID)
	}
}

func TestSeriesServiceGet_NotFound(t *testing.T) {
	_, err := newService(&mockSeriesStore{getSeriesErr: sql.ErrNoRows}).Get(context.Background(), "series-1", "campaign-1")
	assertError(t, err, session_series.ErrSessionSeriesNotFound)
}

// ── Update ────────────────────────────────────────────────────────────────────

func TestSeriesServiceUpdate_HappyPath(t *testing.T) {
	want := testSeries()
	got, err := newService(&mockSeriesStore{series: want}).Update(context.Background(), &model.UpdateSessionSeriesRequest{ID: want.ID, CampaignID: want.CampaignID})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != want.ID {
		t.Errorf("got id %q, want %q", got.ID, want.ID)
	}
}

func TestSeriesServiceUpdate_NotFound(t *testing.T) {
	_, err := newService(&mockSeriesStore{getSeriesErr: sql.ErrNoRows}).Update(context.Background(), &model.UpdateSessionSeriesRequest{ID: "series-1", CampaignID: "campaign-1"})
	assertError(t, err, session_series.ErrSessionSeriesNotFound)
}

// ── Remove ────────────────────────────────────────────────────────────────────

func TestSeriesServiceRemove_HappyPath(t *testing.T) {
	// Series with no DiscordEventID or GoogleCalendarEventID skips external cleanup.
	want := testSeries()
	err := newService(&mockSeriesStore{series: want}).Remove(context.Background(), want.ID, want.CampaignID, "user-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestSeriesServiceRemove_NotFound(t *testing.T) {
	err := newService(&mockSeriesStore{getSeriesErr: sql.ErrNoRows}).Remove(context.Background(), "series-1", "campaign-1", "user-1")
	assertError(t, err, session_series.ErrSessionSeriesNotFound)
}

// ── ExcludeFromSeries ─────────────────────────────────────────────────────────

func TestSeriesServiceExcludeFromSeries_UniqueViolation(t *testing.T) {
	store := &mockSeriesStore{addSeriesExceptionErr: pgUniqueViolation()}
	err := newService(store).ExcludeFromSeries(context.Background(), "series-1", "campaign-1", time.Now())
	assertError(t, err, session_series.ErrSeriesExceptionAlreadyExists)
}

func TestSeriesServiceExcludeFromSeries_HappyPath(t *testing.T) {
	// integration with empty settings produces channelID "" → no Discord call needed.
	store := &mockSeriesStore{
		series:      testSeries(),
		integration: &model.CampaignIntegration{ID: "integration-1"},
	}
	err := newService(store).ExcludeFromSeries(context.Background(), "series-1", "campaign-1", time.Now())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

// ── RemoveException ───────────────────────────────────────────────────────────

func TestSeriesServiceRemoveException_HappyPath(t *testing.T) {
	want := testSeries()
	err := newService(&mockSeriesStore{series: want}).RemoveException(context.Background(), want.ID, want.CampaignID, time.Now())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestSeriesServiceRemoveException_SeriesNotFound(t *testing.T) {
	err := newService(&mockSeriesStore{getSeriesErr: sql.ErrNoRows}).RemoveException(context.Background(), "series-1", "campaign-1", time.Now())
	assertError(t, err, session_series.ErrSessionSeriesNotFound)
}
