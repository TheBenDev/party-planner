package user_integration_test

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"testing"
	"time"

	googlecalendar "github.com/BBruington/party-planner/api/internal/adapter/google_calendar"
	user_integration "github.com/BBruington/party-planner/api/internal/domain/user_integration"
	"github.com/BBruington/party-planner/api/internal/lib"
	model "github.com/BBruington/party-planner/api/internal/models"
	"golang.org/x/oauth2"
)

// testEncryptionKey is a 32-byte AES-256 key used only in tests.
var testEncryptionKey = bytes.Repeat([]byte("k"), 32)

// ── Store mock ────────────────────────────────────────────────────────────────

type mockServiceStore struct {
	integration *model.UserIntegration
	members     []*model.CampaignMemberIntegration

	getUserIntegrationErr error
	upsertIntegrationErr  error
	deleteIntegrationErr  error
	listMembersErr        error
}

func (m *mockServiceStore) GetUserIntegration(_ string, _ model.IntegrationSource) (*model.UserIntegration, error) {
	return m.integration, m.getUserIntegrationErr
}
func (m *mockServiceStore) UpsertUserIntegration(_ *model.UpsertUserIntegrationRequest) (*model.UserIntegration, error) {
	return m.integration, m.upsertIntegrationErr
}
func (m *mockServiceStore) DeleteUserIntegration(_ string, _ model.IntegrationSource) error {
	return m.deleteIntegrationErr
}
func (m *mockServiceStore) ListUserIntegrationsByCampaign(_ string, _ model.IntegrationSource) ([]*model.CampaignMemberIntegration, error) {
	return m.members, m.listMembersErr
}
func (m *mockServiceStore) GetCampaignIntegration(_ string, _ model.IntegrationSource) (*model.CampaignIntegration, error) {
	return nil, nil
}

// ── Google Calendar mock ──────────────────────────────────────────────────────

type mockGoogleCalendar struct {
	token      *oauth2.Token
	wasRefresh bool
	eventID    string
	busy       []struct{ Start, End time.Time }

	exchangeCodeErr        error
	refreshTokenErr        error
	syncSessionErr         error
	removeCalendarEventErr error
	queryFreebusyErr       error
}

func (m *mockGoogleCalendar) ExchangeCode(_ context.Context, _ string) (*oauth2.Token, error) {
	return m.token, m.exchangeCodeErr
}
func (m *mockGoogleCalendar) RefreshTokenIfNeeded(_ context.Context, _ model.GoogleCalendarTokenMetadata) (*oauth2.Token, bool, error) {
	return m.token, m.wasRefresh, m.refreshTokenErr
}
func (m *mockGoogleCalendar) NewHTTPClient(_ context.Context, _ *oauth2.Token) *http.Client {
	return &http.Client{}
}
func (m *mockGoogleCalendar) SyncSession(_ context.Context, _ *http.Client, _ model.SessionSeries, _ []time.Time) (string, error) {
	return m.eventID, m.syncSessionErr
}
func (m *mockGoogleCalendar) RemoveCalendarEvent(_ context.Context, _ *http.Client, _ string) error {
	return m.removeCalendarEventErr
}
func (m *mockGoogleCalendar) QueryFreebusy(_ context.Context, _ *http.Client, _, _ time.Time) ([]struct{ Start, End time.Time }, error) {
	return m.busy, m.queryFreebusyErr
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func newSvc(store user_integration.Store, google user_integration.GoogleCalendarAdapter) *user_integration.Service {
	return &user_integration.Service{
		DB:            store,
		Google:        google,
		EncryptionKey: testEncryptionKey,
		Log:           slog.Default(),
	}
}

func testToken() *oauth2.Token {
	return &oauth2.Token{
		AccessToken:  "access-token",
		RefreshToken: "refresh-token",
		Expiry:       time.Now().Add(time.Hour),
	}
}

func testIntegration() *model.UserIntegration {
	return &model.UserIntegration{
		ID:     "integration-1",
		UserID: "user-1",
		Source: model.IntegrationSourceGoogleCalendar,
		Metadata: encryptTestMeta(model.GoogleCalendarTokenMetadata{
			AccessToken:  "access-token",
			RefreshToken: "refresh-token",
			TokenExpiry:  time.Now().Add(time.Hour).UnixMilli(),
		}),
	}
}

func testMember() *model.CampaignMemberIntegration {
	return &model.CampaignMemberIntegration{
		UserID: "user-1",
		Metadata: encryptTestMeta(model.GoogleCalendarTokenMetadata{
			AccessToken:  "access-token",
			RefreshToken: "refresh-token",
			TokenExpiry:  time.Now().Add(time.Hour).UnixMilli(),
		}),
	}
}

func encryptTestMeta(meta model.GoogleCalendarTokenMetadata) json.RawMessage {
	metaJSON, err := json.Marshal(meta)
	if err != nil {
		panic(err)
	}
	encrypted, err := lib.Encrypt(testEncryptionKey, metaJSON)
	if err != nil {
		panic(err)
	}
	return json.RawMessage(encrypted)
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

// ── GetStatus ─────────────────────────────────────────────────────────────────

func TestGetStatus_Connected(t *testing.T) {
	store := &mockServiceStore{integration: testIntegration()}
	connected, err := newSvc(store, nil).GetStatus(context.Background(), "user-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !connected {
		t.Error("got false, want true")
	}
}

func TestGetStatus_NotConnected(t *testing.T) {
	store := &mockServiceStore{getUserIntegrationErr: sql.ErrNoRows}
	connected, err := newSvc(store, nil).GetStatus(context.Background(), "user-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if connected {
		t.Error("got true, want false")
	}
}

func TestGetStatus_DBError(t *testing.T) {
	store := &mockServiceStore{getUserIntegrationErr: errors.New("db error")}
	_, err := newSvc(store, nil).GetStatus(context.Background(), "user-1")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

// ── Disconnect ────────────────────────────────────────────────────────────────

func TestDisconnect_HappyPath(t *testing.T) {
	err := newSvc(&mockServiceStore{}, nil).Disconnect(context.Background(), "user-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestDisconnect_Error(t *testing.T) {
	store := &mockServiceStore{deleteIntegrationErr: errors.New("db error")}
	err := newSvc(store, nil).Disconnect(context.Background(), "user-1")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

// ── Connect ───────────────────────────────────────────────────────────────────

func TestConnect_HappyPath(t *testing.T) {
	store := &mockServiceStore{integration: testIntegration()}
	google := &mockGoogleCalendar{token: testToken()}
	err := newSvc(store, google).Connect(context.Background(), "user-1", "auth-code")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestConnect_ExchangeCodeError(t *testing.T) {
	google := &mockGoogleCalendar{exchangeCodeErr: errors.New("oauth error")}
	err := newSvc(&mockServiceStore{}, google).Connect(context.Background(), "user-1", "auth-code")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

func TestConnect_UpsertError(t *testing.T) {
	store := &mockServiceStore{upsertIntegrationErr: errors.New("db error")}
	google := &mockGoogleCalendar{token: testToken()}
	err := newSvc(store, google).Connect(context.Background(), "user-1", "auth-code")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

// ── CheckConflicts ────────────────────────────────────────────────────────────

func TestCheckConflicts_NoMembers(t *testing.T) {
	store := &mockServiceStore{members: []*model.CampaignMemberIntegration{}}
	conflicts, err := newSvc(store, nil).CheckConflicts(context.Background(), "campaign-1", time.Now(), 60)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(conflicts) != 0 {
		t.Errorf("got %d conflicts, want 0", len(conflicts))
	}
}

func TestCheckConflicts_DecryptError(t *testing.T) {
	badMember := &model.CampaignMemberIntegration{
		UserID:   "user-1",
		Metadata: json.RawMessage("not-encrypted"),
	}
	store := &mockServiceStore{members: []*model.CampaignMemberIntegration{badMember}}
	conflicts, err := newSvc(store, &mockGoogleCalendar{}).CheckConflicts(context.Background(), "campaign-1", time.Now(), 60)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(conflicts) != 0 {
		t.Errorf("got %d conflicts, want 0 (member with bad metadata should be skipped)", len(conflicts))
	}
}

func TestCheckConflicts_RefreshTokenError(t *testing.T) {
	store := &mockServiceStore{members: []*model.CampaignMemberIntegration{testMember()}}
	google := &mockGoogleCalendar{refreshTokenErr: errors.New("refresh failed")}
	conflicts, err := newSvc(store, google).CheckConflicts(context.Background(), "campaign-1", time.Now(), 60)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(conflicts) != 0 {
		t.Errorf("got %d conflicts, want 0 (member with failed refresh should be skipped)", len(conflicts))
	}
}

func TestCheckConflicts_QueryFreebusyError(t *testing.T) {
	store := &mockServiceStore{members: []*model.CampaignMemberIntegration{testMember()}}
	google := &mockGoogleCalendar{
		token:            testToken(),
		queryFreebusyErr: errors.New("freebusy failed"),
	}
	conflicts, err := newSvc(store, google).CheckConflicts(context.Background(), "campaign-1", time.Now(), 60)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(conflicts) != 0 {
		t.Errorf("got %d conflicts, want 0 (member with failed freebusy should be skipped)", len(conflicts))
	}
}

func TestCheckConflicts_MemberBusy(t *testing.T) {
	now := time.Now().UTC()
	store := &mockServiceStore{members: []*model.CampaignMemberIntegration{testMember()}}
	google := &mockGoogleCalendar{
		token: testToken(),
		busy:  []struct{ Start, End time.Time }{{Start: now, End: now.Add(time.Hour)}},
	}
	conflicts, err := newSvc(store, google).CheckConflicts(context.Background(), "campaign-1", now, 60)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(conflicts) != 1 {
		t.Fatalf("got %d conflicts, want 1", len(conflicts))
	}
	if conflicts[0].UserID != "user-1" {
		t.Errorf("got userID %q, want %q", conflicts[0].UserID, "user-1")
	}
	if len(conflicts[0].BusySlots) != 1 {
		t.Errorf("got %d busy slots, want 1", len(conflicts[0].BusySlots))
	}
}

func TestCheckConflicts_MemberFree(t *testing.T) {
	store := &mockServiceStore{members: []*model.CampaignMemberIntegration{testMember()}}
	google := &mockGoogleCalendar{
		token: testToken(),
		busy:  []struct{ Start, End time.Time }{},
	}
	conflicts, err := newSvc(store, google).CheckConflicts(context.Background(), "campaign-1", time.Now(), 60)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(conflicts) != 0 {
		t.Errorf("got %d conflicts, want 0", len(conflicts))
	}
}

// ── SyncSession ───────────────────────────────────────────────────────────────

func TestSyncSession_NotConnected(t *testing.T) {
	store := &mockServiceStore{getUserIntegrationErr: sql.ErrNoRows}
	_, err := newSvc(store, nil).SyncSession(context.Background(), "user-1", model.SessionSeries{}, nil)
	assertError(t, err, user_integration.ErrUserIntegrationNotFound)
}

func TestSyncSession_HappyPath(t *testing.T) {
	store := &mockServiceStore{integration: testIntegration()}
	google := &mockGoogleCalendar{token: testToken(), eventID: "event-1"}
	eventID, err := newSvc(store, google).SyncSession(context.Background(), "user-1", model.SessionSeries{}, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if eventID != "event-1" {
		t.Errorf("got eventID %q, want %q", eventID, "event-1")
	}
}

func TestSyncSession_InsufficientScope(t *testing.T) {
	store := &mockServiceStore{integration: testIntegration()}
	google := &mockGoogleCalendar{token: testToken(), syncSessionErr: googlecalendar.ErrInsufficientCalendarScope}
	_, err := newSvc(store, google).SyncSession(context.Background(), "user-1", model.SessionSeries{}, nil)
	assertError(t, err, user_integration.ErrInsufficientCalendarScope)
}

func TestSyncSession_MissingStartTime(t *testing.T) {
	store := &mockServiceStore{integration: testIntegration()}
	google := &mockGoogleCalendar{token: testToken(), syncSessionErr: googlecalendar.ErrSeriesMissingStartTime}
	_, err := newSvc(store, google).SyncSession(context.Background(), "user-1", model.SessionSeries{}, nil)
	assertError(t, err, user_integration.ErrSeriesMissingStartTime)
}

// ── RemoveCalendarEvent ───────────────────────────────────────────────────────

func TestRemoveCalendarEvent_NotConnected(t *testing.T) {
	store := &mockServiceStore{getUserIntegrationErr: sql.ErrNoRows}
	err := newSvc(store, nil).RemoveCalendarEvent(context.Background(), "user-1", "event-1")
	assertError(t, err, user_integration.ErrUserIntegrationNotFound)
}

func TestRemoveCalendarEvent_HappyPath(t *testing.T) {
	store := &mockServiceStore{integration: testIntegration()}
	google := &mockGoogleCalendar{token: testToken()}
	err := newSvc(store, google).RemoveCalendarEvent(context.Background(), "user-1", "event-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestRemoveCalendarEvent_InsufficientScope(t *testing.T) {
	store := &mockServiceStore{integration: testIntegration()}
	google := &mockGoogleCalendar{token: testToken(), removeCalendarEventErr: googlecalendar.ErrInsufficientCalendarScope}
	err := newSvc(store, google).RemoveCalendarEvent(context.Background(), "user-1", "event-1")
	assertError(t, err, user_integration.ErrInsufficientCalendarScope)
}
