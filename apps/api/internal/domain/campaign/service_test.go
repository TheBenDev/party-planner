package campaign_test

import (
	"database/sql"
	"errors"
	"log/slog"
	"testing"

	"github.com/BBruington/party-planner/api/internal/domain/campaign"
	model "github.com/BBruington/party-planner/api/internal/models"
	"github.com/BBruington/party-planner/api/internal/pg"
	"github.com/jackc/pgx/v5/pgconn"
)

type mockServiceStore struct {
	campaign *model.Campaign
	member   *model.Member

	createCampaignErr  error
	createMemberErr    error
	getCampaignErr     error
	updateCampaignErr  error
	deleteCampaignErr  error
	getCampaignUserErr error

	createMemberCalls int
	lastMemberReq     *model.CreateMemberRequest
}

func (m *mockServiceStore) CreateCampaign(_ *model.CreateCampaignRequest) (*model.Campaign, error) {
	return m.campaign, m.createCampaignErr
}
func (m *mockServiceStore) GetCampaign(_ string) (*model.Campaign, error) {
	return m.campaign, m.getCampaignErr
}
func (m *mockServiceStore) UpdateCampaign(_ *model.UpdateCampaignRequest) (*model.Campaign, error) {
	return m.campaign, m.updateCampaignErr
}
func (m *mockServiceStore) DeleteCampaign(_ string) (*model.Campaign, error) {
	return m.campaign, m.deleteCampaignErr
}
func (m *mockServiceStore) CreateCampaignUser(req *model.CreateMemberRequest) (*model.Member, error) {
	m.createMemberCalls++
	m.lastMemberReq = req
	return m.member, m.createMemberErr
}
func (m *mockServiceStore) GetCampaignUser(_, _ string) (*model.Member, error) {
	return m.member, m.getCampaignUserErr
}
func (m *mockServiceStore) RunInTx(fn func(campaign.Store) error) error { return fn(m) }

// ── Helpers ───────────────────────────────────────────────────────────────────

func newService(store campaign.Store) *campaign.Service {
	return &campaign.Service{DB: store, Log: slog.Default()}
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

func TestServiceCreate_HappyPath(t *testing.T) {
	want := testCampaign()
	store := &mockServiceStore{campaign: want, member: testDMMember()}
	svc := newService(store)

	got, err := svc.Create(&model.CreateCampaignRequest{UserID: want.UserID, Title: want.Title})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != want.ID {
		t.Errorf("got id %q, want %q", got.ID, want.ID)
	}
	if store.createMemberCalls != 1 {
		t.Errorf("CreateCampaignUser called %d times, want 1", store.createMemberCalls)
	}
	if store.lastMemberReq.Role != model.MemberRoleDungeonMaster {
		t.Errorf("member role = %v, want DungeonMaster", store.lastMemberReq.Role)
	}
	if store.lastMemberReq.UserID != want.UserID {
		t.Errorf("member user id = %q, want %q", store.lastMemberReq.UserID, want.UserID)
	}
}

func TestServiceCreate_UniqueViolation(t *testing.T) {
	store := &mockServiceStore{createCampaignErr: pgUniqueViolation()}
	_, err := newService(store).Create(&model.CreateCampaignRequest{})
	assertError(t, err, campaign.ErrAlreadyExists)
	if store.createMemberCalls != 0 {
		t.Errorf("CreateCampaignUser called %d times after failed CreateCampaign, want 0", store.createMemberCalls)
	}
}

func TestServiceCreate_FKViolation(t *testing.T) {
	store := &mockServiceStore{createCampaignErr: pgFKViolation("fk_campaign_user_id")}
	_, err := newService(store).Create(&model.CreateCampaignRequest{})
	assertError(t, err, campaign.ErrInvalidUser)
	if store.createMemberCalls != 0 {
		t.Errorf("CreateCampaignUser called %d times after failed CreateCampaign, want 0", store.createMemberCalls)
	}
}

// ── GetByID ───────────────────────────────────────────────────────────────────

func TestServiceGetByID_HappyPath(t *testing.T) {
	want := testCampaign()
	got, err := newService(&mockServiceStore{campaign: want}).GetByID(want.ID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != want.ID {
		t.Errorf("got id %q, want %q", got.ID, want.ID)
	}
}

func TestServiceGetByID_NotFound(t *testing.T) {
	_, err := newService(&mockServiceStore{getCampaignErr: sql.ErrNoRows}).GetByID("campaign-1")
	assertError(t, err, campaign.ErrNotFound)
}

// ── Update ────────────────────────────────────────────────────────────────────

func TestServiceUpdate_HappyPath(t *testing.T) {
	want := testCampaign()
	got, err := newService(&mockServiceStore{campaign: want, member: testDMMember()}).
		Update(want.UserID, &model.UpdateCampaignRequest{ID: want.ID})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != want.ID {
		t.Errorf("got id %q, want %q", got.ID, want.ID)
	}
}

func TestServiceUpdate_Auth_UserNotFound(t *testing.T) {
	_, err := newService(&mockServiceStore{getCampaignUserErr: sql.ErrNoRows}).
		Update("user-1", &model.UpdateCampaignRequest{ID: "campaign-1"})
	assertError(t, err, campaign.ErrNotAuthorized)
}

func TestServiceUpdate_Auth_NotDM(t *testing.T) {
	_, err := newService(&mockServiceStore{member: &model.Member{Role: model.MemberRolePlayer}}).
		Update("user-1", &model.UpdateCampaignRequest{ID: "campaign-1"})
	assertError(t, err, campaign.ErrNotAuthorized)
}

func TestServiceUpdate_NotFound(t *testing.T) {
	_, err := newService(&mockServiceStore{member: testDMMember(), updateCampaignErr: sql.ErrNoRows}).
		Update("user-1", &model.UpdateCampaignRequest{ID: "campaign-1"})
	assertError(t, err, campaign.ErrNotFound)
}

// ── Delete ────────────────────────────────────────────────────────────────────

func TestServiceDelete_HappyPath(t *testing.T) {
	want := testCampaign()
	got, err := newService(&mockServiceStore{campaign: want, member: testDMMember()}).
		Delete(want.UserID, want.ID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != want.ID {
		t.Errorf("got id %q, want %q", got.ID, want.ID)
	}
}

func TestServiceDelete_Auth_UserNotFound(t *testing.T) {
	_, err := newService(&mockServiceStore{getCampaignUserErr: sql.ErrNoRows}).
		Delete("user-1", "campaign-1")
	assertError(t, err, campaign.ErrNotAuthorized)
}

func TestServiceDelete_Auth_NotDM(t *testing.T) {
	_, err := newService(&mockServiceStore{member: &model.Member{Role: model.MemberRolePlayer}}).
		Delete("user-1", "campaign-1")
	assertError(t, err, campaign.ErrNotAuthorized)
}

func TestServiceDelete_NotFound(t *testing.T) {
	_, err := newService(&mockServiceStore{member: testDMMember(), deleteCampaignErr: sql.ErrNoRows}).
		Delete("user-1", "campaign-1")
	assertError(t, err, campaign.ErrNotFound)
}
