package session_test

import (
	"context"
	"log/slog"
	"testing"

	"connectrpc.com/connect"
	v1 "github.com/BBruington/party-planner/api/gen/planner/v1"
	"github.com/BBruington/party-planner/api/internal/domain/session"
	model "github.com/BBruington/party-planner/api/internal/models"
)

type mockStore struct {
	sess []*model.Session
	err  error
}

func (m *mockStore) CreateSession(_ *model.CreateSessionRequest) (*model.Session, error) {
	return m.one(), m.err
}
func (m *mockStore) UpsertSessionForSeries(_ *model.CreateSessionRequest) (*model.Session, error) {
	return m.one(), m.err
}
func (m *mockStore) GetSession(_, _ string) (*model.Session, error) {
	return m.one(), m.err
}
func (m *mockStore) ListOneOffSessionsByCampaign(_ string) ([]*model.Session, error) {
	return m.sess, m.err
}
func (m *mockStore) ListSeriesSessionsByCampaign(_ string) ([]*model.Session, error) {
	return m.sess, m.err
}
func (m *mockStore) GetNextSessionByCampaign(_ string) (*model.Session, error) {
	return m.one(), m.err
}
func (m *mockStore) RemoveSession(_, _ string) error { return m.err }
func (m *mockStore) UpdateSession(_ *model.UpdateSessionRequest) (*model.Session, error) {
	return m.one(), m.err
}

func (m *mockStore) one() *model.Session {
	if len(m.sess) == 0 {
		return nil
	}
	return m.sess[0]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func testSession() *model.Session {
	return &model.Session{
		ID:              "session-1",
		CampaignID:      "campaign-1",
		Title:           "Test Session",
		DurationMinutes: 180,
	}
}

func newServer(store session.Store) *session.Server {
	return &session.Server{
		Session: &session.Service{DB: store, Log: slog.Default()},
		Log:     slog.Default(),
	}
}

func validationServer() *session.Server {
	return &session.Server{Log: slog.Default()}
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

func TestCreateSession_Validation(t *testing.T) {
	server := validationServer()
	tests := []struct {
		name string
		req  *v1.CreateSessionRequest
	}{
		{"missing campaign id", &v1.CreateSessionRequest{Title: "Session"}},
		{"missing title", &v1.CreateSessionRequest{CampaignId: "campaign-1"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.CreateSession(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

func TestGetSession_Validation(t *testing.T) {
	server := validationServer()
	tests := []struct {
		name string
		req  *v1.GetSessionRequest
	}{
		{"missing id", &v1.GetSessionRequest{CampaignId: "campaign-1"}},
		{"missing campaign id", &v1.GetSessionRequest{Id: "session-1"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.GetSession(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

func TestRemoveSession_Validation(t *testing.T) {
	server := validationServer()
	tests := []struct {
		name string
		req  *v1.RemoveSessionRequest
	}{
		{"missing id", &v1.RemoveSessionRequest{CampaignId: "campaign-1"}},
		{"missing campaign id", &v1.RemoveSessionRequest{Id: "session-1"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.RemoveSession(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

func TestUpdateSession_Validation(t *testing.T) {
	server := validationServer()
	tests := []struct {
		name string
		req  *v1.UpdateSessionRequest
	}{
		{"missing id", &v1.UpdateSessionRequest{CampaignId: "campaign-1"}},
		{"missing campaign id", &v1.UpdateSessionRequest{Id: "session-1"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.UpdateSession(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

// ── Happy path tests ──────────────────────────────────────────────────────────

func TestCreateSession_HappyPath(t *testing.T) {
	want := testSession()
	server := newServer(&mockStore{sess: []*model.Session{want}})

	resp, err := server.CreateSession(context.Background(), connect.NewRequest(&v1.CreateSessionRequest{
		CampaignId: want.CampaignID,
		Title:      want.Title,
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Msg.Session.Id != want.ID {
		t.Errorf("got id %q, want %q", resp.Msg.Session.Id, want.ID)
	}
	if resp.Msg.Session.Title != want.Title {
		t.Errorf("got title %q, want %q", resp.Msg.Session.Title, want.Title)
	}
}

func TestGetSession_HappyPath(t *testing.T) {
	want := testSession()
	server := newServer(&mockStore{sess: []*model.Session{want}})

	resp, err := server.GetSession(context.Background(), connect.NewRequest(&v1.GetSessionRequest{
		Id:         want.ID,
		CampaignId: want.CampaignID,
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Msg.Session.Id != want.ID {
		t.Errorf("got id %q, want %q", resp.Msg.Session.Id, want.ID)
	}
}

func TestUpdateSession_HappyPath(t *testing.T) {
	want := testSession()
	server := newServer(&mockStore{sess: []*model.Session{want}})

	resp, err := server.UpdateSession(context.Background(), connect.NewRequest(&v1.UpdateSessionRequest{
		Id:         want.ID,
		CampaignId: want.CampaignID,
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Msg.Session.Id != want.ID {
		t.Errorf("got id %q, want %q", resp.Msg.Session.Id, want.ID)
	}
}
