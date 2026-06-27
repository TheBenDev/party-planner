package member_test

import (
	"context"
	"log/slog"
	"testing"

	"connectrpc.com/connect"
	v1 "github.com/BBruington/party-planner/api/gen/planner/v1"
	"github.com/BBruington/party-planner/api/internal/domain/member"
	model "github.com/BBruington/party-planner/api/internal/models"
)

type mockStore struct {
	members     []*model.Member
	membersUser []*model.MemberWithUser
	invitation  *model.CampaignInvitation
	invitations []*model.CampaignInvitation
	user        *model.User
	err         error
}

func (m *mockStore) CreateCampaignUser(_ context.Context, _ *model.CreateMemberRequest) (*model.Member, error) {
	return m.oneMember(), m.err
}
func (m *mockStore) GetCampaignUser(_ context.Context, _, _ string) (*model.Member, error) {
	return m.oneMember(), m.err
}
func (m *mockStore) ListCampaignUsersByCampaign(_ context.Context, _ string) ([]*model.MemberWithUser, error) {
	return m.membersUser, m.err
}
func (m *mockStore) ListCampaignUsersByUser(_ context.Context, _ string) ([]*model.MemberWithUser, error) {
	return m.membersUser, m.err
}
func (m *mockStore) RemoveCampaignUser(_ context.Context, _, _ string) error { return m.err }
func (m *mockStore) UpdateCampaignUserRole(_ context.Context, _, _ string, _ model.MemberRole) (*model.Member, error) {
	return m.oneMember(), m.err
}
func (m *mockStore) CreateCampaignInvitation(_ context.Context, _ *model.CreateCampaignInvitationRequest) (*model.CampaignInvitation, error) {
	return m.invitation, m.err
}
func (m *mockStore) GetCampaignInvitationByEmail(_ context.Context, _, _ string, _ model.InvitationStatus) (*model.CampaignInvitation, error) {
	return m.invitation, m.err
}
func (m *mockStore) GetCampaignInvitationByToken(_ context.Context, _ string) (*model.GetCampaignInvitationResponse, error) {
	if m.invitation == nil {
		return nil, m.err
	}
	return &model.GetCampaignInvitationResponse{Invitation: m.invitation}, m.err
}
func (m *mockStore) ListCampaignInvitations(_ context.Context, _ string) ([]*model.CampaignInvitation, error) {
	return m.invitations, m.err
}
func (m *mockStore) AcceptCampaignInvitation(_ context.Context, _ string, _ model.MemberRole) (*model.CampaignInvitation, error) {
	return m.invitation, m.err
}
func (m *mockStore) DeclineCampaignInvitation(_ context.Context, _ string) (*model.CampaignInvitation, error) {
	return m.invitation, m.err
}
func (m *mockStore) RevokeCampaignInvitation(_ context.Context, _, _ string) (*model.CampaignInvitation, error) {
	return m.invitation, m.err
}
func (m *mockStore) GetUserByEmail(_ context.Context, _ string) (*model.User, error) {
	return m.user, m.err
}
func (m *mockStore) RunInTx(ctx context.Context, fn func(context.Context, member.Store) error) error {
	return fn(ctx, m)
}

func (m *mockStore) oneMember() *model.Member {
	if len(m.members) == 0 {
		return nil
	}
	return m.members[0]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func testMember() *model.Member {
	return &model.Member{
		CampaignID: "campaign-1",
		UserID:     "user-1",
		Role:       model.MemberRolePlayer,
	}
}

func testInvitation() *model.CampaignInvitation {
	return &model.CampaignInvitation{
		ID:           "invite-1",
		CampaignID:   "campaign-1",
		InviterID:    "user-1",
		InviteeEmail: "player@example.com",
		Role:         model.MemberRolePlayer,
		Status:       model.InvitationStatusPending,
	}
}

func newServer(store member.Store) *member.Server {
	return &member.Server{
		Member: &member.Service{DB: store, Log: slog.Default()},
		Log:    slog.Default(),
	}
}

func validationServer() *member.Server {
	return &member.Server{Log: slog.Default()}
}

func assertCode(t *testing.T, err error, want connect.Code) {
	t.Helper()
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if connect.CodeOf(err) != want {
		t.Errorf("got code %v, want %v", connect.CodeOf(err), want)
	}
}

// ── Validation tests ──────────────────────────────────────────────────────────

func TestCreateMember_Validation(t *testing.T) {
	server := validationServer()
	tests := []struct {
		name string
		req  *v1.CreateMemberRequest
	}{
		{"missing user id", &v1.CreateMemberRequest{
			CampaignId: "campaign-1",
			Role:       v1.MemberRole_MEMBER_ROLE_PLAYER,
		}},
		{"missing campaign id", &v1.CreateMemberRequest{
			UserId: "user-1",
			Role:   v1.MemberRole_MEMBER_ROLE_PLAYER,
		}},
		{"missing role", &v1.CreateMemberRequest{
			UserId:     "user-1",
			CampaignId: "campaign-1",
		}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.CreateMember(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

func TestGetMember_Validation(t *testing.T) {
	server := validationServer()
	tests := []struct {
		name string
		req  *v1.GetMemberRequest
	}{
		{"missing campaign id", &v1.GetMemberRequest{UserId: "user-1"}},
		{"missing user id", &v1.GetMemberRequest{CampaignId: "campaign-1"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.GetMember(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

func TestRemoveMember_Validation(t *testing.T) {
	server := validationServer()
	tests := []struct {
		name string
		req  *v1.RemoveMemberRequest
	}{
		{"missing campaign id", &v1.RemoveMemberRequest{UserId: "user-1"}},
		{"missing user id", &v1.RemoveMemberRequest{CampaignId: "campaign-1"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.RemoveMember(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

func TestAcceptCampaignInvitation_Validation(t *testing.T) {
	server := validationServer()
	_, err := server.AcceptCampaignInvitation(context.Background(), connect.NewRequest(&v1.AcceptCampaignInvitationRequest{}))
	assertCode(t, err, connect.CodeInvalidArgument)
}

func TestDeclineCampaignInvitation_Validation(t *testing.T) {
	server := validationServer()
	_, err := server.DeclineCampaignInvitation(context.Background(), connect.NewRequest(&v1.DeclineCampaignInvitationRequest{}))
	assertCode(t, err, connect.CodeInvalidArgument)
}

func TestCreateCampaignInvitation_Validation(t *testing.T) {
	server := validationServer()
	tests := []struct {
		name string
		req  *v1.CreateCampaignInvitationRequest
	}{
		{"missing campaign id", &v1.CreateCampaignInvitationRequest{
			InviteeEmail: "p@example.com",
			InviterId:    "user-1",
			Role:         v1.MemberRole_MEMBER_ROLE_PLAYER,
		}},
		{"missing invitee email", &v1.CreateCampaignInvitationRequest{
			CampaignId: "campaign-1",
			InviterId:  "user-1",
			Role:       v1.MemberRole_MEMBER_ROLE_PLAYER,
		}},
		{"missing inviter id", &v1.CreateCampaignInvitationRequest{
			CampaignId:   "campaign-1",
			InviteeEmail: "p@example.com",
			Role:         v1.MemberRole_MEMBER_ROLE_PLAYER,
		}},
		{"missing role", &v1.CreateCampaignInvitationRequest{
			CampaignId:   "campaign-1",
			InviteeEmail: "p@example.com",
			InviterId:    "user-1",
		}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.CreateCampaignInvitation(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

func TestGetCampaignInvitationByToken_Validation(t *testing.T) {
	server := validationServer()
	_, err := server.GetCampaignInvitationByToken(context.Background(), connect.NewRequest(&v1.GetCampaignInvitationByTokenRequest{}))
	assertCode(t, err, connect.CodeInvalidArgument)
}

func TestListCampaignInvitations_Validation(t *testing.T) {
	server := validationServer()
	_, err := server.ListCampaignInvitations(context.Background(), connect.NewRequest(&v1.ListCampaignInvitationsRequest{}))
	assertCode(t, err, connect.CodeInvalidArgument)
}

func TestRevokeCampaignInvitation_Validation(t *testing.T) {
	server := validationServer()
	tests := []struct {
		name string
		req  *v1.RevokeCampaignInvitationRequest
	}{
		{"missing id", &v1.RevokeCampaignInvitationRequest{CampaignId: "campaign-1"}},
		{"missing campaign id", &v1.RevokeCampaignInvitationRequest{Id: "invite-1"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.RevokeCampaignInvitation(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

// ── Happy path tests ──────────────────────────────────────────────────────────

func TestCreateMember_HappyPath(t *testing.T) {
	want := testMember()
	server := newServer(&mockStore{members: []*model.Member{want}})

	resp, err := server.CreateMember(context.Background(), connect.NewRequest(&v1.CreateMemberRequest{
		CampaignId: want.CampaignID,
		UserId:     want.UserID,
		Role:       v1.MemberRole_MEMBER_ROLE_PLAYER,
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Msg.Member.UserId != want.UserID {
		t.Errorf("got user id %q, want %q", resp.Msg.Member.UserId, want.UserID)
	}
	if resp.Msg.Member.CampaignId != want.CampaignID {
		t.Errorf("got campaign id %q, want %q", resp.Msg.Member.CampaignId, want.CampaignID)
	}
}

func TestGetMember_HappyPath(t *testing.T) {
	want := testMember()
	server := newServer(&mockStore{members: []*model.Member{want}})

	resp, err := server.GetMember(context.Background(), connect.NewRequest(&v1.GetMemberRequest{
		CampaignId: want.CampaignID,
		UserId:     want.UserID,
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Msg.Member.UserId != want.UserID {
		t.Errorf("got user id %q, want %q", resp.Msg.Member.UserId, want.UserID)
	}
}
