package lib

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
)

var (
	regex24Hour        = regexp.MustCompile(`^(\d{1,2}):(\d{2})(?::(\d{2}))?$`)
	regex12HourSpace   = regexp.MustCompile(`^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$`)
	regex12HourNoSpace = regexp.MustCompile(`^(\d{1,2})(?::(\d{2}))?(am|pm)$`)
	regexHourOnly      = regexp.MustCompile(`^(\d{1,2})$`)
)

// MapStringInputToTime converts various user time input formats to HH:MM:SS (24-hour).
// Returns empty string if input cannot be parsed.
func MapStringInputToTime(input string) (string, bool) {
	if input == "" {
		return "", false
	}

	normalized := strings.ToLower(strings.TrimSpace(input))

	// Clean up noise words
	cleaned := regexp.MustCompile(`\s*(at|:)\s*`).ReplaceAllString(normalized, ":")
	cleaned = strings.Join(strings.Fields(cleaned), " ")
	cleaned = strings.TrimSpace(cleaned)

	if cleaned == "allday" || cleaned == "all" {
		return "allday", true
	}

	// Try 24-hour format: "19:00", "19:00:00", "7:30"
	if m := regex24Hour.FindStringSubmatch(cleaned); m != nil {
		hours, _ := strconv.Atoi(m[1])
		minutes, _ := strconv.Atoi(m[2])
		seconds := 0
		if m[3] != "" {
			seconds, _ = strconv.Atoi(m[3])
		}
		if hours <= 23 && minutes <= 59 && seconds <= 59 {
			return fmt.Sprintf("%02d:%02d:%02d", hours, minutes, seconds), true
		}
	}

	// Try 12-hour with space: "7:00 PM", "7 PM", "2:30 AM"
	if m := regex12HourSpace.FindStringSubmatch(cleaned); m != nil {
		hours, _ := strconv.Atoi(m[1])
		minutes := 0
		if m[2] != "" {
			minutes, _ = strconv.Atoi(m[2])
		}
		meridiem := m[3]
		if hours >= 1 && hours <= 12 && minutes <= 59 {
			if meridiem == "pm" && hours != 12 {
				hours += 12
			} else if meridiem == "am" && hours == 12 {
				hours = 0
			}
			return fmt.Sprintf("%02d:%02d:00", hours, minutes), true
		}
	}

	// Try 12-hour no space: "7pm", "7:30pm", "2:30am"
	if m := regex12HourNoSpace.FindStringSubmatch(cleaned); m != nil {
		hours, _ := strconv.Atoi(m[1])
		minutes := 0
		if m[2] != "" {
			minutes, _ = strconv.Atoi(m[2])
		}
		meridiem := m[3]
		if hours >= 1 && hours <= 12 && minutes <= 59 {
			if meridiem == "pm" && hours != 12 {
				hours += 12
			} else if meridiem == "am" && hours == 12 {
				hours = 0
			}
			return fmt.Sprintf("%02d:%02d:00", hours, minutes), true
		}
	}

	// Try hour only: "7", "19"
	if m := regexHourOnly.FindStringSubmatch(cleaned); m != nil {
		hours, _ := strconv.Atoi(m[1])
		if hours <= 23 {
			return fmt.Sprintf("%02d:00:00", hours), true
		}
	}

	return "", false
}

// GetDayName maps 0-6 to day names (Sunday=0).
func GetDayName(dayOfWeek int) string {
	days := []string{"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"}
	if dayOfWeek < 0 || dayOfWeek >= len(days) {
		return "Unknown"
	}
	return days[dayOfWeek]
}

// GetDayNumber maps day name strings to 0-6, returns -1 if invalid.
func GetDayNumber(dayOfWeek string) int {
	days := map[string]int{
		"sunday":    0,
		"monday":    1,
		"tuesday":   2,
		"wednesday": 3,
		"thursday":  4,
		"friday":    5,
		"saturday":  6,
	}
	normalized := strings.ToLower(strings.TrimSpace(dayOfWeek))
	if v, ok := days[normalized]; ok {
		return v
	}
	return -1
}

// FormatTime converts HH:MM:SS to 12-hour format (e.g., "3:00 PM").
func FormatTime(t string) string {
	parts := strings.Split(t, ":")
	if len(parts) < 2 {
		return t
	}
	hour, err := strconv.Atoi(parts[0])
	if err != nil || hour < 0 || hour > 23 {
		return t
	}

	minute, err := strconv.Atoi(parts[1])
	if err != nil || minute < 0 || minute > 59 {
		return t
	}

	period := "AM"
	if hour >= 12 {
		period = "PM"
	}

	displayHour := hour
	if hour == 0 {
		displayHour = 12
	} else if hour > 12 {
		displayHour = hour - 12
	}

	return fmt.Sprintf("%d:%02d %s", displayHour, minute, period)
}
