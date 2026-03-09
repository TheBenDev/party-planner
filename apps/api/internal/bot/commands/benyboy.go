package commands

import (
	"github.com/BBruington/party-planner/api/internal/api"
	"github.com/bwmarrin/discordgo"
)

var BenyBoyCommand = Command{
	Name:        "beny",
	Description: "Beny!",
	Action: func(s *discordgo.Session, i *discordgo.InteractionCreate, client *api.Client) error {
		replyPublic(s, i, "Boy!")
		return nil
	},
}
