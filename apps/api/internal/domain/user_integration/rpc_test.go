package user_integration_test

import (
	"context"
	"log/slog"
	"testing"

	"connectrpc.com/connect"
	v1 "github.com/BBruington/party-planner/api/gen/planner/v1"
	user_integration "github.com/BBruington/party-planner/api/internal/domain/user_integration"
	model "github.com/BBruington/party-planner/api/internal/models"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type mockStore struct {
	integration *model.UserIntegration
	members     []*model.CampaignMemberIntegration
	err         error
}

func (m *mockStore) GetUserIntegration(_ string, _ model.IntegrationSource) (*model.UserIntegration, error) {
	return m.integration, m.err
}
func (m *mockStore) UpsertUserIntegration(_ *model.UpsertUserIntegrationRequest) (*model.UserIntegration, error) {
	return m.integration, m.err
}
func (m *mockStore) DeleteUserIntegration(_ string, _ model.IntegrationSource) error { return m.err }
func (m *mockStore) ListUserIntegrationsByCampaign(_ string, _ model.IntegrationSource) ([]*model.CampaignMemberIntegration, error) {
	return m.members, m.err
}
func (m *mockStore) GetCampaignIntegration(_ string, _ model.IntegrationSource) (*model.CampaignIntegration, error) {
	return nil, m.err
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func newServer(store user_integration.Store) *user_integration.Server {
	return &user_integration.Server{
		Service: &user_integration.Service{DB: store, Log: slog.Default()},
		Log:     slog.Default(),
	}
}

func validationServer() *user_integration.Server {
	return &user_integration.Server{Log: slog.Default()}
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

func TestConnectGoogleCalendar_Validation(t *testing.T) {
	server := validationServer()
	tests := []struct {
		name string
		req  *v1.ConnectGoogleCalendarRequest
	}{
		{"missing user id", &v1.ConnectGoogleCalendarRequest{Code: "auth-code"}},
		{"missing code", &v1.ConnectGoogleCalendarRequest{UserId: "user-1"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.ConnectGoogleCalendar(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

func TestDisconnectGoogleCalendar_Validation(t *testing.T) {
	server := validationServer()
	_, err := server.DisconnectGoogleCalendar(context.Background(), connect.NewRequest(&v1.DisconnectGoogleCalendarRequest{}))
	assertCode(t, err, connect.CodeInvalidArgument)
}

func TestGetGoogleCalendarStatus_Validation(t *testing.T) {
	server := validationServer()
	_, err := server.GetGoogleCalendarStatus(context.Background(), connect.NewRequest(&v1.GetGoogleCalendarStatusRequest{}))
	assertCode(t, err, connect.CodeInvalidArgument)
}

func TestCheckCalendarConflicts_Validation(t *testing.T) {
	server := validationServer()
	tests := []struct {
		name string
		req  *v1.CheckCalendarConflictsRequest
	}{
		{"missing campaign id", &v1.CheckCalendarConflictsRequest{StartsAt: timestamppb.Now()}},
		{"missing starts at", &v1.CheckCalendarConflictsRequest{CampaignId: "campaign-1"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.CheckCalendarConflicts(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

// ── Happy path tests ──────────────────────────────────────────────────────────

func TestDisconnectGoogleCalendar_HappyPath(t *testing.T) {
	server := newServer(&mockStore{})

	_, err := server.DisconnectGoogleCalendar(context.Background(), connect.NewRequest(&v1.DisconnectGoogleCalendarRequest{
		UserId: "user-1",
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestCheckCalendarConflicts_HappyPath(t *testing.T) {
	server := newServer(&mockStore{members: []*model.CampaignMemberIntegration{}})

	resp, err := server.CheckCalendarConflicts(context.Background(), connect.NewRequest(&v1.CheckCalendarConflictsRequest{
		CampaignId: "campaign-1",
		StartsAt:   timestamppb.Now(),
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(resp.Msg.Conflicts) != 0 {
		t.Errorf("got %d conflicts, want 0", len(resp.Msg.Conflicts))
	}
}
