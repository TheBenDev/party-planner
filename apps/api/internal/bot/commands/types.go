package commands

import (
	"github.com/BBruington/party-planner/api/internal/api"
	"github.com/bwmarrin/discordgo"
)

type Option struct {
	Name        string
	Description string
	IsRequired  bool
}

type Modal struct {
	ID       string
	OnSubmit func(s *discordgo.Session, i *discordgo.InteractionCreate, client *api.Client) error
}

type Subcommand struct {
	Name        string
	Description string
	Action      func(s *discordgo.Session, i *discordgo.InteractionCreate, client *api.Client) error
	Options     []Option
	Modal       *Modal
}

type Command struct {
	Name        string
	Description string
	Action      func(s *discordgo.Session, i *discordgo.InteractionCreate, client *api.Client) error
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
func replyEphemeral(s *discordgo.Session, i *discordgo.InteractionCreate, content string) {
	_ = s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Content: content,
			Flags:   discordgo.MessageFlagsEphemeral,
		},
	})
}

// Helper to reply publicly
func replyPublic(s *discordgo.Session, i *discordgo.InteractionCreate, content string) {
	_ = s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Content: content,
		},
	})
}

// Helper to defer reply
func deferReply(s *discordgo.Session, i *discordgo.InteractionCreate) {
	_ = s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseDeferredChannelMessageWithSource,
	})
}

// Helper to edit deferred reply
func editReply(s *discordgo.Session, i *discordgo.InteractionCreate, content string) {
	_, _ = s.InteractionResponseEdit(i.Interaction, &discordgo.WebhookEdit{
		Content: &content,
	})
}

// Helper to check if API error has a specific status code
func isStatusCode(err error, code int) bool {
	return api.StatusCode(err) == code
}

// hasAdminPermission checks if the member has administrator permissions
func hasAdminPermission(i *discordgo.InteractionCreate) bool {
	if i.Member == nil {
		return false
	}
	return i.Member.Permissions&discordgo.PermissionAdministrator != 0
}
