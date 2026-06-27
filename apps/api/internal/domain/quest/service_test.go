package quest_test

import (
	"context"
	"database/sql"
	"errors"
	"log/slog"
	"testing"

	"github.com/BBruington/party-planner/api/internal/domain/quest"
	model "github.com/BBruington/party-planner/api/internal/models"
	"github.com/BBruington/party-planner/api/internal/pg"
	"github.com/jackc/pgx/v5/pgconn"
)

type mockServiceStore struct {
	quest *model.Quest

	createQuestErr error
	getQuestErr    error
	updateQuestErr error
	removeQuestErr error
}

func (m *mockServiceStore) CreateQuest(_ context.Context, _ *model.CreateQuestRequest) (*model.Quest, error) {
	return m.quest, m.createQuestErr
}
func (m *mockServiceStore) GetQuest(_ context.Context, _, _ string) (*model.Quest, error) {
	return m.quest, m.getQuestErr
}
func (m *mockServiceStore) ListQuestsByCampaign(_ context.Context, _ string) ([]*model.Quest, error) {
	return nil, nil
}
func (m *mockServiceStore) UpdateQuest(_ context.Context, _ *model.UpdateQuestRequest) (*model.Quest, error) {
	return m.quest, m.updateQuestErr
}
func (m *mockServiceStore) RemoveQuest(_ context.Context, _, _ string) error {
	return m.removeQuestErr
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func newService(store quest.Store) *quest.Service {
	return &quest.Service{DB: store, Log: slog.Default()}
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

func TestQuestServiceCreate_HappyPath(t *testing.T) {
	want := testQuest()
	got, err := newService(&mockServiceStore{quest: want}).Create(context.Background(), &model.CreateQuestRequest{CampaignID: want.CampaignID, Title: want.Title})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != want.ID {
		t.Errorf("got id %q, want %q", got.ID, want.ID)
	}
}

func TestQuestServiceCreate_UniqueViolation(t *testing.T) {
	_, err := newService(&mockServiceStore{createQuestErr: pgUniqueViolation()}).Create(context.Background(), &model.CreateQuestRequest{})
	assertError(t, err, quest.ErrAlreadyExists)
}

func TestQuestServiceCreate_FK_InvalidCampaign(t *testing.T) {
	_, err := newService(&mockServiceStore{createQuestErr: pgFKViolation("fk_quest_campaign_id")}).Create(context.Background(), &model.CreateQuestRequest{})
	assertError(t, err, quest.ErrInvalidCampaign)
}

func TestQuestServiceCreate_FK_InvalidQuestGiver(t *testing.T) {
	_, err := newService(&mockServiceStore{createQuestErr: pgFKViolation("fk_quest_quest_giver_id")}).Create(context.Background(), &model.CreateQuestRequest{})
	assertError(t, err, quest.ErrInvalidQuestGiver)
}

// ── GetByID ───────────────────────────────────────────────────────────────────

func TestQuestServiceGetByID_HappyPath(t *testing.T) {
	want := testQuest()
	got, err := newService(&mockServiceStore{quest: want}).GetByID(context.Background(), want.ID, want.CampaignID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != want.ID {
		t.Errorf("got id %q, want %q", got.ID, want.ID)
	}
}

func TestQuestServiceGetByID_NotFound(t *testing.T) {
	_, err := newService(&mockServiceStore{getQuestErr: sql.ErrNoRows}).GetByID(context.Background(), "quest-1", "campaign-1")
	assertError(t, err, quest.ErrNotFound)
}

// ── Update ────────────────────────────────────────────────────────────────────

func TestQuestServiceUpdate_HappyPath(t *testing.T) {
	want := testQuest()
	got, err := newService(&mockServiceStore{quest: want}).Update(context.Background(), &model.UpdateQuestRequest{ID: want.ID, CampaignID: want.CampaignID})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != want.ID {
		t.Errorf("got id %q, want %q", got.ID, want.ID)
	}
}

func TestQuestServiceUpdate_NotFound(t *testing.T) {
	_, err := newService(&mockServiceStore{getQuestErr: sql.ErrNoRows}).Update(context.Background(), &model.UpdateQuestRequest{ID: "quest-1", CampaignID: "campaign-1"})
	assertError(t, err, quest.ErrNotFound)
}

// ── Remove ────────────────────────────────────────────────────────────────────

func TestQuestServiceRemove_HappyPath(t *testing.T) {
	want := testQuest()
	if err := newService(&mockServiceStore{quest: want}).Remove(context.Background(), want.ID, want.CampaignID); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestQuestServiceRemove_NotFound(t *testing.T) {
	err := newService(&mockServiceStore{getQuestErr: sql.ErrNoRows}).Remove(context.Background(), "quest-1", "campaign-1")
	assertError(t, err, quest.ErrNotFound)
}
