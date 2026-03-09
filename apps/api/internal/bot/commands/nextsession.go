package commands

import (
	"log/slog"

	"github.com/BBruington/party-planner/api/internal/api"
	"github.com/bwmarrin/discordgo"
)

type checkNextSessionResponse struct {
	Message string `json:"message"`
}

var NextSessionCommand = Command{
	Name:        "nextsession",
	Description: "Check when the next D&D session is.",
	Action: func(s *discordgo.Session, i *discordgo.InteractionCreate, client *api.Client) error {
		slog.Info("Checking next session", "operation", "beny-bot.nextsession")

		if i.GuildID == "" {
			replyEphemeral(s, i, "This command needs to be used inside of a discord server to work.")
			return nil
		}

		var result checkNextSessionResponse
		err := client.Get("/api/discord/checkNextSession", map[string]string{
			"serverId": i.GuildID,
		}, &result)
		if err != nil {
			slog.Error("Failed to check next session", "operation", "beny-bot.nextsession", "error", err)
			replyEphemeral(s, i, "Failed to check for the next session. Please try again later.")
			return nil
		}

		replyPublic(s, i, result.Message)
		return nil
	},
}
