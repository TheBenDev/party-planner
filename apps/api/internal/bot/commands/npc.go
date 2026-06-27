package commands

import (
	"context"
	"database/sql"
	"errors"
	"log/slog"

	model "github.com/BBruington/party-planner/api/internal/models"
	"github.com/bwmarrin/discordgo"
)

func npcSetAction(s *discordgo.Session, i *discordgo.InteractionCreate, deps *BotDeps) error {
	if !hasAdminPermission(i) {
		return replyEphemeral(s, i, "❌ You need Administrator permissions to use this command.")
	}

	return s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseModal,
		Data: &discordgo.InteractionResponseData{
			CustomID: "npc:set",
			Title:    "Update the bio of the npc",
			Components: []discordgo.MessageComponent{
				discordgo.ActionsRow{
					Components: []discordgo.MessageComponent{
						&discordgo.TextInput{
							CustomID:    "npcName",
							Label:       "Name of the npc",
							Style:       discordgo.TextInputShort,
							Placeholder: "The name of the npc",
							Required:    true,
						},
					},
				},
				discordgo.ActionsRow{
					Components: []discordgo.MessageComponent{
						&discordgo.TextInput{
							CustomID:    "npcBio",
							Label:       "Updated bio of the npc",
							Style:       discordgo.TextInputParagraph,
							Placeholder: "Update the bio of the npc",
							Required:    true,
						},
					},
				},
			},
		},
	})
}

func npcSetModalOnSubmit(s *discordgo.Session, i *discordgo.InteractionCreate, deps *BotDeps) error {
	slog.Info("Updating an npc's bio", "operation", "beny-bot.npc-set")

	if !hasAdminPermission(i) {
		return replyEphemeral(s, i, "❌ You need Administrator permissions to use this command.")
	}

	if i.GuildID == "" {
		return replyEphemeral(s, i, "This command needs to be used inside of a discord server to work.")
	}

	data := i.ModalSubmitData()
	name := getModalTextInput(data, "npcName")
	bio := getModalTextInput(data, "npcBio")

	if name == "" || bio == "" {
		return replyEphemeral(s, i, "Input required to update bio.")
	}

	integration, err := deps.CampaignIntegrationSvc.DB.GetCampaignIntegrationByExternalID(context.Background(), i.GuildID, model.IntegrationSourceDiscord)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return replyEphemeral(s, i, "This Discord server is not linked to a campaign.")
		}
		slog.Error("Failed to find campaign integration", "operation", "beny-bot.npc-set", "guildID", i.GuildID, "error", err)
		return replyEphemeral(s, i, "Something went wrong. Please try again later.")
	}

	npc, err := deps.NpcSvc.DB.GetNpcByNameAndCampaign(context.Background(), name, integration.CampaignID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return replyEphemeral(s, i, "I could not find that npc.")
		}
		slog.Error("Failed to find npc", "operation", "beny-bot.npc-set", "guildID", i.GuildID, "error", err)
		return replyEphemeral(s, i, "Something went wrong. Please try again later.")
	}

	_, err = deps.NpcSvc.Update(context.Background(), &model.UpdateNpcRequest{
		ID:          npc.ID,
		Personality: sql.NullString{String: bio, Valid: true},
	})
	if err != nil {
		slog.Error("Failed to update npc bio", "operation", "beny-bot.npc-set", "guildID", i.GuildID, "error", err)
		return replyEphemeral(s, i, "Something went wrong. Please try again later.")
	}

	return replyEphemeral(s, i, "Npc bio updated successfully.")
}

func npcViewAction(s *discordgo.Session, i *discordgo.InteractionCreate, deps *BotDeps) error {
	slog.Info("Fetching npc", "operation", "beny-bot.npc-view")

	if i.GuildID == "" {
		return replyEphemeral(s, i, "This command needs to be used inside of a discord server to work.")
	}

	data := i.ApplicationCommandData()
	var npcName string
	for _, opt := range data.Options[0].Options {
		if opt.Name == "name" {
			npcName = opt.StringValue()
		}
	}

	integration, err := deps.CampaignIntegrationSvc.DB.GetCampaignIntegrationByExternalID(context.Background(), i.GuildID, model.IntegrationSourceDiscord)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return replyEphemeral(s, i, "This Discord server is not linked to a campaign.")
		}
		slog.Error("Failed to find campaign integration", "operation", "beny-bot.npc-view", "guildID", i.GuildID, "error", err)
		return replyEphemeral(s, i, "Something went wrong. Please try again later.")
	}

	slog.Info("Searching for npc", "operation", "beny-bot.npc-view", "name", npcName, "campaignID", integration.CampaignID)
	npc, err := deps.NpcSvc.DB.GetNpcByNameAndCampaign(context.Background(), npcName, integration.CampaignID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return replyEphemeral(s, i, "I could not find that npc.")
		}
		slog.Error("Failed to fetch npc", "operation", "beny-bot.npc-view", "guildID", i.GuildID, "error", err)
		return replyEphemeral(s, i, "Something went wrong. Please try again later.")
	}

	embed := &discordgo.MessageEmbed{
		Title:       npc.Name,
		Description: "Character: " + npc.Name,
		Color:       0x0099ff,
	}
	if npc.Avatar.Valid && npc.Avatar.String != "" {
		embed.Thumbnail = &discordgo.MessageEmbedThumbnail{URL: npc.Avatar.String}
	}

	return s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Flags:  discordgo.MessageFlagsEphemeral,
			Embeds: []*discordgo.MessageEmbed{embed},
		},
	})
}

var NpcCommand = Command{
	Name:        "npc",
	Description: "Manage your D&D npcs",
	Subcommands: []Subcommand{
		{
			Name:        "set",
			Description: "Update the bio of the npc",
			Action:      npcSetAction,
			Modal: &Modal{
				ID:       "npc:set",
				OnSubmit: npcSetModalOnSubmit,
			},
		},
		{
			Name:        "view",
			Description: "View a specific npc in your game",
			Action:      npcViewAction,
			Options: []Option{
				{Name: "name", Description: "The name of the npc you'd like to see", IsRequired: true},
			},
		},
	},
}
