package session_series_test

import (
	"context"
	"log/slog"
	"testing"
	"time"

	"connectrpc.com/connect"
	v1 "github.com/BBruington/party-planner/api/gen/planner/v1"
	session_series "github.com/BBruington/party-planner/api/internal/domain/session_series"
	model "github.com/BBruington/party-planner/api/internal/models"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type mockSeriesServicer struct {
	series *model.SessionSeries
	err    error
}

func (m *mockSeriesServicer) Create(_ context.Context, _ *model.CreateSessionSeriesRequest) (*model.SessionSeries, error) {
	return m.series, m.err
}
func (m *mockSeriesServicer) Get(_, _ string) (*model.SessionSeries, error) { return m.series, m.err }
func (m *mockSeriesServicer) ListByCampaign(_ string) ([]*model.SessionSeriesWithDetails, error) {
	return nil, m.err
}
func (m *mockSeriesServicer) Update(_ *model.UpdateSessionSeriesRequest) (*model.SessionSeries, error) {
	return m.series, m.err
}
func (m *mockSeriesServicer) Remove(_ context.Context, _, _, _ string) error { return m.err }
func (m *mockSeriesServicer) ExcludeFromSeries(_ context.Context, _, _ string, _ time.Time) error {
	return m.err
}
func (m *mockSeriesServicer) RemoveException(_, _ string, _ time.Time) error { return m.err }
func (m *mockSeriesServicer) AddToGoogleCalendar(_ context.Context, _, _, _ string) (*model.SessionSeries, error) {
	return m.series, m.err
}
func (m *mockSeriesServicer) RemoveFromGoogleCalendar(_ context.Context, _, _, _ string) (*model.SessionSeries, error) {
	return m.series, m.err
}
func (m *mockSeriesServicer) CreateDiscordEvent(_ context.Context, _, _ string) (*model.SessionSeries, error) {
	return m.series, m.err
}
func (m *mockSeriesServicer) GetDiscordEvent(_ context.Context, _, _, _ string) (*model.DiscordEventInfo, error) {
	return nil, m.err
}
func (m *mockSeriesServicer) GetPoll(_ context.Context, _, _ string) (*model.Poll, error) {
	return nil, m.err
}
func (m *mockSeriesServicer) CreateDiscordPoll(_ context.Context, _, _ string, _ []time.Time) error {
	return m.err
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func testSeries() *model.SessionSeries {
	return &model.SessionSeries{
		ID:         "series-1",
		CampaignID: "campaign-1",
		Title:      "Campaign Sessions",
	}
}

func newServer(svc session_series.SessionSeriesServicer) *session_series.Server {
	return &session_series.Server{SessionSeries: svc, Log: slog.Default()}
}

func validationServer() *session_series.Server {
	return &session_series.Server{Log: slog.Default()}
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

func TestCreateSessionSeries_Validation(t *testing.T) {
	server := validationServer()
	validStart := timestamppb.Now()
	tests := []struct {
		name string
		req  *v1.CreateSessionSeriesRequest
	}{
		{"missing campaign id", &v1.CreateSessionSeriesRequest{
			Title: "Sessions", StartTime: "19:00", SeriesStartDate: validStart, Timezone: "America/New_York",
		}},
		{"missing title", &v1.CreateSessionSeriesRequest{
			CampaignId: "campaign-1", StartTime: "19:00", SeriesStartDate: validStart, Timezone: "America/New_York",
		}},
		{"missing start time", &v1.CreateSessionSeriesRequest{
			CampaignId: "campaign-1", Title: "Sessions", SeriesStartDate: validStart, Timezone: "America/New_York",
		}},
		{"missing series start date", &v1.CreateSessionSeriesRequest{
			CampaignId: "campaign-1", Title: "Sessions", StartTime: "19:00", Timezone: "America/New_York",
		}},
		{"missing timezone", &v1.CreateSessionSeriesRequest{
			CampaignId: "campaign-1", Title: "Sessions", StartTime: "19:00", SeriesStartDate: validStart,
		}},
		{"invalid timezone", &v1.CreateSessionSeriesRequest{
			CampaignId: "campaign-1", Title: "Sessions", StartTime: "19:00", SeriesStartDate: validStart, Timezone: "Not/ARealZone",
		}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.CreateSessionSeries(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

func TestGetSessionSeries_Validation(t *testing.T) {
	server := validationServer()
	tests := []struct {
		name string
		req  *v1.GetSessionSeriesRequest
	}{
		{"missing id", &v1.GetSessionSeriesRequest{CampaignId: "campaign-1"}},
		{"missing campaign id", &v1.GetSessionSeriesRequest{Id: "series-1"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.GetSessionSeries(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

func TestListSessionSeriesByCampaign_Validation(t *testing.T) {
	server := validationServer()
	_, err := server.ListSessionSeriesByCampaign(context.Background(), connect.NewRequest(&v1.ListSessionSeriesByCampaignRequest{}))
	assertCode(t, err, connect.CodeInvalidArgument)
}

func TestUpdateSessionSeries_Validation(t *testing.T) {
	server := validationServer()
	tests := []struct {
		name string
		req  *v1.UpdateSessionSeriesRequest
	}{
		{"missing id", &v1.UpdateSessionSeriesRequest{CampaignId: "campaign-1"}},
		{"missing campaign id", &v1.UpdateSessionSeriesRequest{Id: "series-1"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.UpdateSessionSeries(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

func TestRemoveSessionSeries_Validation(t *testing.T) {
	server := validationServer()
	tests := []struct {
		name string
		req  *v1.RemoveSessionSeriesRequest
	}{
		{"missing id", &v1.RemoveSessionSeriesRequest{CampaignId: "campaign-1"}},
		{"missing campaign id", &v1.RemoveSessionSeriesRequest{Id: "series-1"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.RemoveSessionSeries(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

func TestExcludeSessionFromSeries_Validation(t *testing.T) {
	server := validationServer()
	validDate := timestamppb.Now()
	tests := []struct {
		name string
		req  *v1.ExcludeSessionFromSeriesRequest
	}{
		{"missing series id", &v1.ExcludeSessionFromSeriesRequest{CampaignId: "campaign-1", ExcludedDate: validDate}},
		{"missing campaign id", &v1.ExcludeSessionFromSeriesRequest{SeriesId: "series-1", ExcludedDate: validDate}},
		{"missing excluded date", &v1.ExcludeSessionFromSeriesRequest{SeriesId: "series-1", CampaignId: "campaign-1"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.ExcludeSessionFromSeries(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

func TestRemoveSeriesException_Validation(t *testing.T) {
	server := validationServer()
	validDate := timestamppb.Now()
	tests := []struct {
		name string
		req  *v1.RemoveSeriesExceptionRequest
	}{
		{"missing series id", &v1.RemoveSeriesExceptionRequest{CampaignId: "campaign-1", ExcludedDate: validDate}},
		{"missing campaign id", &v1.RemoveSeriesExceptionRequest{SeriesId: "series-1", ExcludedDate: validDate}},
		{"missing excluded date", &v1.RemoveSeriesExceptionRequest{SeriesId: "series-1", CampaignId: "campaign-1"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.RemoveSeriesException(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

func TestAddToGoogleCalendar_Validation(t *testing.T) {
	server := validationServer()
	tests := []struct {
		name string
		req  *v1.AddToGoogleCalendarRequest
	}{
		{"missing series id", &v1.AddToGoogleCalendarRequest{CampaignId: "campaign-1", UserId: "user-1"}},
		{"missing campaign id", &v1.AddToGoogleCalendarRequest{SeriesId: "series-1", UserId: "user-1"}},
		{"missing user id", &v1.AddToGoogleCalendarRequest{SeriesId: "series-1", CampaignId: "campaign-1"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.AddToGoogleCalendar(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

func TestRemoveFromGoogleCalendar_Validation(t *testing.T) {
	server := validationServer()
	tests := []struct {
		name string
		req  *v1.RemoveFromGoogleCalendarRequest
	}{
		{"missing series id", &v1.RemoveFromGoogleCalendarRequest{CampaignId: "campaign-1", UserId: "user-1"}},
		{"missing campaign id", &v1.RemoveFromGoogleCalendarRequest{SeriesId: "series-1", UserId: "user-1"}},
		{"missing user id", &v1.RemoveFromGoogleCalendarRequest{SeriesId: "series-1", CampaignId: "campaign-1"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.RemoveFromGoogleCalendar(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

func TestCreateDiscordEvent_Validation(t *testing.T) {
	server := validationServer()
	tests := []struct {
		name string
		req  *v1.CreateDiscordEventRequest
	}{
		{"missing series id", &v1.CreateDiscordEventRequest{CampaignId: "campaign-1"}},
		{"missing campaign id", &v1.CreateDiscordEventRequest{SeriesId: "series-1"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.CreateDiscordEvent(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

func TestGetDiscordEvent_Validation(t *testing.T) {
	server := validationServer()
	tests := []struct {
		name string
		req  *v1.GetDiscordEventRequest
	}{
		{"missing campaign id", &v1.GetDiscordEventRequest{SeriesId: "series-1", DiscordEventId: "event-1"}},
		{"missing series id", &v1.GetDiscordEventRequest{CampaignId: "campaign-1", DiscordEventId: "event-1"}},
		{"missing discord event id", &v1.GetDiscordEventRequest{CampaignId: "campaign-1", SeriesId: "series-1"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.GetDiscordEvent(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

func TestGetSeriesPoll_Validation(t *testing.T) {
	server := validationServer()
	tests := []struct {
		name string
		req  *v1.GetSeriesPollRequest
	}{
		{"missing series id", &v1.GetSeriesPollRequest{CampaignId: "campaign-1"}},
		{"missing campaign id", &v1.GetSeriesPollRequest{SeriesId: "series-1"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.GetSeriesPoll(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

func TestPollSeries_Validation(t *testing.T) {
	server := validationServer()
	tests := []struct {
		name string
		req  *v1.PollSeriesRequest
	}{
		{"missing series id", &v1.PollSeriesRequest{
			CampaignId: "campaign-1", Options: []*timestamppb.Timestamp{timestamppb.Now()},
		}},
		{"missing campaign id", &v1.PollSeriesRequest{
			SeriesId: "series-1", Options: []*timestamppb.Timestamp{timestamppb.Now()},
		}},
		{"missing options", &v1.PollSeriesRequest{SeriesId: "series-1", CampaignId: "campaign-1"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.PollSeries(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

// ── Happy path tests ──────────────────────────────────────────────────────────

func TestCreateSessionSeries_HappyPath(t *testing.T) {
	want := testSeries()
	server := newServer(&mockSeriesServicer{series: want})

	resp, err := server.CreateSessionSeries(context.Background(), connect.NewRequest(&v1.CreateSessionSeriesRequest{
		CampaignId:      want.CampaignID,
		Title:           want.Title,
		StartTime:       "19:00",
		SeriesStartDate: timestamppb.Now(),
		Timezone:        "America/New_York",
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Msg.Series.Id != want.ID {
		t.Errorf("got id %q, want %q", resp.Msg.Series.Id, want.ID)
	}
}

func TestGetSessionSeries_HappyPath(t *testing.T) {
	want := testSeries()
	server := newServer(&mockSeriesServicer{series: want})

	resp, err := server.GetSessionSeries(context.Background(), connect.NewRequest(&v1.GetSessionSeriesRequest{
		Id:         want.ID,
		CampaignId: want.CampaignID,
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Msg.Series.Id != want.ID {
		t.Errorf("got id %q, want %q", resp.Msg.Series.Id, want.ID)
	}
}
