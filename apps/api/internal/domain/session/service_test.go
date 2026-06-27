package session_test

import (
	"context"
	"database/sql"
	"errors"
	"log/slog"
	"testing"

	"github.com/BBruington/party-planner/api/internal/domain/session"
	model "github.com/BBruington/party-planner/api/internal/models"
	"github.com/BBruington/party-planner/api/internal/pg"
	"github.com/jackc/pgx/v5/pgconn"
)

type mockServiceStore struct {
	sess *model.Session

	createSessionErr  error
	upsertSessionErr  error
	getSessionErr     error
	getNextSessionErr error
	updateSessionErr  error
	removeSessionErr  error
}

func (m *mockServiceStore) CreateSession(_ context.Context, _ *model.CreateSessionRequest) (*model.Session, error) {
	return m.sess, m.createSessionErr
}
func (m *mockServiceStore) UpsertSessionForSeries(_ context.Context, _ *model.CreateSessionRequest) (*model.Session, error) {
	return m.sess, m.upsertSessionErr
}
func (m *mockServiceStore) GetSession(_ context.Context, _, _ string) (*model.Session, error) {
	return m.sess, m.getSessionErr
}
func (m *mockServiceStore) ListOneOffSessionsByCampaign(_ context.Context, _ string) ([]*model.Session, error) {
	return nil, nil
}
func (m *mockServiceStore) ListSeriesSessionsByCampaign(_ context.Context, _ string) ([]*model.Session, error) {
	return nil, nil
}
func (m *mockServiceStore) GetNextSessionByCampaign(_ context.Context, _ string) (*model.Session, error) {
	return m.sess, m.getNextSessionErr
}
func (m *mockServiceStore) RemoveSession(_ context.Context, _, _ string) error {
	return m.removeSessionErr
}
func (m *mockServiceStore) UpdateSession(_ context.Context, _ *model.UpdateSessionRequest) (*model.Session, error) {
	return m.sess, m.updateSessionErr
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func newService(store session.Store) *session.Service {
	return &session.Service{DB: store, Log: slog.Default()}
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

func TestSessionServiceCreate_HappyPath(t *testing.T) {
	want := testSession()
	got, err := newService(&mockServiceStore{sess: want}).Create(context.Background(), &model.CreateSessionRequest{CampaignID: want.CampaignID, Title: want.Title})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != want.ID {
		t.Errorf("got id %q, want %q", got.ID, want.ID)
	}
}

func TestSessionServiceCreate_UniqueViolation(t *testing.T) {
	_, err := newService(&mockServiceStore{createSessionErr: pgUniqueViolation()}).Create(context.Background(), &model.CreateSessionRequest{})
	assertError(t, err, session.ErrAlreadyExists)
}

func TestSessionServiceCreate_FK_InvalidCampaign(t *testing.T) {
	_, err := newService(&mockServiceStore{createSessionErr: pgFKViolation("fk_session_campaign_id")}).Create(context.Background(), &model.CreateSessionRequest{})
	assertError(t, err, session.ErrInvalidCampaign)
}

// ── UpsertForSeries ───────────────────────────────────────────────────────────

func TestSessionServiceUpsertForSeries_HappyPath(t *testing.T) {
	want := testSession()
	got, err := newService(&mockServiceStore{sess: want}).UpsertForSeries(context.Background(), &model.CreateSessionRequest{CampaignID: want.CampaignID})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != want.ID {
		t.Errorf("got id %q, want %q", got.ID, want.ID)
	}
}

func TestSessionServiceUpsertForSeries_UniqueViolation(t *testing.T) {
	_, err := newService(&mockServiceStore{upsertSessionErr: pgUniqueViolation()}).UpsertForSeries(context.Background(), &model.CreateSessionRequest{})
	assertError(t, err, session.ErrAlreadyExists)
}

// ── GetByID ───────────────────────────────────────────────────────────────────

func TestSessionServiceGetByID_HappyPath(t *testing.T) {
	want := testSession()
	got, err := newService(&mockServiceStore{sess: want}).GetByID(context.Background(), want.ID, want.CampaignID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != want.ID {
		t.Errorf("got id %q, want %q", got.ID, want.ID)
	}
}

func TestSessionServiceGetByID_NotFound(t *testing.T) {
	_, err := newService(&mockServiceStore{getSessionErr: sql.ErrNoRows}).GetByID(context.Background(), "session-1", "campaign-1")
	assertError(t, err, session.ErrNotFound)
}

// ── GetNextSession ────────────────────────────────────────────────────────────

func TestSessionServiceGetNextSession_HappyPath(t *testing.T) {
	want := testSession()
	got, err := newService(&mockServiceStore{sess: want}).GetNextSession(context.Background(), want.CampaignID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != want.ID {
		t.Errorf("got id %q, want %q", got.ID, want.ID)
	}
}

func TestSessionServiceGetNextSession_NotFound(t *testing.T) {
	_, err := newService(&mockServiceStore{getNextSessionErr: sql.ErrNoRows}).GetNextSession(context.Background(), "campaign-1")
	assertError(t, err, session.ErrNotFound)
}

// ── Update ────────────────────────────────────────────────────────────────────

func TestSessionServiceUpdate_HappyPath(t *testing.T) {
	want := testSession()
	got, err := newService(&mockServiceStore{sess: want}).Update(context.Background(), &model.UpdateSessionRequest{ID: want.ID, CampaignID: want.CampaignID})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != want.ID {
		t.Errorf("got id %q, want %q", got.ID, want.ID)
	}
}

func TestSessionServiceUpdate_UniqueViolation(t *testing.T) {
	_, err := newService(&mockServiceStore{updateSessionErr: pgUniqueViolation()}).Update(context.Background(), &model.UpdateSessionRequest{ID: "session-1", CampaignID: "campaign-1"})
	assertError(t, err, session.ErrAlreadyExists)
}
