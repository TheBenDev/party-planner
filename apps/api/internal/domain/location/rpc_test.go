package location_test

import (
	"context"
	"log/slog"
	"testing"

	"connectrpc.com/connect"
	v1 "github.com/BBruington/party-planner/api/gen/planner/v1"
	"github.com/BBruington/party-planner/api/internal/domain/location"
	model "github.com/BBruington/party-planner/api/internal/models"
)

type mockServicer struct {
	loc []*model.Location
	err error
}

func (m *mockServicer) Create(_ context.Context, _ *model.CreateLocationRequest) (*model.Location, error) {
	return m.one(), m.err
}
func (m *mockServicer) GetByID(_ context.Context, _, _ string) (*model.Location, error) {
	return m.one(), m.err
}
func (m *mockServicer) Update(_ context.Context, _ *model.UpdateLocationRequest) (*model.Location, error) {
	return m.one(), m.err
}
func (m *mockServicer) Delete(_ context.Context, _, _ string) (*model.Location, error) {
	return m.one(), m.err
}

func (m *mockServicer) one() *model.Location {
	if len(m.loc) == 0 {
		return nil
	}
	return m.loc[0]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func testLocation() *model.Location {
	return &model.Location{
		ID:       "location-1",
		RegionID: "region-1",
		Name:     "The Tavern",
	}
}

func newServer(svc location.LocationServicer) *location.Server {
	return &location.Server{Location: svc, Log: slog.Default()}
}

func validationServer() *location.Server {
	return &location.Server{Log: slog.Default()}
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

func TestCreateLocation_Validation(t *testing.T) {
	server := validationServer()
	tests := []struct {
		name string
		req  *v1.CreateLocationRequest
	}{
		{"missing region id", &v1.CreateLocationRequest{CampaignId: "campaign-1", Name: "The Tavern"}},
		{"missing campaign id", &v1.CreateLocationRequest{RegionId: "region-1", Name: "The Tavern"}},
		{"missing name", &v1.CreateLocationRequest{RegionId: "region-1", CampaignId: "campaign-1"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.CreateLocation(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

func TestGetLocation_Validation(t *testing.T) {
	server := validationServer()
	tests := []struct {
		name string
		req  *v1.GetLocationRequest
	}{
		{"missing id", &v1.GetLocationRequest{CampaignId: "campaign-1"}},
		{"missing campaign id", &v1.GetLocationRequest{Id: "location-1"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.GetLocation(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

func TestUpdateLocation_Validation(t *testing.T) {
	server := validationServer()
	tests := []struct {
		name string
		req  *v1.UpdateLocationRequest
	}{
		{"missing id", &v1.UpdateLocationRequest{CampaignId: "campaign-1"}},
		{"missing campaign id", &v1.UpdateLocationRequest{Id: "location-1"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.UpdateLocation(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

func TestRemoveLocation_Validation(t *testing.T) {
	server := validationServer()
	tests := []struct {
		name string
		req  *v1.RemoveLocationRequest
	}{
		{"missing id", &v1.RemoveLocationRequest{CampaignId: "campaign-1"}},
		{"missing campaign id", &v1.RemoveLocationRequest{Id: "location-1"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.RemoveLocation(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

// ── Happy path tests ──────────────────────────────────────────────────────────

func TestCreateLocation_HappyPath(t *testing.T) {
	want := testLocation()
	server := newServer(&mockServicer{loc: []*model.Location{want}})

	resp, err := server.CreateLocation(context.Background(), connect.NewRequest(&v1.CreateLocationRequest{
		RegionId:   want.RegionID,
		CampaignId: "campaign-1",
		Name:       want.Name,
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Msg.Location.Id != want.ID {
		t.Errorf("got id %q, want %q", resp.Msg.Location.Id, want.ID)
	}
	if resp.Msg.Location.Name != want.Name {
		t.Errorf("got name %q, want %q", resp.Msg.Location.Name, want.Name)
	}
}

func TestGetLocation_HappyPath(t *testing.T) {
	want := testLocation()
	server := newServer(&mockServicer{loc: []*model.Location{want}})

	resp, err := server.GetLocation(context.Background(), connect.NewRequest(&v1.GetLocationRequest{
		Id:         want.ID,
		CampaignId: "campaign-1",
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Msg.Location.Id != want.ID {
		t.Errorf("got id %q, want %q", resp.Msg.Location.Id, want.ID)
	}
}

func TestUpdateLocation_HappyPath(t *testing.T) {
	want := testLocation()
	server := newServer(&mockServicer{loc: []*model.Location{want}})

	resp, err := server.UpdateLocation(context.Background(), connect.NewRequest(&v1.UpdateLocationRequest{
		Id:         want.ID,
		CampaignId: "campaign-1",
		Name:       &want.Name,
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Msg.Location.Id != want.ID {
		t.Errorf("got id %q, want %q", resp.Msg.Location.Id, want.ID)
	}
}

func TestRemoveLocation_HappyPath(t *testing.T) {
	want := testLocation()
	server := newServer(&mockServicer{loc: []*model.Location{want}})

	_, err := server.RemoveLocation(context.Background(), connect.NewRequest(&v1.RemoveLocationRequest{
		Id:         want.ID,
		CampaignId: "campaign-1",
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}
