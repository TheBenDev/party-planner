package quest_test

import (
	"context"
	"log/slog"
	"testing"

	"connectrpc.com/connect"
	v1 "github.com/BBruington/party-planner/api/gen/planner/v1"
	"github.com/BBruington/party-planner/api/internal/domain/quest"
	model "github.com/BBruington/party-planner/api/internal/models"
)

type mockStore struct {
	quests []*model.Quest
	err    error
}

func (m *mockStore) CreateQuest(_ context.Context, _ *model.CreateQuestRequest) (*model.Quest, error) {
	return m.one(), m.err
}
func (m *mockStore) GetQuest(_ context.Context, _, _ string) (*model.Quest, error) {
	return m.one(), m.err
}
func (m *mockStore) ListQuestsByCampaign(_ context.Context, _ string) ([]*model.Quest, error) {
	return m.quests, m.err
}
func (m *mockStore) UpdateQuest(_ context.Context, _ *model.UpdateQuestRequest) (*model.Quest, error) {
	return m.one(), m.err
}
func (m *mockStore) CompleteQuest(_ context.Context, _, _ string) (*model.Quest, error) {
	return m.one(), m.err
}
func (m *mockStore) RemoveQuest(_ context.Context, _, _ string) error { return m.err }

func (m *mockStore) one() *model.Quest {
	if len(m.quests) == 0 {
		return nil
	}
	return m.quests[0]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func testQuest() *model.Quest {
	return &model.Quest{
		ID:         "quest-1",
		CampaignID: "campaign-1",
		Title:      "The Lost Artifact",
		Status:     model.QuestStatusActive,
	}
}

func newServer(store quest.Store) *quest.Server {
	return &quest.Server{
		Quest: &quest.Service{DB: store, Log: slog.Default()},
		Log:   slog.Default(),
	}
}

func validationServer() *quest.Server {
	return &quest.Server{Log: slog.Default()}
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

func TestCreateQuest_Validation(t *testing.T) {
	server := validationServer()
	tests := []struct {
		name string
		req  *v1.CreateQuestRequest
	}{
		{"missing campaign id", &v1.CreateQuestRequest{
			Title:  "Quest",
			Status: v1.QuestStatus_QUEST_STATUS_ACTIVE,
		}},
		{"missing title", &v1.CreateQuestRequest{
			CampaignId: "campaign-1",
			Status:     v1.QuestStatus_QUEST_STATUS_ACTIVE,
		}},
		{"missing status", &v1.CreateQuestRequest{
			CampaignId: "campaign-1",
			Title:      "Quest",
		}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.CreateQuest(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

func TestGetQuest_Validation(t *testing.T) {
	server := validationServer()
	tests := []struct {
		name string
		req  *v1.GetQuestRequest
	}{
		{"missing id", &v1.GetQuestRequest{CampaignId: "campaign-1"}},
		{"missing campaign id", &v1.GetQuestRequest{Id: "quest-1"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.GetQuest(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

func TestUpdateQuest_Validation(t *testing.T) {
	server := validationServer()
	tests := []struct {
		name string
		req  *v1.UpdateQuestRequest
	}{
		{"missing id", &v1.UpdateQuestRequest{CampaignId: "campaign-1"}},
		{"missing campaign id", &v1.UpdateQuestRequest{Id: "quest-1"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.UpdateQuest(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

func TestCompleteQuest_Validation(t *testing.T) {
	server := validationServer()
	tests := []struct {
		name string
		req  *v1.CompleteQuestRequest
	}{
		{"missing id", &v1.CompleteQuestRequest{CampaignId: "campaign-1"}},
		{"missing campaign id", &v1.CompleteQuestRequest{Id: "quest-1"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.CompleteQuest(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

func TestRemoveQuest_Validation(t *testing.T) {
	server := validationServer()
	tests := []struct {
		name string
		req  *v1.RemoveQuestRequest
	}{
		{"missing id", &v1.RemoveQuestRequest{CampaignId: "campaign-1"}},
		{"missing campaign id", &v1.RemoveQuestRequest{Id: "quest-1"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := server.RemoveQuest(context.Background(), connect.NewRequest(tt.req))
			assertCode(t, err, connect.CodeInvalidArgument)
		})
	}
}

// ── Happy path tests ──────────────────────────────────────────────────────────

func TestCreateQuest_HappyPath(t *testing.T) {
	want := testQuest()
	server := newServer(&mockStore{quests: []*model.Quest{want}})

	resp, err := server.CreateQuest(context.Background(), connect.NewRequest(&v1.CreateQuestRequest{
		CampaignId: want.CampaignID,
		Title:      want.Title,
		Status:     v1.QuestStatus_QUEST_STATUS_ACTIVE,
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Msg.Quest.Id != want.ID {
		t.Errorf("got id %q, want %q", resp.Msg.Quest.Id, want.ID)
	}
	if resp.Msg.Quest.Title != want.Title {
		t.Errorf("got title %q, want %q", resp.Msg.Quest.Title, want.Title)
	}
}

func TestCreateQuest_WithReward(t *testing.T) {
	gold := int32(100)
	want := testQuest()
	want.Reward = &model.QuestReward{
		Colony: &model.QuestRewardColony{Gold: &gold},
		Loot: []model.QuestRewardLootItem{
			{Name: "Healing Potion", Quantity: ptr(int32(2))},
		},
	}
	server := newServer(&mockStore{quests: []*model.Quest{want}})

	resp, err := server.CreateQuest(context.Background(), connect.NewRequest(&v1.CreateQuestRequest{
		CampaignId: want.CampaignID,
		Title:      want.Title,
		Status:     v1.QuestStatus_QUEST_STATUS_ACTIVE,
		Reward: &v1.QuestReward{
			Colony: &v1.QuestRewardColony{Gold: &gold},
			Loot:   []*v1.QuestRewardLootItem{{Name: "Healing Potion", Quantity: ptr(int32(2))}},
		},
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Msg.Quest.Reward == nil {
		t.Fatal("expected reward, got nil")
	}
	if resp.Msg.Quest.Reward.Colony == nil || resp.Msg.Quest.Reward.Colony.Gold == nil {
		t.Fatal("expected colony reward with gold")
	}
	if *resp.Msg.Quest.Reward.Colony.Gold != gold {
		t.Errorf("got gold %d, want %d", *resp.Msg.Quest.Reward.Colony.Gold, gold)
	}
	if len(resp.Msg.Quest.Reward.Loot) != 1 || resp.Msg.Quest.Reward.Loot[0].Name != "Healing Potion" {
		t.Errorf("unexpected loot: %v", resp.Msg.Quest.Reward.Loot)
	}
}

func TestGetQuest_HappyPath(t *testing.T) {
	want := testQuest()
	server := newServer(&mockStore{quests: []*model.Quest{want}})

	resp, err := server.GetQuest(context.Background(), connect.NewRequest(&v1.GetQuestRequest{
		Id:         want.ID,
		CampaignId: want.CampaignID,
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Msg.Quest.Id != want.ID {
		t.Errorf("got id %q, want %q", resp.Msg.Quest.Id, want.ID)
	}
}

func TestCompleteQuest_HappyPath(t *testing.T) {
	want := testQuest()
	want.Status = model.QuestStatusCompleted
	server := newServer(&mockStore{quests: []*model.Quest{want}})

	resp, err := server.CompleteQuest(context.Background(), connect.NewRequest(&v1.CompleteQuestRequest{
		Id:         want.ID,
		CampaignId: want.CampaignID,
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Msg.Quest.Status != v1.QuestStatus_QUEST_STATUS_COMPLETED {
		t.Errorf("got status %v, want COMPLETED", resp.Msg.Quest.Status)
	}
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func ptr[T any](v T) *T { return &v }
