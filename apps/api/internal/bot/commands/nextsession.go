package commands

import (
	"database/sql"
	"errors"
	"fmt"
	"log/slog"

	model "github.com/BBruington/party-planner/api/internal/models"
	"github.com/bwmarrin/discordgo"
)

var NextSessionCommand = Command{
	Name:        "nextsession",
	Description: "Check when the next D&D session is.",
	Action: func(s *discordgo.Session, i *discordgo.InteractionCreate, deps *BotDeps) error {
		slog.Info("Checking next session", "operation", "beny-bot.nextsession")

		if i.GuildID == "" {
			return replyEphemeral(s, i, "This command needs to be used inside of a discord server to work.")
		}

		integration, err := deps.DB.GetCampaignIntegrationByExternalID(i.GuildID, model.IntegrationSourceDiscord)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return replyEphemeral(s, i, "This Discord server is not linked to a campaign. Use /registercampaign to set one up.")
			}
			slog.Error("Failed to find campaign integration", "operation", "beny-bot.nextsession", "guildID", i.GuildID, "error", err)
			return replyEphemeral(s, i, "Failed to check for the next session. Please try again later.")
		}

		session, err := deps.DB.GetNextSessionByCampaign(integration.CampaignID)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return replyPublic(s, i, "I don't see any sessions coming up.")
			}
			slog.Error("Failed to get next session", "operation", "beny-bot.nextsession", "guildID", i.GuildID, "error", err)
			return replyEphemeral(s, i, "Failed to check for the next session. Please try again later.")
		}

		if !session.StartsAt.Valid {
			return replyPublic(s, i, "I don't see any sessions coming up.")
		}

		timeStr := session.StartsAt.Time.Format("Monday, January 2, 2006 at 3:04 PM MST")
		return replyPublic(s, i, fmt.Sprintf("The next D&D session starts on %s!", timeStr))
	},
}
