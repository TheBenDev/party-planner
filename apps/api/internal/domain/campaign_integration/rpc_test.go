package campaign_integration_test

import (
	"context"
	"log/slog"
	"testing"

	"connectrpc.com/connect"
	v1 "github.com/BBruington/party-planner/api/gen/planner/v1"
	campaignintegration "github.com/BBruington/party-planner/api/internal/domain/campaign_integration"
	model "github.com/BBruington/party-planner/api/internal/models"
)

type mockServicer struct {
	integration  *model.CampaignIntegration
	integrations []*model.CampaignIntegration
	err          error
}

func (m *mockServicer) GetByCampaign(_ context.Context, _ string, _ model.IntegrationSource) (*model.CampaignIntegration, error) {
	return m.integration, m.err
}
func (m *mockServicer) CreateDiscord(_ context.Context, _ *model.CreateDiscordCampaignIntegrationRequest) (*model.CampaignIntegration, error) {
	return m.integration, m.err
}
func (m *mockServicer) ListByCampaign(_ context.Context, _ string) ([]*model.CampaignIntegration, error) {
	return m.integrations, m.err
}
func (m *mockServicer) Update(_ context.Context, _ *model.UpdateCampaignIntegrationRequest) (*model.CampaignIntegration, error) {
	return m.integration, m.err
}
func (m *mockServicer) Remove(_ context.Context, _ string, _ model.IntegrationSource) error {
	return m.err
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func testIntegration() *model.CampaignIntegration {
	return &model.CampaignIntegration{
		ID:         "integration-1",
		CampaignID: "campaign-1",
		ExternalID: "discord-guild-1",
		Source:     model.IntegrationSourceDiscord,
	}
}

func newServer(svc campaignintegration.Servicer) *campaignintegration.Server {
	return &campaignintegration.Server{
		CampaignIntegration: svc,
		Log:                 slog.Default(),
	}
}

func validationServer() *campaignintegration.Server {
	return &campaignintegration.Server{Log: slog.Default()}
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

func TestGetCampaignIntegration_Validation(t *testing.T) {
	server := validationServer()
	tests := []struct {
		name string
		req  *v1.GetCampaignIntegrationRequest
	}{
		{"missing campaign id", &v1.GetCampaignIntegrationRequest{
			Source: v1.IntegrationSource_INTEGRATION_SOURCE_DISCORD,
		}},
		{"missing source", &v1.GetCampaignIntegrationRequest{
			CampaignId: "campaign-1",
		}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.GetCampaignIntegration(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

func TestCreateCampaignIntegration_Validation(t *testing.T) {
	server := validationServer()
	tests := []struct {
		name string
		req  *v1.CreateCampaignIntegrationRequest
	}{
		{"missing campaign id", &v1.CreateCampaignIntegrationRequest{
			Integration: &v1.CreateCampaignIntegrationRequest_Discord{
				Discord: &v1.CreateDiscordIntegrationParams{Code: "code"},
			},
		}},
		{"missing integration params", &v1.CreateCampaignIntegrationRequest{
			CampaignId: "campaign-1",
		}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.CreateCampaignIntegration(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

func TestListCampaignIntegrationsByCampaign_Validation(t *testing.T) {
	server := validationServer()
	_, err := server.ListCampaignIntegrationsByCampaign(context.Background(), connect.NewRequest(&v1.ListCampaignIntegrationsByCampaignRequest{}))
	assertCode(t, err, connect.CodeInvalidArgument)
}

func TestUpdateCampaignIntegration_Validation(t *testing.T) {
	server := validationServer()
	tests := []struct {
		name string
		req  *v1.UpdateCampaignIntegrationRequest
	}{
		{"missing campaign id", &v1.UpdateCampaignIntegrationRequest{
			Integration: &v1.UpdateCampaignIntegrationRequest_Discord{
				Discord: &v1.UpdateDiscordIntegrationParams{},
			},
		}},
		{"missing integration params", &v1.UpdateCampaignIntegrationRequest{
			CampaignId: "campaign-1",
		}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.UpdateCampaignIntegration(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

func TestRemoveCampaignIntegration_Validation(t *testing.T) {
	server := validationServer()
	tests := []struct {
		name string
		req  *v1.RemoveCampaignIntegrationRequest
	}{
		{"missing campaign id", &v1.RemoveCampaignIntegrationRequest{
			Source: v1.IntegrationSource_INTEGRATION_SOURCE_DISCORD,
		}},
		{"missing source", &v1.RemoveCampaignIntegrationRequest{
			CampaignId: "campaign-1",
		}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.RemoveCampaignIntegration(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

// ── Happy path tests ──────────────────────────────────────────────────────────

func TestGetCampaignIntegration_HappyPath(t *testing.T) {
	want := testIntegration()
	server := newServer(&mockServicer{integration: want})

	resp, err := server.GetCampaignIntegration(context.Background(), connect.NewRequest(&v1.GetCampaignIntegrationRequest{
		CampaignId: want.CampaignID,
		Source:     v1.IntegrationSource_INTEGRATION_SOURCE_DISCORD,
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Msg.Integration.Id != want.ID {
		t.Errorf("got id %q, want %q", resp.Msg.Integration.Id, want.ID)
	}
}

func TestListCampaignIntegrationsByCampaign_HappyPath(t *testing.T) {
	want := testIntegration()
	server := newServer(&mockServicer{integrations: []*model.CampaignIntegration{want}})

	resp, err := server.ListCampaignIntegrationsByCampaign(context.Background(), connect.NewRequest(&v1.ListCampaignIntegrationsByCampaignRequest{
		CampaignId: want.CampaignID,
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(resp.Msg.Integrations) != 1 {
		t.Errorf("got %d integrations, want 1", len(resp.Msg.Integrations))
	}
}
