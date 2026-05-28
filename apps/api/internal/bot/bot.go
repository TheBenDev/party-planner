package bot

import (
	"log/slog"
	"time"

	"github.com/BBruington/party-planner/api/internal/bot/commands"
	"github.com/bwmarrin/discordgo"
)

// AllCommands is the registry of all bot commands.
var AllCommands = []commands.Command{
	commands.AvailabilityCommand,
	commands.BenyBoyCommand,
	commands.NextSessionCommand,
	commands.NpcCommand,
	commands.RegisterCampaignCommand,
	commands.ScheduleEventCommand,
}

type modalHandler func(*discordgo.Session, *discordgo.InteractionCreate, *commands.BotDeps) error

var modalHandlers map[string]modalHandler

func init() {
	modalHandlers = make(map[string]modalHandler)
	for _, cmd := range AllCommands {
		if cmd.Modal != nil {
			modalHandlers[cmd.Modal.ID] = cmd.Modal.OnSubmit
		}
		for _, sub := range cmd.Subcommands {
			if sub.Modal != nil {
				modalHandlers[sub.Modal.ID] = sub.Modal.OnSubmit
			}
		}
	}
}

// Start initialises the Discord session, registers commands, and sets up event handlers.
func Start(token string, deps *commands.BotDeps) (*discordgo.Session, error) {
	dg, err := discordgo.New("Bot " + token)
	if err != nil {
		return nil, err
	}

	dg.Identify.Intents = discordgo.IntentsGuilds

	dg.AddHandler(func(s *discordgo.Session, r *discordgo.Ready) {
		slog.Info("Bot logged in", "bot", r.User.Username, "startedAt", time.Now())
		registerCommands(s, r.User.ID)
	})

	dg.AddHandler(func(s *discordgo.Session, i *discordgo.InteractionCreate) {
		handleInteraction(s, i, deps)
	})

	if err := dg.Open(); err != nil {
		return nil, err
	}

	return dg, nil
}

func registerCommands(s *discordgo.Session, appID string) {
	for _, cmd := range AllCommands {
		appCmd := &discordgo.ApplicationCommand{
			Name:        cmd.Name,
			Description: cmd.Description,
		}

		if len(cmd.Subcommands) > 0 {
			for _, sub := range cmd.Subcommands {
				subCmd := &discordgo.ApplicationCommandOption{
					Type:        discordgo.ApplicationCommandOptionSubCommand,
					Name:        sub.Name,
					Description: sub.Description,
				}
				for _, opt := range sub.Options {
					subCmd.Options = append(subCmd.Options, &discordgo.ApplicationCommandOption{
						Type:        discordgo.ApplicationCommandOptionString,
						Name:        opt.Name,
						Description: opt.Description,
						Required:    opt.IsRequired,
					})
				}
				appCmd.Options = append(appCmd.Options, subCmd)
			}
		}

		for _, opt := range cmd.Options {
			appCmd.Options = append(appCmd.Options, &discordgo.ApplicationCommandOption{
				Type:        discordgo.ApplicationCommandOptionString,
				Name:        opt.Name,
				Description: opt.Description,
				Required:    opt.IsRequired,
			})
		}

		if _, err := s.ApplicationCommandCreate(appID, "", appCmd); err != nil {
			slog.Error("Failed to register command", "command", cmd.Name, "error", err)
		}
	}
}

func interactionUserID(i *discordgo.InteractionCreate) string {
	if i.Member != nil && i.Member.User != nil {
		return i.Member.User.ID
	}
	if i.User != nil {
		return i.User.ID
	}
	return ""
}

func handleInteraction(s *discordgo.Session, i *discordgo.InteractionCreate, deps *commands.BotDeps) {
	if i.Type == discordgo.InteractionApplicationCommand {
		if uid := interactionUserID(i); uid != "" && !allowBotUser(uid) {
			if err := s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
				Type: discordgo.InteractionResponseChannelMessageWithSource,
				Data: &discordgo.InteractionResponseData{
					Content: "You're sending commands too quickly. Please slow down.",
					Flags:   discordgo.MessageFlagsEphemeral,
				},
			}); err != nil {
				slog.Error("Failed to send rate limit response", "error", err)
			}
			return
		}
	}

	switch i.Type {
	case discordgo.InteractionModalSubmit:
		handleModalSubmit(s, i, deps)
	case discordgo.InteractionApplicationCommand:
		handleApplicationCommand(s, i, deps)
	}
}

func handleModalSubmit(s *discordgo.Session, i *discordgo.InteractionCreate, deps *commands.BotDeps) {
	modalID := i.ModalSubmitData().CustomID
	handler, ok := modalHandlers[modalID]
	if !ok {
		slog.Error("No modal handler found", "customId", modalID)
		return
	}
	if err := handler(s, i, deps); err != nil {
		slog.Error("Modal submit handler error", "modal", modalID, "error", err)
	}
}

func handleApplicationCommand(s *discordgo.Session, i *discordgo.InteractionCreate, deps *commands.BotDeps) {
	cmdName := i.ApplicationCommandData().Name

	for _, cmd := range AllCommands {
		if cmd.Name != cmdName {
			continue
		}

		if len(cmd.Subcommands) > 0 {
			subName := ""
			opts := i.ApplicationCommandData().Options
			if len(opts) > 0 {
				subName = opts[0].Name
			}
			for _, sub := range cmd.Subcommands {
				if sub.Name == subName {
					if err := sub.Action(s, i, deps); err != nil {
						slog.Error("Subcommand action error", "command", cmdName, "subcommand", subName, "error", err)
					}
					return
				}
			}
		} else if cmd.Action != nil {
			if err := cmd.Action(s, i, deps); err != nil {
				slog.Error("Command action error", "command", cmdName, "error", err)
			}
			return
		}
	}

	slog.Error("No command handler found", "command", cmdName)
}
