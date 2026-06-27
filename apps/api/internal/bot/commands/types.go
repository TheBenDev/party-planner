package commands

import (
	"sync"

	"github.com/BBruington/party-planner/api/internal/api"
	domain_campaignIntegration "github.com/BBruington/party-planner/api/internal/domain/campaign_integration"
	domain_npc "github.com/BBruington/party-planner/api/internal/domain/npc"
	domain_session "github.com/BBruington/party-planner/api/internal/domain/session"
	domain_series "github.com/BBruington/party-planner/api/internal/domain/session_series"
	"github.com/bwmarrin/discordgo"
)

// BotDeps bundles all dependencies available to bot command handlers.
// Commands that can call the Go API directly use NpcSvc, IntegrationSvc, or DB.
// Commands that must go through the web app (user_availabilities, user_integrations) use Client.
type BotDeps struct {
	Client                 *api.Client
	NpcSvc                 *domain_npc.Service
	CampaignIntegrationSvc *domain_campaignIntegration.Service
	SessionSvc             *domain_session.Service
	SeriesSvc              *domain_series.Service
	mu                     sync.RWMutex
	botUserID              string
}

// SetBotUserID stores the bot's user ID. Called once from the Ready handler.
func (d *BotDeps) SetBotUserID(id string) {
	d.mu.Lock()
	defer d.mu.Unlock()
	d.botUserID = id
}

// GetBotUserID returns the bot's user ID.
func (d *BotDeps) GetBotUserID() string {
	d.mu.RLock()
	defer d.mu.RUnlock()
	return d.botUserID
}

type Option struct {
	Name        string
	Description string
	IsRequired  bool
}

type Modal struct {
	ID       string
	OnSubmit func(s *discordgo.Session, i *discordgo.InteractionCreate, deps *BotDeps) error
}

type Subcommand struct {
	Name        string
	Description string
	Action      func(s *discordgo.Session, i *discordgo.InteractionCreate, deps *BotDeps) error
	Options     []Option
	Modal       *Modal
}

type Command struct {
	Name        string
	Description string
	Action      func(s *discordgo.Session, i *discordgo.InteractionCreate, deps *BotDeps) error
	Options     []Option
	Subcommands []Subcommand
	Modal       *Modal
}

// Helper to extract text input value from modal submit data
func getModalTextInput(data discordgo.ModalSubmitInteractionData, customID string) string {
	for _, comp := range data.Components {
		row, ok := comp.(*discordgo.ActionsRow)
		if !ok {
			continue
		}
		for _, c := range row.Components {
			if ti, ok := c.(*discordgo.TextInput); ok && ti.CustomID == customID {
				return ti.Value
			}
		}
	}
	return ""
}

// Helper to reply ephemerally
func replyEphemeral(s *discordgo.Session, i *discordgo.InteractionCreate, content string) error {
	return s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Content: content,
			Flags:   discordgo.MessageFlagsEphemeral,
		},
	})
}

// Helper to reply publicly
func replyPublic(s *discordgo.Session, i *discordgo.InteractionCreate, content string) error {
	return s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Content: content,
		},
	})
}

// Helper to defer reply
func deferReply(s *discordgo.Session, i *discordgo.InteractionCreate, ephemeral bool) error {
	data := &discordgo.InteractionResponseData{}
	if ephemeral {
		data.Flags = discordgo.MessageFlagsEphemeral
	}

	return s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseDeferredChannelMessageWithSource,
		Data: data,
	})
}

// Helper to edit deferred reply
func editReply(s *discordgo.Session, i *discordgo.InteractionCreate, content string) error {
	_, err := s.InteractionResponseEdit(i.Interaction, &discordgo.WebhookEdit{
		Content: &content,
	})
	return err
}

// hasAdminPermission checks if the member has administrator permissions
func hasAdminPermission(i *discordgo.InteractionCreate) bool {
	if i.Member == nil {
		return false
	}
	return i.Member.Permissions&discordgo.PermissionAdministrator != 0
}
