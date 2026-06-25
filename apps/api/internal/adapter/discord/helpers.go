package discord

import (
	"database/sql"
	"fmt"
	"strconv"
	"strings"
	"time"
)

type discordRecurrenceRule struct {
	Start     time.Time  `json:"start"`
	End       *time.Time `json:"end"`
	Frequency int        `json:"frequency"`
	Interval  int        `json:"interval"`
	ByWeekday []int      `json:"by_weekday"`
}

var discordDayIndex = map[string]int{
	"MO": 0, "TU": 1, "WE": 2, "TH": 3, "FR": 4, "SA": 5, "SU": 6,
}

var discordFreqMap = map[string]int{
	"YEARLY":  0,
	"MONTHLY": 1,
	"WEEKLY":  2,
	"DAILY":   3,
}

func computeFirstOccurrence(seriesStartDate time.Time, startTime sql.NullString) *time.Time {
	if !startTime.Valid {
		return nil
	}
	hours, minutes, seconds, ok := parseStartTime(startTime.String)
	if !ok {
		return nil
	}
	year, month, day := seriesStartDate.UTC().Date()
	time := time.Date(year, month, day, hours, minutes, seconds, 0, time.UTC)
	return &time
}

func parseStartTime(s string) (hours, minutes, seconds int, ok bool) {
	if _, err := fmt.Sscanf(s, "%d:%d:%d", &hours, &minutes, &seconds); err == nil {
		return hours, minutes, seconds, true
	}
	if _, err := fmt.Sscanf(s, "%d:%d", &hours, &minutes); err == nil {
		return hours, minutes, 0, true
	}
	return 0, 0, 0, false
}

// accepts FREQ INTERVAL and BYDAY from an rrule string
// and converts it to a struct that the discordScheduledEventPayload can parse
func rruleToDiscordRecurrence(rrule sql.NullString, start time.Time, end *time.Time) *discordRecurrenceRule {
	if !rrule.Valid || rrule.String == "" {
		return nil
	}
	parts := make(map[string]string)
	for _, segment := range strings.Split(rrule.String, ";") {
		kv := strings.SplitN(segment, "=", 2)
		if len(kv) == 2 {
			parts[kv[0]] = kv[1]
		}
	}
	frequency, ok := discordFreqMap[strings.ToUpper(parts["FREQ"])]
	if !ok {
		return nil
	}
	interval := 1
	if parsedInterval, err := strconv.Atoi(parts["INTERVAL"]); err == nil && parsedInterval > 0 {
		interval = parsedInterval
	}
	var byWeekday []int
	for _, code := range strings.Split(parts["BYDAY"], ",") {
		if idx, ok := discordDayIndex[strings.TrimSpace(strings.ToUpper(code))]; ok {
			byWeekday = append(byWeekday, idx)
		}
	}

	return &discordRecurrenceRule{
		Start:     start,
		End:       end,
		Frequency: frequency,
		Interval:  interval,
		ByWeekday: byWeekday,
	}
}

// discord events need to be set to an increment of 15 minutes
func roundDownTo15(minutes int32) time.Duration {
	floored := (minutes / 15) * 15
	if floored < 15 {
		floored = 15
	}
	return time.Duration(floored) * time.Minute
}

func formatPollTimestamps(title string, options []time.Time) string {
	var sb strings.Builder

	fmt.Fprintf(&sb, "**%s** — options in your local time:\n", title)
	for i, opt := range options {
		fmt.Fprintf(&sb, "%d. <t:%d:F>\n", i+1, opt.Unix())
	}

	return sb.String()
}
