package commands

import (
	"fmt"
	"log/slog"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/BBruington/party-planner/api/internal/api"
	"github.com/BBruington/party-planner/api/internal/lib"
	"github.com/bwmarrin/discordgo"
)

type availabilitySlot struct {
	DayOfWeek int    `json:"dayOfWeek"`
	StartTime string `json:"startTime"`
	EndTime   string `json:"endTime"`
}

type getAvailabilitiesResponse struct {
	UserAvailabilities []availabilitySlot `json:"userAvailabilities"`
}

func availabilitySetAction(s *discordgo.Session, i *discordgo.InteractionCreate, client *api.Client) error {
	slog.Info("Setting an availability", "operation", "beny-bot.available-set")

	modal := &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseModal,
		Data: &discordgo.InteractionResponseData{
			CustomID: "available:set",
			Title:    "Set a time you are available",
			Components: []discordgo.MessageComponent{
				discordgo.ActionsRow{
					Components: []discordgo.MessageComponent{
						&discordgo.TextInput{
							CustomID:    "availabilityDay",
							Label:       "Day of Week",
							Style:       discordgo.TextInputShort,
							Placeholder: "Sunday, Monday, Tuesday, ..., Saturday",
							Required:    true,
							MaxLength:   9,
						},
					},
				},
				discordgo.ActionsRow{
					Components: []discordgo.MessageComponent{
						&discordgo.TextInput{
							CustomID:    "availabilityStartTime",
							Label:       "Start Time",
							Style:       discordgo.TextInputShort,
							Placeholder: "Examples: 7:00 PM, 19:00, 7pm",
							Required:    true,
							MaxLength:   10,
						},
					},
				},
				discordgo.ActionsRow{
					Components: []discordgo.MessageComponent{
						&discordgo.TextInput{
							CustomID:    "availabilityEndTime",
							Label:       "End Time (leave blank for all day)",
							Style:       discordgo.TextInputShort,
							Placeholder: "Examples: 7:00 PM, 19:00, 7pm",
							Required:    false,
							MaxLength:   10,
						},
					},
				},
				discordgo.ActionsRow{
					Components: []discordgo.MessageComponent{
						&discordgo.TextInput{
							CustomID:    "availabilityFrequency",
							Label:       "Frequency",
							Style:       discordgo.TextInputShort,
							Placeholder: "1 = every week, 2 = every other week",
							Required:    true,
							MaxLength:   1,
						},
					},
				},
			},
		},
	}

	return s.InteractionRespond(i.Interaction, modal)
}

func availabilitySetModalOnSubmit(s *discordgo.Session, i *discordgo.InteractionCreate, client *api.Client) error {
	slog.Info("Setting timeslot for user's availability", "operation", "beny-bot.availability-set")

	if i.GuildID == "" {
		return replyEphemeral(s, i, "This command needs to be used inside of a discord server to work.")
	}

	data := i.ModalSubmitData()
	userID := i.Member.User.ID
	serverId := i.GuildID

	dayStr := getModalTextInput(data, "availabilityDay")
	frequencyStr := getModalTextInput(data, "availabilityFrequency")
	startTimeStr := getModalTextInput(data, "availabilityStartTime")
	endTimeStr := getModalTextInput(data, "availabilityEndTime")

	day := lib.GetDayNumber(dayStr)
	if day == -1 {
		return replyEphemeral(s, i, "I could not read the day you entered. Please use a day name like 'Monday'.")
	}

	frequency, err := strconv.Atoi(strings.TrimSpace(frequencyStr))
	if err != nil || (frequency != 1 && frequency != 2) {
		return replyEphemeral(s, i, "Frequency must be 1 (every week) or 2 (every other week).")
	}

	parsedStart, ok := lib.MapStringInputToTime(startTimeStr)
	if !ok {
		return replyEphemeral(s, i, "I could not convert the start time into a valid time")
	}

	var parsedEnd string
	if endTimeStr == "" {
		parsedEnd = "23:59:59"
	} else {
		parsedEnd, ok = lib.MapStringInputToTime(endTimeStr)
		if !ok {
			return replyEphemeral(s, i, "I could not convert the end time into a valid time")
		}
	}

	startTime, err := time.Parse("15:04:05", parsedStart)
	if err != nil {
		return replyEphemeral(s, i, "I could not convert the start time into a valid time")
	}

	endTime, err := time.Parse("15:04:05", parsedEnd)
	if err != nil {
		return replyEphemeral(s, i, "I could not convert the end time into a valid time")
	}

	if !endTime.After(startTime) {
		return replyEphemeral(s, i, "End time must be after start time")
	}

	body := map[string]any{
		"externalId": userID,
		"serverId":   serverId,
		"time": map[string]any{
			"dayOfWeek": day,
			"endTime":   parsedEnd,
			"frequency": frequency,
			"startTime": parsedStart,
		},
	}

	err = client.Post("/api/discord/availability", body, nil)
	if err != nil {
		slog.Error("Failed to set availability", "operation", "beny-bot.availability-set", "error", err)
		if isStatusCode(err, 409) {
			return replyEphemeral(s, i, "Timeslot overlapping with an already existing one. Use /availability view to see your already set availabilities.")
		}
		return replyEphemeral(s, i, "Failed to set availability. Please try again later")
	}

	return replyEphemeral(s, i, "Availability set successfully. Use /availability view to see your currently set availability timeslots.")
}

func availabilityViewAction(s *discordgo.Session, i *discordgo.InteractionCreate, client *api.Client) error {
	if i.GuildID == "" || i.Member == nil || i.Member.User == nil {
		return replyEphemeral(s, i, "This command needs to be used inside of a discord server to work.")
	}

	slog.Info("Viewing availabilities", "operation", "beny-bot.availability-view", "user", i.Member.User.GlobalName)

	userID := i.Member.User.ID
	var result getAvailabilitiesResponse
	err := client.Get("/api/discord/availability", map[string]string{
		"userExternalId": userID,
	}, &result)
	if err != nil {
		slog.Error("Failed to get availabilities", "operation", "beny-bot.availability-view", "error", err)
		return replyEphemeral(s, i, "Failed to check for your availabilities. Please try again later.")
	}

	if len(result.UserAvailabilities) == 0 {
		return replyEphemeral(s, i, "❌ You haven't set any availability yet.")
	}

	// Sort by day then time
	sorted := result.UserAvailabilities
	sort.Slice(sorted, func(a, b int) bool {
		if sorted[a].DayOfWeek != sorted[b].DayOfWeek {
			return sorted[a].DayOfWeek < sorted[b].DayOfWeek
		}
		return strings.Compare(sorted[a].StartTime, sorted[b].StartTime) < 0
	})

	lines := make([]string, 0, len(sorted))
	for _, slot := range sorted {
		day := lib.GetDayName(slot.DayOfWeek)
		start := lib.FormatTime(slot.StartTime)
		end := lib.FormatTime(slot.EndTime)
		lines = append(lines, fmt.Sprintf("• **%s**: %s - %s", day, start, end))
	}

	content := "📅 **Your Availability**\n\n" + strings.Join(lines, "\n")
	return replyEphemeral(s, i, content)
}

func availabilityRemoveAction(s *discordgo.Session, i *discordgo.InteractionCreate, client *api.Client) error {
	if i.GuildID == "" || i.Member == nil || i.Member.User == nil {
		return replyEphemeral(s, i, "This command needs to be used inside of a discord server to work.")
	}

	slog.Info("Removing an availability timeslot", "operation", "beny-bot.availability-remove", "user", i.Member.User.GlobalName)

	userID := i.Member.User.ID
	data := i.ApplicationCommandData()
	var dayVal, timeVal string
	for _, opt := range data.Options[0].Options {
		switch opt.Name {
		case "day":
			dayVal = opt.StringValue()
		case "time":
			timeVal = opt.StringValue()
		}
	}

	if dayVal == "" || timeVal == "" {
		return replyEphemeral(s, i, "I could not parse the day and time given.")
	}

	normalizedDay := lib.GetDayNumber(dayVal)
	if normalizedDay == -1 {
		return replyEphemeral(s, i, "I could not read the day you gave me.")
	}

	normalizedTime, ok := lib.MapStringInputToTime(timeVal)
	if !ok {
		return replyEphemeral(s, i, "I could not read the time you gave me.")
	}

	body := map[string]any{
		"dayOfWeek":      normalizedDay,
		"startTime":      normalizedTime,
		"userExternalId": userID,
	}

	err := client.Delete("/api/discord/availability/single", body)
	if err != nil {
		slog.Error("Failed to remove availability", "operation", "beny-bot.availability-remove", "error", err)
		return replyEphemeral(s, i, "Something went wrong when trying to remove your availability timeslot. Please try again later or reach out for help.")
	}

	return replyEphemeral(s, i, "Successfully removed availability timeslot.")
}

func availabilityClearAction(s *discordgo.Session, i *discordgo.InteractionCreate, client *api.Client) error {
	if i.GuildID == "" || i.Member == nil || i.Member.User == nil {
		return replyEphemeral(s, i, "This command needs to be used inside of a discord server to work.")
	}

	slog.Info("Clearing availability timeslots", "operation", "beny-bot.availability-clear", "user", i.Member.User.GlobalName)

	userID := i.Member.User.ID
	body := map[string]any{
		"userExternalId": userID,
	}

	err := client.Delete("/api/discord/availability", body)
	if err != nil {
		slog.Error("Failed to clear availability", "operation", "beny-bot.availability-clear", "error", err)
		return replyEphemeral(s, i, "Something went wrong when trying to remove all of your availability timeslots. Please try again later or reach out for help.")
	}

	return replyEphemeral(s, i, "Successfully removed all of your availability timeslots.")
}

var AvailabilityCommand = Command{
	Name:        "available",
	Description: "Manage your D&D availability",
	Subcommands: []Subcommand{
		{
			Name:        "set",
			Description: "Set your recurring availability",
			Action:      availabilitySetAction,
			Modal: &Modal{
				ID:       "available:set",
				OnSubmit: availabilitySetModalOnSubmit,
			},
		},
		{
			Name:        "view",
			Description: "View your current availability",
			Action:      availabilityViewAction,
		},
		{
			Name:        "remove",
			Description: "Remove a specific availability rule",
			Action:      availabilityRemoveAction,
			Options: []Option{
				{Name: "day", Description: "The Day of the timeslot you'd like removed.", IsRequired: true},
				{Name: "time", Description: "The Time of the timeslot you'd like removed.", IsRequired: true},
			},
		},
		{
			Name:        "clear",
			Description: "Clear all your availability rules",
			Action:      availabilityClearAction,
		},
	},
}
