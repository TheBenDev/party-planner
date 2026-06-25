package campaign_test

import (
	"context"
	"log/slog"
	"testing"

	"connectrpc.com/connect"
	v1 "github.com/BBruington/party-planner/api/gen/planner/v1"
	"github.com/BBruington/party-planner/api/internal/domain/campaign"
	model "github.com/BBruington/party-planner/api/internal/models"
)

type mockStore struct {
	camp   *model.Campaign
	member *model.Member
	err    error
}

func (m *mockStore) RunInTx(fn func(campaign.Store) error) error { return fn(m) }

func (m *mockStore) CreateCampaign(_ *model.CreateCampaignRequest) (*model.Campaign, error) {
	return m.camp, m.err
}

func (m *mockStore) GetCampaign(_ string) (*model.Campaign, error) {
	return m.camp, m.err
}

func (m *mockStore) UpdateCampaign(_ *model.UpdateCampaignRequest) (*model.Campaign, error) {
	return m.camp, m.err
}

func (m *mockStore) DeleteCampaign(_ string) (*model.Campaign, error) {
	return m.camp, m.err
}

func (m *mockStore) CreateCampaignUser(_ *model.CreateMemberRequest) (*model.Member, error) {
	return m.member, m.err
}

func (m *mockStore) GetCampaignUser(_, _ string) (*model.Member, error) {
	return m.member, m.err
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func testCampaign() *model.Campaign {
	return &model.Campaign{
		ID:     "campaign-1",
		UserID: "user-1",
		Title:  "Test Campaign",
		Tags:   []string{},
	}
}

func testDMMember() *model.Member {
	return &model.Member{
		CampaignID: "campaign-1",
		UserID:     "user-1",
		Role:       model.MemberRoleDungeonMaster,
	}
}

// newServer wires a Server backed by the given store mock.
func newServer(store campaign.Store) *campaign.Server {
	return &campaign.Server{
		Campaign: &campaign.Service{DB: store, Log: slog.Default()},
		Log:      slog.Default(),
	}
}

// validationServer has no Campaign service wired — safe because validation
// returns before touching the service layer.
func validationServer() *campaign.Server {
	return &campaign.Server{Log: slog.Default()}
}

// ── Validation tests ──────────────────────────────────────────────────────────

func TestCreateCampaign_Validation(t *testing.T) {
	server := validationServer()
	tests := []struct {
		name string
		req  *v1.CreateCampaignRequest
	}{
		{"missing user id", &v1.CreateCampaignRequest{Title: "My Campaign"}},
		{"missing title", &v1.CreateCampaignRequest{UserId: "user-1"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.CreateCampaign(context.Background(), connect.NewRequest(tt.req))
			if err == nil {
				t.Fatal("expected error, got nil")
			}
			if connect.CodeOf(err) != connect.CodeInvalidArgument {
				t.Errorf("got code %v, want %v", connect.CodeOf(err), connect.CodeInvalidArgument)
			}
		})
	}
}

func TestGetCampaign_Validation(t *testing.T) {
	_, err := validationServer().GetCampaign(context.Background(), connect.NewRequest(&v1.GetCampaignRequest{}))
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if connect.CodeOf(err) != connect.CodeInvalidArgument {
		t.Errorf("got code %v, want %v", connect.CodeOf(err), connect.CodeInvalidArgument)
	}
}

func TestUpdateCampaign_Validation(t *testing.T) {
	server := validationServer()
	tests := []struct {
		name string
		req  *v1.UpdateCampaignRequest
	}{
		{"missing campaign id", &v1.UpdateCampaignRequest{UserId: "user-1"}},
		{"missing user id", &v1.UpdateCampaignRequest{Id: "campaign-1"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.UpdateCampaign(context.Background(), connect.NewRequest(tt.req))
			if err == nil {
				t.Fatal("expected error, got nil")
			}
			if connect.CodeOf(err) != connect.CodeInvalidArgument {
				t.Errorf("got code %v, want %v", connect.CodeOf(err), connect.CodeInvalidArgument)
			}
		})
	}
}

func TestDeleteCampaign_Validation(t *testing.T) {
	server := validationServer()
	tests := []struct {
		name string
		req  *v1.DeleteCampaignRequest
	}{
		{"missing campaign id", &v1.DeleteCampaignRequest{UserId: "user-1"}},
		{"missing user id", &v1.DeleteCampaignRequest{Id: "campaign-1"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.DeleteCampaign(context.Background(), connect.NewRequest(tt.req))
			if err == nil {
				t.Fatal("expected error, got nil")
			}
			if connect.CodeOf(err) != connect.CodeInvalidArgument {
				t.Errorf("got code %v, want %v", connect.CodeOf(err), connect.CodeInvalidArgument)
			}
		})
	}
}

// ── Happy path tests ──────────────────────────────────────────────────────────

func TestCreateCampaign_HappyPath(t *testing.T) {
	want := testCampaign()
	server := newServer(&mockStore{camp: want, member: testDMMember()})

	resp, err := server.CreateCampaign(context.Background(), connect.NewRequest(&v1.CreateCampaignRequest{
		UserId: want.UserID,
		Title:  want.Title,
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Msg.Campaign.Id != want.ID {
		t.Errorf("got id %q, want %q", resp.Msg.Campaign.Id, want.ID)
	}
	if resp.Msg.Campaign.Title != want.Title {
		t.Errorf("got title %q, want %q", resp.Msg.Campaign.Title, want.Title)
	}
}

func TestGetCampaign_HappyPath(t *testing.T) {
	want := testCampaign()
	server := newServer(&mockStore{camp: want})

	resp, err := server.GetCampaign(context.Background(), connect.NewRequest(&v1.GetCampaignRequest{
		Id: want.ID,
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Msg.Campaign.Id != want.ID {
		t.Errorf("got id %q, want %q", resp.Msg.Campaign.Id, want.ID)
	}
}

func TestUpdateCampaign_HappyPath(t *testing.T) {
	want := testCampaign()
	server := newServer(&mockStore{camp: want, member: testDMMember()})

	resp, err := server.UpdateCampaign(context.Background(), connect.NewRequest(&v1.UpdateCampaignRequest{
		Id:     want.ID,
		UserId: want.UserID,
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Msg.Campaign.Id != want.ID {
		t.Errorf("got id %q, want %q", resp.Msg.Campaign.Id, want.ID)
	}
}

func TestDeleteCampaign_HappyPath(t *testing.T) {
	want := testCampaign()
	server := newServer(&mockStore{camp: want, member: testDMMember()})

	resp, err := server.DeleteCampaign(context.Background(), connect.NewRequest(&v1.DeleteCampaignRequest{
		Id:     want.ID,
		UserId: want.UserID,
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Msg.Campaign.Id != want.ID {
		t.Errorf("got id %q, want %q", resp.Msg.Campaign.Id, want.ID)
	}
}
