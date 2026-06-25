package user_test

import (
	"context"
	"log/slog"
	"testing"

	"connectrpc.com/connect"
	v1 "github.com/BBruington/party-planner/api/gen/planner/v1"
	"github.com/BBruington/party-planner/api/internal/domain/user"
	model "github.com/BBruington/party-planner/api/internal/models"
)

type mockStore struct {
	users   []*model.User
	members []*model.MemberWithUser
	member  *model.Member
	err     error
}

func (m *mockStore) CreateUser(_ *model.CreateUserRequest) (*model.User, error) {
	return m.oneUser(), m.err
}
func (m *mockStore) DeleteUser(_ string) (*model.User, error)        { return m.oneUser(), m.err }
func (m *mockStore) GetUserByClerkID(_ string) (*model.User, error)  { return m.oneUser(), m.err }
func (m *mockStore) GetUserByEmail(_ string) (*model.User, error)    { return m.oneUser(), m.err }
func (m *mockStore) GetUserByID(_ string) (*model.User, error)       { return m.oneUser(), m.err }
func (m *mockStore) UpdateUserByClerkID(_ *model.UpdateUserRequest) (*model.User, error) {
	return m.oneUser(), m.err
}
func (m *mockStore) GetCampaign(_ string) (*model.Campaign, error) { return nil, m.err }
func (m *mockStore) GetCampaignUser(_, _ string) (*model.Member, error) {
	return m.member, m.err
}
func (m *mockStore) ListCampaignUsersByUser(_ string) ([]*model.MemberWithUser, error) {
	return m.members, m.err
}

func (m *mockStore) oneUser() *model.User {
	if len(m.users) == 0 {
		return nil
	}
	return m.users[0]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func testUser() *model.User {
	return &model.User{
		ID:         "user-1",
		ExternalId: "clerk-1",
		Email:      "player@example.com",
	}
}

func newServer(store user.Store) *user.Server {
	return &user.Server{
		User: &user.Service{DB: store, Log: slog.Default()},
		Log:  slog.Default(),
	}
}

func validationServer() *user.Server {
	return &user.Server{Log: slog.Default()}
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

func TestCreateUser_Validation(t *testing.T) {
	server := validationServer()
	tests := []struct {
		name string
		req  *v1.CreateUserRequest
	}{
		{"missing external id", &v1.CreateUserRequest{Email: "player@example.com"}},
		{"missing email", &v1.CreateUserRequest{ExternalId: "clerk-1"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.CreateUser(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

func TestGetUser_Validation(t *testing.T) {
	server := validationServer()
	_, err := server.GetUser(context.Background(), connect.NewRequest(&v1.GetUserRequest{}))
	assertCode(t, err, connect.CodeInvalidArgument)
}

func TestGetAuth_Validation(t *testing.T) {
	server := validationServer()
	_, err := server.GetAuth(context.Background(), connect.NewRequest(&v1.GetAuthRequest{}))
	assertCode(t, err, connect.CodeInvalidArgument)
}

func TestGetUserByEmail_Validation(t *testing.T) {
	server := validationServer()
	_, err := server.GetUserByEmail(context.Background(), connect.NewRequest(&v1.GetUserByEmailRequest{}))
	assertCode(t, err, connect.CodeInvalidArgument)
}

func TestUpdateUser_Validation(t *testing.T) {
	server := validationServer()
	_, err := server.UpdateUser(context.Background(), connect.NewRequest(&v1.UpdateUserRequest{}))
	assertCode(t, err, connect.CodeInvalidArgument)
}

// ── Happy path tests ──────────────────────────────────────────────────────────

func TestCreateUser_HappyPath(t *testing.T) {
	want := testUser()
	server := newServer(&mockStore{users: []*model.User{want}})

	resp, err := server.CreateUser(context.Background(), connect.NewRequest(&v1.CreateUserRequest{
		ExternalId: want.ExternalId,
		Email:      want.Email,
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Msg.User.Id != want.ID {
		t.Errorf("got id %q, want %q", resp.Msg.User.Id, want.ID)
	}
	if resp.Msg.User.Email != want.Email {
		t.Errorf("got email %q, want %q", resp.Msg.User.Email, want.Email)
	}
}

func TestGetUser_HappyPath(t *testing.T) {
	want := testUser()
	server := newServer(&mockStore{users: []*model.User{want}})

	resp, err := server.GetUser(context.Background(), connect.NewRequest(&v1.GetUserRequest{
		ExternalId: want.ExternalId,
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Msg.User.Id != want.ID {
		t.Errorf("got id %q, want %q", resp.Msg.User.Id, want.ID)
	}
}
