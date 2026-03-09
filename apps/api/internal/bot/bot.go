package bot

import (
	"log/slog"
	"strings"
	"time"

	"github.com/BBruington/party-planner/api/internal/api"
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

// Start initialises the Discord session, registers commands, and sets up event handlers.
func Start(token string, client *api.Client) (*discordgo.Session, error) {
	dg, err := discordgo.New("Bot " + token)
	if err != nil {
		return nil, err
	}

	dg.Identify.Intents = discordgo.IntentsGuilds | discordgo.IntentsGuildMembers | discordgo.IntentsGuildMessages

	dg.AddHandler(func(s *discordgo.Session, r *discordgo.Ready) {
		slog.Info("Bot logged in", "bot", r.User.Username, "startedAt", time.Now())
		registerCommands(s, r.User.ID)
	})

	dg.AddHandler(func(s *discordgo.Session, i *discordgo.InteractionCreate) {
		handleInteraction(s, i, client)
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

func handleInteraction(s *discordgo.Session, i *discordgo.InteractionCreate, client *api.Client) {
	switch i.Type {
	case discordgo.InteractionModalSubmit:
		handleModalSubmit(s, i, client)
	case discordgo.InteractionApplicationCommand:
		handleApplicationCommand(s, i, client)
	}
}

func handleModalSubmit(s *discordgo.Session, i *discordgo.InteractionCreate, client *api.Client) {
	customID := i.ModalSubmitData().CustomID
	parts := strings.SplitN(customID, ":", 2)

	if len(parts) == 0 {
		slog.Error("Failed to read customId for modal submit", "customId", customID)
		return
	}

	commandName := parts[0]
	subcommandName := ""
	if len(parts) > 1 {
		subcommandName = parts[1]
	}

	// Reconstruct the original modal ID to find the right handler
	modalID := customID

	for _, cmd := range AllCommands {
		// Check top-level modal
		if cmd.Modal != nil && cmd.Modal.ID == modalID {
			if err := cmd.Modal.OnSubmit(s, i, client); err != nil {
				slog.Error("Modal submit handler error", "modal", modalID, "error", err)
			}
			return
		}

		// Check subcommand modals
		if cmd.Name == commandName || (subcommandName == "" && cmd.Modal != nil && cmd.Modal.ID == commandName) {
			for _, sub := range cmd.Subcommands {
				subModalID := cmd.Name + ":" + sub.Name
				if sub.Modal != nil && (sub.Modal.ID == modalID || subModalID == modalID) {
					if err := sub.Modal.OnSubmit(s, i, client); err != nil {
						slog.Error("Subcommand modal submit handler error", "modal", modalID, "error", err)
					}
					return
				}
			}
		}
	}

	slog.Error("No modal handler found", "customId", customID)
}

func handleApplicationCommand(s *discordgo.Session, i *discordgo.InteractionCreate, client *api.Client) {
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
					if err := sub.Action(s, i, client); err != nil {
						slog.Error("Subcommand action error", "command", cmdName, "subcommand", subName, "error", err)
					}
					return
				}
			}
		} else if cmd.Action != nil {
			if err := cmd.Action(s, i, client); err != nil {
				slog.Error("Command action error", "command", cmdName, "error", err)
			}
			return
		}
	}

	slog.Error("No command handler found", "command", cmdName)
}
