package commands

import (
	"log/slog"

	"github.com/BBruington/party-planner/api/internal/api"
	"github.com/bwmarrin/discordgo"
)

func registerCampaignAction(s *discordgo.Session, i *discordgo.InteractionCreate, client *api.Client) error {
	if !hasAdminPermission(i) {
		return replyEphemeral(s, i, "❌ You need Administrator permissions to use this command.")
	}

	return s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseModal,
		Data: &discordgo.InteractionResponseData{
			CustomID: "campaignRegisterModal",
			Title:    "Register D&D Campaign to server",
			Components: []discordgo.MessageComponent{
				discordgo.ActionsRow{
					Components: []discordgo.MessageComponent{
						&discordgo.TextInput{
							CustomID:    "campaignId",
							Label:       "Campaign Id",
							Style:       discordgo.TextInputShort,
							Placeholder: "The application id of your campaign",
							Required:    true,
							MaxLength:   36,
							MinLength:   36,
						},
					},
				},
			},
		},
	})
}

func registerCampaignModalOnSubmit(s *discordgo.Session, i *discordgo.InteractionCreate, client *api.Client) error {
	slog.Info("Registering dnd campaign to discord server", "operation", "beny-bot.register")

	if i.GuildID == "" {
		return replyEphemeral(s, i, "This command needs to be used inside of a discord server to work.")
	}

	data := i.ModalSubmitData()
	campaignID := getModalTextInput(data, "campaignId")

	body := map[string]any{
		"campaignId": campaignID,
		"channelId":  i.ChannelID,
		"serverId":   i.GuildID,
	}

	err := client.Post("/api/discord/register", body, nil)
	if err != nil {
		slog.Error("Failed to register campaign", "operation", "beny-bot.registerCampaign", "error", err)
		switch api.StatusCode(err) {
		case 404:
			return replyEphemeral(s, i, "I could not find the campaign you were trying to integrate.")
		case 409:
			return replyEphemeral(s, i, "This discord channel is already integrated with a campaign.")
		default:
			return replyEphemeral(s, i, "Failed to register campaign to discord server. Please try again later.")
		}
	}

	return replyPublic(s, i, "Your campaign has been successfully integrated with your discord server.")
}

var RegisterCampaignCommand = Command{
	Name:        "registercampaign",
	Description: "Allows you to register a discord server to a D&D campaign.",
	Action:      registerCampaignAction,
	Modal: &Modal{
		ID:       "campaignRegisterModal",
		OnSubmit: registerCampaignModalOnSubmit,
	},
}
