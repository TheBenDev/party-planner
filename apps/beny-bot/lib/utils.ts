const REGEX_24_HOUR = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
const REGEX_12_HOUR_SPACE = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/;
const REGEX_12_HOUR_NO_SPACE = /^(\d{1,2})(?::(\d{2}))?(am|pm)$/;
const REGEX_HOUR_ONLY = /^(\d{1,2})$/;

export function mapStringInputToTime(input: string): string | null {
	if (!input) return null;

	const normalized = input.toLowerCase().trim();

	// Remove common noise words and clean up
	const cleaned = normalized
		.replace(/\s*(at|:)\s*/g, ":")
		.replace(/\s+/g, " ")
		.trim();

	if (cleaned === "allday" || cleaned === "all") return "allday";

	// Try 24-hour format: "19:00", "19:00:00", "7:30"
	let match = cleaned.match(REGEX_24_HOUR);
	if (match?.[1] && match[2]) {
		const hours = Number.parseInt(match[1], 10);
		const minutes = Number.parseInt(match[2], 10);
		const seconds = match[3] ? Number.parseInt(match[3], 10) : 0;

		if (hours <= 23 && minutes <= 59 && seconds <= 59) {
			return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
		}
	}

	// Try 12-hour with space: "7:00 PM", "7 PM", "2:30 AM"
	match = cleaned.match(REGEX_12_HOUR_SPACE);
	if (match?.[1] && match[3]) {
		let hours = Number.parseInt(match[1], 10);
		const minutes = match[2] ? Number.parseInt(match[2], 10) : 0;
		const meridiem = match[3];

		if (hours >= 1 && hours <= 12 && minutes <= 59) {
			// Convert to 24-hour
			if (meridiem === "pm" && hours !== 12) {
				hours += 12;
			} else if (meridiem === "am" && hours === 12) {
				hours = 0;
			}

			return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00`;
		}
	}

	// Try 12-hour no space: "7pm", "7:30pm", "2:30am"
	match = cleaned.match(REGEX_12_HOUR_NO_SPACE);
	if (match?.[1] && match[3]) {
		let hours = Number.parseInt(match[1], 10);
		const minutes = match[2] ? Number.parseInt(match[2], 10) : 0;
		const meridiem = match[3];

		if (hours >= 1 && hours <= 12 && minutes <= 59) {
			// Convert to 24-hour
			if (meridiem === "pm" && hours !== 12) {
				hours += 12;
			} else if (meridiem === "am" && hours === 12) {
				hours = 0;
			}

			return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00`;
		}
	}

	// Try hour only: "7", "19"
	match = cleaned.match(REGEX_HOUR_ONLY);
	if (match?.[1]) {
		const hours = Number.parseInt(match[1], 10);
		if (hours <= 23) {
			return `${hours.toString().padStart(2, "0")}:00:00`;
		}
	}

	return null;
}

export function getDayName(dayOfWeek: number): string {
	const days = [
		"Sunday",
		"Monday",
		"Tuesday",
		"Wednesday",
		"Thursday",
		"Friday",
		"Saturday",
	];
	return days[dayOfWeek] ?? "Unknown";
}
export function getDayNumber(dayOfWeek: string): number {
	const days: Record<string, number> = {
		friday: 5,
		monday: 1,
		saturday: 6,
		sunday: 0,
		thursday: 4,
		tuesday: 2,
		wednesday: 3,
	};

	const normalized = dayOfWeek.toLowerCase();
	return days[normalized] ?? -1;
}

export function formatTime(time: string): string {
	// time is in format "HH:MM:SS"
	const [hours, minutes] = time.split(":");
	const hour = Number.parseInt(hours || "00", 10);
	const minute = minutes;

	// Convert to 12-hour format
	const period = hour >= 12 ? "PM" : "AM";
	let displayHour: number;
	if (hour === 0) displayHour = 12;
	else if (hour > 12) displayHour = hour - 12;
	else displayHour = hour;

	return `${displayHour}:${minute} ${period}`;
}
