package commands

import (
	"log/slog"

	"github.com/BBruington/party-planner/api/internal/api"
	"github.com/bwmarrin/discordgo"
)

type npcResponse struct {
	NPC struct {
		ID              string   `json:"id"`
		Name            string   `json:"name"`
		Age             string   `json:"age"`
		Aliases         []string `json:"aliases"`
		Appearance      string   `json:"appearance"`
		Avatar          string   `json:"avatar"`
		IsKnownToParty  bool     `json:"isKnownToParty"`
		KnownName       string   `json:"knownName"`
		Personality     string   `json:"personality"`
		PlayerNotes     string   `json:"playerNotes"`
		Race            string   `json:"race"`
		RelationToParty string   `json:"relationToParty"`
		Status          string   `json:"status"`
	} `json:"npc"`
}

func npcSetAction(s *discordgo.Session, i *discordgo.InteractionCreate, client *api.Client) error {
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

func npcSetModalOnSubmit(s *discordgo.Session, i *discordgo.InteractionCreate, client *api.Client) error {
	slog.Info("Updating an npc's bio", "operation", "beny-bot.npc-set")

	if i.GuildID == "" {
		return replyEphemeral(s, i, "This command needs to be used inside of a discord server to work.")
	}

	data := i.ModalSubmitData()
	name := getModalTextInput(data, "npcName")
	bio := getModalTextInput(data, "npcBio")

	if name == "" || bio == "" {
		return replyEphemeral(s, i, "Input required to update bio.")
	}

	if err := deferReply(s, i, true); err != nil {
		return err
	}

	body := map[string]any{
		"npc": map[string]any{
			"bio":  bio,
			"name": name,
		},
		"serverId": i.GuildID,
	}

	err := client.Post("/api/discord/setAvailability", body, nil)
	if err != nil {
		slog.Error("Failed to update npc bio", "operation", "beny-bot.npc-set", "error", err)
		if isStatusCode(err, 404) {
			return editReply(s, i, "I could not find that npc.")
		}
		return editReply(s, i, "Something went wrong. Please try again later.")
	}

	return editReply(s, i, "Npc bio updated successfully.")
}

func npcViewAction(s *discordgo.Session, i *discordgo.InteractionCreate, client *api.Client) error {
	slog.Info("Fetching npc", "operation", "beny-bot.npc-view")

	if i.GuildID == "" {
		return replyEphemeral(s, i, "This command needs to be used inside of a discord server to work.")
	}

	if err := deferReply(s, i, true); err != nil {
		return err
	}

	data := i.ApplicationCommandData()
	var npcName string
	for _, opt := range data.Options[0].Options {
		if opt.Name == "name" {
			npcName = opt.StringValue()
		}
	}

	var result npcResponse
	err := client.Get("/api/discord/getNpc", map[string]string{
		"npcName":  npcName,
		"serverId": i.GuildID,
	}, &result)
	if err != nil {
		slog.Error("Failed to fetch npc", "operation", "beny-bot.npc-view", "error", err)
		if isStatusCode(err, 404) {
			return editReply(s, i, "I could not find that npc.")
		}
		return editReply(s, i, "Something went wrong. Please try again later.")
	}

	npc := result.NPC
	embed := &discordgo.MessageEmbed{
		Title:       npc.Name,
		Description: "Character: " + npc.Name,
		Color:       0x0099ff,
	}
	if npc.Avatar != "" {
		embed.Thumbnail = &discordgo.MessageEmbedThumbnail{URL: npc.Avatar}
	}

	_, err = s.InteractionResponseEdit(i.Interaction, &discordgo.WebhookEdit{
		Embeds: &[]*discordgo.MessageEmbed{embed},
	})
	return err
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
