package region_test

import (
	"context"
	"log/slog"
	"testing"
	"time"

	"connectrpc.com/connect"
	v1 "github.com/BBruington/party-planner/api/gen/planner/v1"
	"github.com/BBruington/party-planner/api/internal/domain/region"
	model "github.com/BBruington/party-planner/api/internal/models"
)

type mockServicer struct {
	reg                 []*model.Region
	regions             []*model.RegionWithLocations
	regionWithLocations *model.RegionWithLocations
	err                 error
}

func (m *mockServicer) Create(_ context.Context, _ *model.CreateRegionRequest) (*model.Region, error) {
	return m.one(), m.err
}
func (m *mockServicer) GetByID(_ context.Context, _, _ string) (*model.RegionWithLocations, error) {
	return m.regionWithLocations, m.err
}
func (m *mockServicer) ListByCampaign(_ context.Context, _ string) ([]*model.RegionWithLocations, error) {
	return m.regions, m.err
}
func (m *mockServicer) Update(_ context.Context, _ *model.UpdateRegionRequest) (*model.Region, error) {
	return m.one(), m.err
}
func (m *mockServicer) Delete(_ context.Context, _, _ string) (*model.Region, error) {
	return m.one(), m.err
}

func (m *mockServicer) one() *model.Region {
	if len(m.reg) == 0 {
		return nil
	}
	return m.reg[0]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func testRegion() *model.Region {
	return &model.Region{
		ID:         "region-1",
		CampaignID: "campaign-1",
		Name:       "The Underdark",
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}
}

func newServer(svc region.RegionServicer) *region.Server {
	return &region.Server{Region: svc, Log: slog.Default()}
}

func validationServer() *region.Server {
	return &region.Server{Log: slog.Default()}
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

func TestListRegionsByCampaign_Validation(t *testing.T) {
	server := validationServer()
	_, err := server.ListRegionsByCampaign(context.Background(), connect.NewRequest(&v1.ListRegionsByCampaignRequest{}))
	assertCode(t, err, connect.CodeInvalidArgument)
}

func TestCreateRegion_Validation(t *testing.T) {
	server := validationServer()
	tests := []struct {
		name string
		req  *v1.CreateRegionRequest
	}{
		{"missing campaign id", &v1.CreateRegionRequest{Name: "The Underdark"}},
		{"missing name", &v1.CreateRegionRequest{CampaignId: "campaign-1"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.CreateRegion(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

func TestGetRegion_Validation(t *testing.T) {
	server := validationServer()
	tests := []struct {
		name string
		req  *v1.GetRegionRequest
	}{
		{"missing id", &v1.GetRegionRequest{CampaignId: "campaign-1"}},
		{"missing campaign id", &v1.GetRegionRequest{Id: "region-1"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.GetRegion(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

func TestUpdateRegion_Validation(t *testing.T) {
	server := validationServer()
	tests := []struct {
		name string
		req  *v1.UpdateRegionRequest
	}{
		{"missing id", &v1.UpdateRegionRequest{CampaignId: "campaign-1"}},
		{"missing campaign id", &v1.UpdateRegionRequest{Id: "region-1"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.UpdateRegion(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

func TestRemoveRegion_Validation(t *testing.T) {
	server := validationServer()
	tests := []struct {
		name string
		req  *v1.RemoveRegionRequest
	}{
		{"missing id", &v1.RemoveRegionRequest{CampaignId: "campaign-1"}},
		{"missing campaign id", &v1.RemoveRegionRequest{Id: "region-1"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.RemoveRegion(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

// ── Happy path tests ──────────────────────────────────────────────────────────

func TestCreateRegion_HappyPath(t *testing.T) {
	want := testRegion()
	server := newServer(&mockServicer{reg: []*model.Region{want}})

	resp, err := server.CreateRegion(context.Background(), connect.NewRequest(&v1.CreateRegionRequest{
		CampaignId: want.CampaignID,
		Name:       want.Name,
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Msg.Region.Id != want.ID {
		t.Errorf("got id %q, want %q", resp.Msg.Region.Id, want.ID)
	}
	if resp.Msg.Region.Name != want.Name {
		t.Errorf("got name %q, want %q", resp.Msg.Region.Name, want.Name)
	}
}

func TestGetRegion_HappyPath(t *testing.T) {
	want := testRegion()
	server := newServer(&mockServicer{regionWithLocations: &model.RegionWithLocations{Region: want, Locations: []*model.Location{}}})

	resp, err := server.GetRegion(context.Background(), connect.NewRequest(&v1.GetRegionRequest{
		Id:         want.ID,
		CampaignId: want.CampaignID,
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Msg.Data.Region.Id != want.ID {
		t.Errorf("got id %q, want %q", resp.Msg.Data.Region.Id, want.ID)
	}
}

func TestListRegionsByCampaign_HappyPath(t *testing.T) {
	want := testRegion()
	server := newServer(&mockServicer{
		regions: []*model.RegionWithLocations{
			{Region: want, Locations: []*model.Location{}},
		},
	})

	resp, err := server.ListRegionsByCampaign(context.Background(), connect.NewRequest(&v1.ListRegionsByCampaignRequest{
		CampaignId: want.CampaignID,
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(resp.Msg.Regions) != 1 {
		t.Fatalf("got %d regions, want 1", len(resp.Msg.Regions))
	}
	if resp.Msg.Regions[0].Region.Id != want.ID {
		t.Errorf("got region id %q, want %q", resp.Msg.Regions[0].Region.Id, want.ID)
	}
}

func TestUpdateRegion_HappyPath(t *testing.T) {
	want := testRegion()
	server := newServer(&mockServicer{reg: []*model.Region{want}})

	resp, err := server.UpdateRegion(context.Background(), connect.NewRequest(&v1.UpdateRegionRequest{
		Id:         want.ID,
		CampaignId: want.CampaignID,
		Name:       &want.Name,
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Msg.Region.Id != want.ID {
		t.Errorf("got id %q, want %q", resp.Msg.Region.Id, want.ID)
	}
}

func TestRemoveRegion_HappyPath(t *testing.T) {
	want := testRegion()
	server := newServer(&mockServicer{reg: []*model.Region{want}})

	_, err := server.RemoveRegion(context.Background(), connect.NewRequest(&v1.RemoveRegionRequest{
		Id:         want.ID,
		CampaignId: want.CampaignID,
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}
