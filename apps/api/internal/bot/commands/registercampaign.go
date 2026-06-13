package commands

import (
	"encoding/json"
	"errors"
	"log/slog"

	model "github.com/BBruington/party-planner/api/internal/models"
	"github.com/BBruington/party-planner/api/internal/service"
	"github.com/bwmarrin/discordgo"
)

func registerCampaignAction(s *discordgo.Session, i *discordgo.InteractionCreate, deps *BotDeps) error {
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

func registerCampaignModalOnSubmit(s *discordgo.Session, i *discordgo.InteractionCreate, deps *BotDeps) error {
	slog.Info("Registering dnd campaign to discord server", "operation", "beny-bot.register")

	if !hasAdminPermission(i) {
		return replyEphemeral(s, i, "❌ You need Administrator permissions to use this command.")
	}

	if i.GuildID == "" {
		return replyEphemeral(s, i, "This command needs to be used inside of a discord server to work.")
	}

	data := i.ModalSubmitData()
	campaignID := getModalTextInput(data, "campaignId")

	metadata, err := json.Marshal(model.DiscordIntegrationMetadata{
		ServerName: "",
		Source:     model.IntegrationSourceDiscord,
		DefaultChannel: model.DiscordChannel{
			ID:   i.ChannelID,
			Name: "",
		},
	})
	if err != nil {
		slog.Error("Failed to build integration metadata", "operation", "beny-bot.register", "guildID", i.GuildID, "error", err)
		return replyEphemeral(s, i, "Failed to register campaign to discord server. Please try again later.")
	}

	settings, err := json.Marshal(model.DiscordIntegrationSettings{
		EnableSessionReminders:     true,
		SessionCreateAnnouncements: true,
		Source:                     model.IntegrationSourceDiscord,
	})
	if err != nil {
		slog.Error("Failed to build integration settings", "operation", "beny-bot.register", "guildID", i.GuildID, "error", err)
		return replyEphemeral(s, i, "Failed to register campaign to discord server. Please try again later.")
	}

	_, err = deps.IntegrationSvc.Create(&model.CreateCampaignIntegrationRequest{
		CampaignID: campaignID,
		ExternalID: i.GuildID,
		Source:     model.IntegrationSourceDiscord,
		Metadata:   metadata,
		Settings:   settings,
	})
	if err != nil {
		slog.Error("Failed to register campaign", "operation", "beny-bot.registerCampaign", "guildID", i.GuildID, "error", err)
		switch {
		case errors.Is(err, service.ErrCampaignIntegrationInvalidCampaign):
			return replyEphemeral(s, i, "I could not find the campaign you were trying to integrate.")
		case errors.Is(err, service.ErrCampaignIntegrationAlreadyExists):
			return replyEphemeral(s, i, "This discord server is already integrated with a campaign.")
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
