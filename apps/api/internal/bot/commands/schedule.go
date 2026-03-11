package commands

import (
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/BBruington/party-planner/api/internal/api"
	"github.com/bwmarrin/discordgo"
)

type scheduleSessionResponse struct {
	AvailableUsers []string `json:"availableUsers"`
}

func scheduleAction(s *discordgo.Session, i *discordgo.InteractionCreate, client *api.Client) error {
	if !hasAdminPermission(i) {
		return replyEphemeral(s, i, "❌ You need Administrator permissions to use this command.")
	}

	now := time.Now().UTC()
	datePlaceholder := fmt.Sprintf("YYYY-MM-DD (e.g. %s)", now.Format("2006-01-02"))

	return s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseModal,
		Data: &discordgo.InteractionResponseData{
			CustomID: "schedule",
			Title:    "Schedule an event",
			Components: []discordgo.MessageComponent{
				discordgo.ActionsRow{
					Components: []discordgo.MessageComponent{
						&discordgo.TextInput{
							CustomID:    "eventName",
							Label:       "Event Name",
							Style:       discordgo.TextInputShort,
							Placeholder: "The event you're creating",
							Required:    true,
							MaxLength:   30,
						},
					},
				},
				discordgo.ActionsRow{
					Components: []discordgo.MessageComponent{
						&discordgo.TextInput{
							CustomID:    "sessionDate",
							Label:       "Date",
							Style:       discordgo.TextInputShort,
							Placeholder: datePlaceholder,
							Required:    true,
							MaxLength:   10,
						},
					},
				},
				discordgo.ActionsRow{
					Components: []discordgo.MessageComponent{
						&discordgo.TextInput{
							CustomID:    "sessionHour",
							Label:       "Hour (0-23)",
							Style:       discordgo.TextInputShort,
							Placeholder: "e.g. 19 for 7 PM",
							Required:    true,
							MaxLength:   2,
						},
					},
				},
				discordgo.ActionsRow{
					Components: []discordgo.MessageComponent{
						&discordgo.TextInput{
							CustomID:    "sessionMinute",
							Label:       "Minute (00, 15, 30, or 45)",
							Style:       discordgo.TextInputShort,
							Placeholder: "00",
							Required:    true,
							MaxLength:   2,
						},
					},
				},
			},
		},
	})
}

func scheduleModalOnSubmit(s *discordgo.Session, i *discordgo.InteractionCreate, client *api.Client) error {
	slog.Info("Scheduling session for dnd", "operation", "beny-bot.schedule")

	if i.GuildID == "" {
		return replyEphemeral(s, i, "This command needs to be used inside of a discord server to work.")
	}

	data := i.ModalSubmitData()
	eventName := getModalTextInput(data, "eventName")
	hour := strings.TrimSpace(getModalTextInput(data, "sessionHour"))
	minute := strings.TrimSpace(getModalTextInput(data, "sessionMinute"))
	date := strings.TrimSpace(getModalTextInput(data, "sessionDate"))

	if hour == "" || minute == "" || date == "" {
		return replyEphemeral(s, i, "Something went wrong trying to read your inputs. Please try again or ask for help.")
	}

	// Normalise hour/minute to two digits
	if len(hour) == 1 {
		hour = "0" + hour
	}
	if len(minute) == 1 {
		minute = "0" + minute
	}

	// Parse scheduled start time
	loc := time.UTC
	scheduledStartTime, err := time.ParseInLocation("2006-01-02T15:04:05", fmt.Sprintf("%sT%s:%s:00", date, hour, minute), loc)
	if err != nil {
		slog.Error("Failed to parse schedule time", "operation", "beny-bot.schedule", "error", err)
		return replyEphemeral(s, i, "Failed to parse the date and time. Please try again.")
	}
	scheduledEndTime := scheduledStartTime.Add(2 * time.Hour)

	if err := deferReply(s, i, false); err != nil {
		return err
	}

	body := map[string]any{
		"channelId": i.ChannelID,
		"serverId":  i.GuildID,
		"time": map[string]any{
			"date":   date,
			"hour":   hour,
			"minute": minute,
		},
	}

	var result scheduleSessionResponse
	err = client.Post("/api/discord/scheduleSession", body, &result)
	if err != nil {
		slog.Error("Failed to schedule session", "operation", "beny-bot.schedule", "error", err)
		return editReply(s, i, "Failed to schedule session. Please try again later.")
	}

	// Create Discord scheduled event
	privacyLevel := discordgo.GuildScheduledEventPrivacyLevelGuildOnly
	entityType := discordgo.GuildScheduledEventEntityTypeExternal
	_, err = s.GuildScheduledEventCreate(i.GuildID, &discordgo.GuildScheduledEventParams{
		Name:               eventName,
		PrivacyLevel:       privacyLevel,
		ScheduledStartTime: &scheduledStartTime,
		ScheduledEndTime:   &scheduledEndTime,
		EntityType:         entityType,
		EntityMetadata: &discordgo.GuildScheduledEventEntityMetadata{
			Location: "Check the channel for details",
		},
	})
	if err != nil {
		slog.Error("Failed to create Discord scheduled event", "operation", "beny-bot.schedule", "error", err)
	}

	unixTimestamp := scheduledStartTime.Unix()
	discordTimestamp := fmt.Sprintf("<t:%d:F>", unixTimestamp)

	var reply string
	if len(result.AvailableUsers) > 0 {
		reply = fmt.Sprintf("Session scheduled **%s**. We have %s available to join!", discordTimestamp, strings.Join(result.AvailableUsers, ", "))
	} else {
		reply = fmt.Sprintf("Session scheduled %s.", discordTimestamp)
	}

	if err != nil {
		reply += fmt.Sprintf(" The Discord scheduled event could not be created: %v", err)
	}

	return editReply(s, i, reply)
}

var ScheduleEventCommand = Command{
	Name:        "schedule",
	Description: "Schedule an event such as a D&D session.",
	Action:      scheduleAction,
	Modal: &Modal{
		ID:       "schedule",
		OnSubmit: scheduleModalOnSubmit,
	},
}
