package user_test

import (
	"database/sql"
	"errors"
	"log/slog"
	"testing"

	"github.com/BBruington/party-planner/api/internal/domain/user"
	model "github.com/BBruington/party-planner/api/internal/models"
	"github.com/BBruington/party-planner/api/internal/pg"
	"github.com/jackc/pgx/v5/pgconn"
)

type mockServiceStore struct {
	user     *model.User
	campaign *model.Campaign
	member   *model.Member
	members  []*model.MemberWithUser

	createUserErr              error
	deleteUserErr              error
	getUserByClerkIDErr        error
	getCampaignErr             error
	getCampaignUserErr         error
	listCampaignUsersByUserErr error
	updateUserErr              error
}

func (m *mockServiceStore) CreateUser(_ *model.CreateUserRequest) (*model.User, error) {
	return m.user, m.createUserErr
}
func (m *mockServiceStore) DeleteUser(_ string) (*model.User, error) {
	return m.user, m.deleteUserErr
}
func (m *mockServiceStore) GetUserByClerkID(_ string) (*model.User, error) {
	return m.user, m.getUserByClerkIDErr
}
func (m *mockServiceStore) GetUserByEmail(_ string) (*model.User, error) {
	return m.user, nil
}
func (m *mockServiceStore) GetUserByID(_ string) (*model.User, error) {
	return m.user, nil
}
func (m *mockServiceStore) UpdateUserByClerkID(_ *model.UpdateUserRequest) (*model.User, error) {
	return m.user, m.updateUserErr
}
func (m *mockServiceStore) GetCampaign(_ string) (*model.Campaign, error) {
	return m.campaign, m.getCampaignErr
}
func (m *mockServiceStore) GetCampaignUser(_, _ string) (*model.Member, error) {
	return m.member, m.getCampaignUserErr
}
func (m *mockServiceStore) ListCampaignUsersByUser(_ string) ([]*model.MemberWithUser, error) {
	return m.members, m.listCampaignUsersByUserErr
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func newService(store user.Store) *user.Service {
	return &user.Service{DB: store, Log: slog.Default()}
}

func pgUniqueViolation(constraint string) error {
	return &pgconn.PgError{Code: pg.UniqueViolation, ConstraintName: constraint}
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

func testCampaign() *model.Campaign {
	return &model.Campaign{ID: "campaign-1", UserID: "user-1", Title: "Test Campaign"}
}

// ── Create ────────────────────────────────────────────────────────────────────

func TestUserServiceCreate_HappyPath(t *testing.T) {
	want := testUser()
	got, err := newService(&mockServiceStore{user: want}).Create(&model.CreateUserRequest{Email: want.Email})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != want.ID {
		t.Errorf("got id %q, want %q", got.ID, want.ID)
	}
}

func TestUserServiceCreate_EmailTaken(t *testing.T) {
	_, err := newService(&mockServiceStore{createUserErr: pgUniqueViolation("users_email_unique")}).Create(&model.CreateUserRequest{})
	assertError(t, err, user.ErrEmailTaken)
}

func TestUserServiceCreate_ExternalIDTaken(t *testing.T) {
	_, err := newService(&mockServiceStore{createUserErr: pgUniqueViolation("users_external_id_unique")}).Create(&model.CreateUserRequest{})
	assertError(t, err, user.ErrExternalIDTaken)
}

// ── Delete ────────────────────────────────────────────────────────────────────

func TestUserServiceDelete_HappyPath(t *testing.T) {
	want := testUser()
	got, err := newService(&mockServiceStore{user: want}).Delete(want.ExternalId)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != want.ID {
		t.Errorf("got id %q, want %q", got.ID, want.ID)
	}
}

func TestUserServiceDelete_NotFound(t *testing.T) {
	_, err := newService(&mockServiceStore{deleteUserErr: sql.ErrNoRows}).Delete("clerk-1")
	assertError(t, err, user.ErrNotFound)
}

// ── GetByClerkID ──────────────────────────────────────────────────────────────

func TestUserServiceGetByClerkID_HappyPath(t *testing.T) {
	want := testUser()
	got, err := newService(&mockServiceStore{user: want}).GetByClerkID(want.ExternalId)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != want.ID {
		t.Errorf("got id %q, want %q", got.ID, want.ID)
	}
}

func TestUserServiceGetByClerkID_NotFound(t *testing.T) {
	_, err := newService(&mockServiceStore{getUserByClerkIDErr: sql.ErrNoRows}).GetByClerkID("clerk-1")
	assertError(t, err, user.ErrNotFound)
}

// ── Update ────────────────────────────────────────────────────────────────────

func TestUserServiceUpdate_HappyPath(t *testing.T) {
	want := testUser()
	got, err := newService(&mockServiceStore{user: want}).Update(&model.UpdateUserRequest{ExternalId: want.ExternalId})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != want.ID {
		t.Errorf("got id %q, want %q", got.ID, want.ID)
	}
}

func TestUserServiceUpdate_NotFound(t *testing.T) {
	_, err := newService(&mockServiceStore{updateUserErr: sql.ErrNoRows}).Update(&model.UpdateUserRequest{ExternalId: "clerk-1"})
	assertError(t, err, user.ErrNotFound)
}

// ── GetAuth ───────────────────────────────────────────────────────────────────

func TestUserServiceGetAuth_WithCampaignID_HappyPath(t *testing.T) {
	want := testUser()
	campaignID := "campaign-1"
	store := &mockServiceStore{
		user:     want,
		campaign: testCampaign(),
		member:   &model.Member{Role: model.MemberRolePlayer},
	}
	resp, err := newService(store).GetAuth(want.ExternalId, &campaignID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.User.ID != want.ID {
		t.Errorf("got user id %q, want %q", resp.User.ID, want.ID)
	}
	if resp.Campaign == nil {
		t.Error("expected campaign, got nil")
	}
	if resp.Role == nil {
		t.Error("expected role, got nil")
	}
}

func TestUserServiceGetAuth_WithCampaignID_CampaignNotFound(t *testing.T) {
	want := testUser()
	campaignID := "campaign-1"
	store := &mockServiceStore{
		user:           want,
		getCampaignErr: sql.ErrNoRows,
	}
	resp, err := newService(store).GetAuth(want.ExternalId, &campaignID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Campaign != nil {
		t.Error("expected nil campaign for stale campaign id")
	}
}

func TestUserServiceGetAuth_WithoutCampaignID_NoMemberships(t *testing.T) {
	want := testUser()
	store := &mockServiceStore{
		user:    want,
		members: []*model.MemberWithUser{},
	}
	resp, err := newService(store).GetAuth(want.ExternalId, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Campaign != nil {
		t.Error("expected nil campaign for user with no memberships")
	}
}

func TestUserServiceGetAuth_UserNotFound(t *testing.T) {
	_, err := newService(&mockServiceStore{getUserByClerkIDErr: sql.ErrNoRows}).GetAuth("clerk-1", nil)
	assertError(t, err, user.ErrNotFound)
}
