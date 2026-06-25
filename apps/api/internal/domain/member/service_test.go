package member_test

import (
	"database/sql"
	"errors"
	"log/slog"
	"testing"

	"github.com/BBruington/party-planner/api/internal/domain/member"
	model "github.com/BBruington/party-planner/api/internal/models"
	"github.com/BBruington/party-planner/api/internal/pg"
	"github.com/jackc/pgx/v5/pgconn"
)

type mockServiceStore struct {
	member     *model.Member
	invitation *model.CampaignInvitation
	user       *model.User

	createCampaignUserErr   error
	getCampaignUserErr      error
	updateRoleErr           error
	getInvitationByTokenErr error
	getUserByEmailErr       error
	acceptInvitationErr     error
	declineInvitationErr    error
	createInvitationErr     error
	revokeInvitationErr     error
}

func (m *mockServiceStore) CreateCampaignUser(_ *model.CreateMemberRequest) (*model.Member, error) {
	return m.member, m.createCampaignUserErr
}
func (m *mockServiceStore) GetCampaignUser(_, _ string) (*model.Member, error) {
	return m.member, m.getCampaignUserErr
}
func (m *mockServiceStore) ListCampaignUsersByCampaign(_ string) ([]*model.MemberWithUser, error) {
	return nil, nil
}
func (m *mockServiceStore) ListCampaignUsersByUser(_ string) ([]*model.MemberWithUser, error) {
	return nil, nil
}
func (m *mockServiceStore) RemoveCampaignUser(_, _ string) error { return nil }
func (m *mockServiceStore) UpdateCampaignUserRole(_, _ string, _ model.MemberRole) (*model.Member, error) {
	return m.member, m.updateRoleErr
}
func (m *mockServiceStore) CreateCampaignInvitation(_ *model.CreateCampaignInvitationRequest) (*model.CampaignInvitation, error) {
	return m.invitation, m.createInvitationErr
}
func (m *mockServiceStore) GetCampaignInvitationByEmail(_, _ string, _ model.InvitationStatus) (*model.CampaignInvitation, error) {
	return m.invitation, nil
}
func (m *mockServiceStore) GetCampaignInvitationByToken(_ string) (*model.GetCampaignInvitationResponse, error) {
	if m.getInvitationByTokenErr != nil {
		return nil, m.getInvitationByTokenErr
	}
	if m.invitation == nil {
		return nil, nil
	}
	return &model.GetCampaignInvitationResponse{Invitation: m.invitation}, nil
}
func (m *mockServiceStore) ListCampaignInvitations(_ string) ([]*model.CampaignInvitation, error) {
	return nil, nil
}
func (m *mockServiceStore) AcceptCampaignInvitation(_ string, _ model.MemberRole) (*model.CampaignInvitation, error) {
	return m.invitation, m.acceptInvitationErr
}
func (m *mockServiceStore) DeclineCampaignInvitation(_ string) (*model.CampaignInvitation, error) {
	return m.invitation, m.declineInvitationErr
}
func (m *mockServiceStore) RevokeCampaignInvitation(_, _ string) (*model.CampaignInvitation, error) {
	return m.invitation, m.revokeInvitationErr
}
func (m *mockServiceStore) GetUserByEmail(_ string) (*model.User, error) {
	return m.user, m.getUserByEmailErr
}
func (m *mockServiceStore) RunInTx(fn func(member.Store) error) error { return fn(m) }

// ── Helpers ───────────────────────────────────────────────────────────────────

func newService(store member.Store) *member.Service {
	return &member.Service{DB: store, Log: slog.Default()}
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

// ── Create ────────────────────────────────────────────────────────────────────

func TestMemberServiceCreate_HappyPath(t *testing.T) {
	want := testMember()
	got, err := newService(&mockServiceStore{member: want}).Create(&model.CreateMemberRequest{CampaignID: want.CampaignID, UserID: want.UserID, Role: want.Role})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.UserID != want.UserID {
		t.Errorf("got user id %q, want %q", got.UserID, want.UserID)
	}
}

func TestMemberServiceCreate_AlreadyExists(t *testing.T) {
	_, err := newService(&mockServiceStore{createCampaignUserErr: pgUniqueViolation("campaign_users_pkey")}).Create(&model.CreateMemberRequest{})
	assertError(t, err, member.ErrCampaignUserAlreadyExists)
}

// ── Get ───────────────────────────────────────────────────────────────────────

func TestMemberServiceGet_HappyPath(t *testing.T) {
	want := testMember()
	got, err := newService(&mockServiceStore{member: want}).Get(want.CampaignID, want.UserID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.UserID != want.UserID {
		t.Errorf("got user id %q, want %q", got.UserID, want.UserID)
	}
}

func TestMemberServiceGet_NotFound(t *testing.T) {
	_, err := newService(&mockServiceStore{getCampaignUserErr: sql.ErrNoRows}).Get("campaign-1", "user-1")
	assertError(t, err, member.ErrCampaignUserNotFound)
}

// ── UpdateRole ────────────────────────────────────────────────────────────────

func TestMemberServiceUpdateRole_HappyPath(t *testing.T) {
	want := testMember()
	got, err := newService(&mockServiceStore{member: want}).UpdateRole(want.CampaignID, want.UserID, model.MemberRolePlayer)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.UserID != want.UserID {
		t.Errorf("got user id %q, want %q", got.UserID, want.UserID)
	}
}

func TestMemberServiceUpdateRole_NotFound(t *testing.T) {
	_, err := newService(&mockServiceStore{updateRoleErr: sql.ErrNoRows}).UpdateRole("campaign-1", "user-1", model.MemberRolePlayer)
	assertError(t, err, member.ErrCampaignUserNotFound)
}

// ── AcceptInvitation ──────────────────────────────────────────────────────────

func TestMemberServiceAcceptInvitation_HappyPath(t *testing.T) {
	store := &mockServiceStore{
		invitation: testInvitation(),
		user:       &model.User{ID: "user-1", Email: testInvitation().InviteeEmail},
		member:     testMember(),
	}
	resp, err := newService(store).AcceptInvitation("valid-token")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Member == nil {
		t.Error("expected member, got nil")
	}
	if resp.Invitation == nil {
		t.Error("expected invitation, got nil")
	}
}

func TestMemberServiceAcceptInvitation_TokenNotFound(t *testing.T) {
	_, err := newService(&mockServiceStore{getInvitationByTokenErr: sql.ErrNoRows}).AcceptInvitation("bad-token")
	assertError(t, err, member.ErrCampaignInvitationNotFound)
}

func TestMemberServiceAcceptInvitation_UserNotFound(t *testing.T) {
	store := &mockServiceStore{
		invitation:      testInvitation(),
		getUserByEmailErr: sql.ErrNoRows,
	}
	_, err := newService(store).AcceptInvitation("valid-token")
	assertError(t, err, member.ErrUserNotFound)
}

// ── DeclineInvitation ─────────────────────────────────────────────────────────

func TestMemberServiceDeclineInvitation_HappyPath(t *testing.T) {
	store := &mockServiceStore{invitation: testInvitation()}
	resp, err := newService(store).DeclineInvitation("valid-token")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Invitation == nil {
		t.Error("expected invitation in response")
	}
}

func TestMemberServiceDeclineInvitation_TokenNotFound_ReturnsEmpty(t *testing.T) {
	store := &mockServiceStore{declineInvitationErr: sql.ErrNoRows}
	resp, err := newService(store).DeclineInvitation("bad-token")
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if resp.Invitation != nil {
		t.Error("expected nil invitation for not-found token")
	}
}

// ── CreateInvitation ──────────────────────────────────────────────────────────

func TestMemberServiceCreateInvitation_HappyPath(t *testing.T) {
	want := testInvitation()
	store := &mockServiceStore{
		getUserByEmailErr: sql.ErrNoRows,
		invitation:        want,
	}
	got, err := newService(store).CreateInvitation(&model.CreateCampaignInvitationRequest{
		CampaignID:   want.CampaignID,
		InviteeEmail: want.InviteeEmail,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != want.ID {
		t.Errorf("got id %q, want %q", got.ID, want.ID)
	}
}

func TestMemberServiceCreateInvitation_AlreadyMember(t *testing.T) {
	store := &mockServiceStore{
		user:   &model.User{ID: "user-1"},
		member: testMember(),
	}
	_, err := newService(store).CreateInvitation(&model.CreateCampaignInvitationRequest{
		CampaignID:   "campaign-1",
		InviteeEmail: "player@example.com",
	})
	assertError(t, err, member.ErrCampaignUserAlreadyExists)
}

// ── RevokeInvitation ──────────────────────────────────────────────────────────

func TestMemberServiceRevokeInvitation_HappyPath(t *testing.T) {
	want := testInvitation()
	got, err := newService(&mockServiceStore{invitation: want}).RevokeInvitation(want.ID, want.CampaignID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != want.ID {
		t.Errorf("got id %q, want %q", got.ID, want.ID)
	}
}

func TestMemberServiceRevokeInvitation_NotFound(t *testing.T) {
	_, err := newService(&mockServiceStore{revokeInvitationErr: sql.ErrNoRows}).RevokeInvitation("invite-1", "campaign-1")
	assertError(t, err, member.ErrCampaignInvitationNotFound)
}
