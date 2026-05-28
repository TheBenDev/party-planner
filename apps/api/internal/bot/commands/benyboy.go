package commands

import "github.com/bwmarrin/discordgo"

var BenyBoyCommand = Command{
	Name:        "beny",
	Description: "Beny!",
	Action: func(s *discordgo.Session, i *discordgo.InteractionCreate, deps *BotDeps) error {
		return replyPublic(s, i, "Boy!")
	},
}
