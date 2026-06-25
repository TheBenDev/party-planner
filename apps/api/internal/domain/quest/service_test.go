package quest_test

import (
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

func (m *mockServiceStore) CreateQuest(_ *model.CreateQuestRequest) (*model.Quest, error) {
	return m.quest, m.createQuestErr
}
func (m *mockServiceStore) GetQuest(_, _ string) (*model.Quest, error) {
	return m.quest, m.getQuestErr
}
func (m *mockServiceStore) ListQuestsByCampaign(_ string) ([]*model.Quest, error) {
	return nil, nil
}
func (m *mockServiceStore) UpdateQuest(_ *model.UpdateQuestRequest) (*model.Quest, error) {
	return m.quest, m.updateQuestErr
}
func (m *mockServiceStore) RemoveQuest(_, _ string) error {
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
	got, err := newService(&mockServiceStore{quest: want}).Create(&model.CreateQuestRequest{CampaignID: want.CampaignID, Title: want.Title})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != want.ID {
		t.Errorf("got id %q, want %q", got.ID, want.ID)
	}
}

func TestQuestServiceCreate_UniqueViolation(t *testing.T) {
	_, err := newService(&mockServiceStore{createQuestErr: pgUniqueViolation()}).Create(&model.CreateQuestRequest{})
	assertError(t, err, quest.ErrAlreadyExists)
}

func TestQuestServiceCreate_FK_InvalidCampaign(t *testing.T) {
	_, err := newService(&mockServiceStore{createQuestErr: pgFKViolation("fk_quest_campaign_id")}).Create(&model.CreateQuestRequest{})
	assertError(t, err, quest.ErrInvalidCampaign)
}

func TestQuestServiceCreate_FK_InvalidQuestGiver(t *testing.T) {
	_, err := newService(&mockServiceStore{createQuestErr: pgFKViolation("fk_quest_quest_giver_id")}).Create(&model.CreateQuestRequest{})
	assertError(t, err, quest.ErrInvalidQuestGiver)
}

// ── GetByID ───────────────────────────────────────────────────────────────────

func TestQuestServiceGetByID_HappyPath(t *testing.T) {
	want := testQuest()
	got, err := newService(&mockServiceStore{quest: want}).GetByID(want.ID, want.CampaignID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != want.ID {
		t.Errorf("got id %q, want %q", got.ID, want.ID)
	}
}

func TestQuestServiceGetByID_NotFound(t *testing.T) {
	_, err := newService(&mockServiceStore{getQuestErr: sql.ErrNoRows}).GetByID("quest-1", "campaign-1")
	assertError(t, err, quest.ErrNotFound)
}

// ── Update ────────────────────────────────────────────────────────────────────

func TestQuestServiceUpdate_HappyPath(t *testing.T) {
	want := testQuest()
	got, err := newService(&mockServiceStore{quest: want}).Update(&model.UpdateQuestRequest{ID: want.ID, CampaignID: want.CampaignID})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != want.ID {
		t.Errorf("got id %q, want %q", got.ID, want.ID)
	}
}

func TestQuestServiceUpdate_NotFound(t *testing.T) {
	_, err := newService(&mockServiceStore{getQuestErr: sql.ErrNoRows}).Update(&model.UpdateQuestRequest{ID: "quest-1", CampaignID: "campaign-1"})
	assertError(t, err, quest.ErrNotFound)
}

// ── Remove ────────────────────────────────────────────────────────────────────

func TestQuestServiceRemove_HappyPath(t *testing.T) {
	want := testQuest()
	if err := newService(&mockServiceStore{quest: want}).Remove(want.ID, want.CampaignID); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestQuestServiceRemove_NotFound(t *testing.T) {
	err := newService(&mockServiceStore{getQuestErr: sql.ErrNoRows}).Remove("quest-1", "campaign-1")
	assertError(t, err, quest.ErrNotFound)
}
