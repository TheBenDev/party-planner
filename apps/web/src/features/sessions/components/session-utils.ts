export const DAYS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] as const;

export const DAY_SHORT: Record<string, string> = {
	FR: "Fri",
	MO: "Mon",
	SA: "Sat",
	SU: "Sun",
	TH: "Thu",
	TU: "Tue",
	WE: "Wed",
};

export const DAY_FULL: Record<string, string> = {
	FR: "Friday",
	MO: "Monday",
	SA: "Saturday",
	SU: "Sunday",
	TH: "Thursday",
	TU: "Tuesday",
	WE: "Wednesday",
};

/**
*  Formats an rrule with sections BYDAY and INTERVAL
*
*  BYDAY must be "MO", "TU", "WE", "TH", "FR", "SA", or "SU"
*
*  INTERVAL "1" is weekly, "2"+ is biweekly
*
*  IE. FREQ=WEEKLY;BYDAY=FR -> {biWeekly: false, days: Set(["FR"])}
*/
export function parseRrule(rrule: string): {
	biWeekly: boolean;
	days: Set<string>;
} {
	const rruleParts: Record<string, string> = {};
	for (const segment of rrule.split(";")) {
		const [k, v] = segment.split("=");
		if (k && v) rruleParts[k] = v;
	}

	let byDay: Set<string>;
	if (rruleParts.BYDAY?.includes(","))
		byDay = new Set(rruleParts.BYDAY.split(",").filter(Boolean));
	else if (rruleParts.BYDAY) byDay = new Set([rruleParts.BYDAY]);
	else byDay = new Set();
	return {
		biWeekly: Number.parseInt(rruleParts.INTERVAL ?? "1", 10) >= 2,
		days: byDay,
	};
}

/**
 * "23:00:00" --> "11:00 PM"
 */
function formatStartTime(startTime: string): string {
	const [h, m] = startTime.split(":");
	const hour = Number.parseInt(h ?? "0", 10);
	const period = hour >= 12 ? "PM" : "AM";
	let display = hour;
	if (hour > 12) display = hour - 12;
	else if (hour === 0) display = 12;
	return `${display}:${m ?? "00"} ${period}`;
}

/**
 * "20:00", new Date("2026-07-04") --> "00:00" (UTC equivalent for EDT, UTC-4)
 */
export function localTimeToUtc(localTime: string, sessionDate: Date): string {
	const [hStr, mStr] = localTime.split(":");
	const h = Number(hStr ?? "0");
	const m = Number(mStr ?? "0");
	const d = new Date(sessionDate);
	d.setHours(h, m, 0, 0);
	return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

/**
 * "00:00", new Date("2026-07-04") --> "20:00" (local equivalent for EDT, UTC-4)
 */
export function utcTimeToLocal(utcTime: string, sessionDate: Date): string {
	const [hStr, mStr] = utcTime.split(":");
	const h = Number(hStr ?? "0");
	const m = Number(mStr ?? "0");
	const d = new Date(sessionDate);
	const utc = new Date(
		Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h, m),
	);
	return `${String(utc.getHours()).padStart(2, "0")}:${String(utc.getMinutes()).padStart(2, "0")}`;
}

/**
 * Takes in the details of a scheduled time and converts it to a descriptive string
 *
 * Date is used to find UTC - local time offset
 *
 * "FREQ=WEEKLY;BYDAY=MO", "20:00:00", new Date("2026-01-05") --> "Every Monday at 8:00 PM"
 *
 * "FREQ=WEEKLY;INTERVAL=2;BYDAY=FR", "19:00:00", new Date("2026-01-02") --> "Every other Friday at 7:00 PM"
 *
 * "FREQ=WEEKLY;BYDAY=MO,WE", "20:00:00", new Date("2026-01-05") --> "Every Monday, Wednesday at 8:00 PM"
 */
export function describeRrule(
	rrule: string,
	startTime: string,
	seriesDate: Date,
): string {
	const { biWeekly, days } = parseRrule(rrule);
	const dayNames = Array.from(days)
		.map((d) => DAY_FULL[d] ?? d)
		.join(", ");
	const prefix = biWeekly ? "Every other" : "Every";
	const localTime = utcTimeToLocal(startTime, seriesDate);
	const time = formatStartTime(localTime);
	return dayNames
		? `${prefix} ${dayNames} at ${time}`
		: `${prefix} week at ${time}`;
}


/**
 * new Date("2026-01-05T20:00:00") --> "Jan 5, 2026, 8:00 PM"
 */
export function formatSessionDate(
	date: Date | string | null | undefined,
): string {
	if (!date) return "No date set";
	const d = typeof date === "string" ? new Date(date) : date;
	return d.toLocaleString("en-US", {
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
		month: "short",
		year: "numeric",
	});
}

const toLocalDateKey = (d: Date) =>
	`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

const DAY_OF_WEEK: Record<string, number> = {
	FR: 5,
	MO: 1,
	SA: 6,
	SU: 0,
	TH: 4,
	TU: 2,
	WE: 3,
};

/**
 * Returns the next future Date the series is scheduled to occur, skipping exceptions.
 * Returns null if the series has ended, has no rrule, or no occurrence falls within the search window.
 *
 * { rrule: "FREQ=WEEKLY;BYDAY=FR", startTime: "19:00:00", seriesStartDate: new Date("2026-01-02") }, [] --> new Date("2026-06-26T19:00:00") (next upcoming Friday)
 */
export function getNextOccurrence(
	series: {
		rrule: string | null;
		startTime: string;
		seriesStartDate: Date | string;
		seriesEndDate?: Date | string;
	},
	exceptions: Date[] = [],
): Date | null {
	const { biWeekly, days } = parseRrule(series.rrule ?? "");
	if (days.size === 0) return null;

	const trackedDaysOfWeek = Array.from(days)
		.map((d) => DAY_OF_WEEK[d.trim().toUpperCase()] ?? -1)
		.filter((n) => n >= 0);
	if (trackedDaysOfWeek.length === 0) return null;

	const seriesStart = new Date(series.seriesStartDate);
	const now = new Date();
	const searchFrom = now > seriesStart ? now : seriesStart;

	const exceptionKeys = new Set(exceptions.map(toLocalDateKey));

	// Extend window when exceptions exist; 90 days covers ~6 months of weekly sessions
	const maxDays = exceptions.length > 0 ? 90 : 21;

	for (let i = 0; i <= maxDays; i++) {
		const candidate = new Date(searchFrom);
		candidate.setDate(candidate.getDate() + i);

		if (!trackedDaysOfWeek.includes(candidate.getDay())) continue;

		if (biWeekly) {
			const daysSinceStart = Math.floor(
				(candidate.getTime() - seriesStart.getTime()) / (24 * 60 * 60 * 1000),
			);
			if (Math.floor(daysSinceStart / 7) % 2 !== 0) continue;
		}

		if (exceptionKeys.has(toLocalDateKey(candidate))) continue;

		// Convert UTC time → local for this specific candidate date so DST is correct
		const [lhStr, lmStr] = utcTimeToLocal(series.startTime, candidate).split(
			":",
		);
		const localH = Number(lhStr ?? "0");
		const localM = Number(lmStr ?? "0");

		const result = new Date(
			candidate.getFullYear(),
			candidate.getMonth(),
			candidate.getDate(),
			localH,
			localM,
			0,
			0,
		);

		if (result <= now) continue;
		if (series.seriesEndDate && result > new Date(series.seriesEndDate))
			return null;

		return result;
	}

	return null;
}

/**
 * Returns the most recent past occurrence that has no session row yet, or null if up to date.
 * Only surfaces occurrences that have already passed — future occurrences are ignored.
 *
 * { series: { rrule: "FREQ=WEEKLY;BYDAY=FR", ... }, sessions: [], exceptions: [] } --> new Date("2026-06-20T19:00:00") (last Friday)
 * { series: { rrule: "FREQ=WEEKLY;BYDAY=FR", ... }, sessions: [{ startsAt: new Date("2026-06-20T19:00:00") }], exceptions: [] } --> null
 */
export function getNextUntrackedSession(details: {
	series: { rrule: string | null; startTime: string; seriesStartDate: Date | string; seriesEndDate?: Date | string };
	sessions: { startsAt: Date }[];
	exceptions: Date[];
}): Date | null {
	const { series, sessions, exceptions } = details;
	const { biWeekly, days } = parseRrule(series.rrule ?? "");
	if (days.size === 0) return null;

	const trackedDaysOfWeek = Array.from(days)
		.map((d) => DAY_OF_WEEK[d.trim().toUpperCase()] ?? -1)
		.filter((n) => n >= 0);
	if (trackedDaysOfWeek.length === 0) return null;

	const seriesStart = new Date(series.seriesStartDate);
	const now = new Date();
	const exceptionKeys = new Set(exceptions.map(toLocalDateKey));

	// Walk backward from today up to 90 days — covers biweekly + exception gaps
	for (let i = 0; i <= 90; i++) {
		const candidate = new Date(now);
		candidate.setDate(candidate.getDate() - i);

		if (candidate < seriesStart) break;
		if (!trackedDaysOfWeek.includes(candidate.getDay())) continue;

		if (biWeekly) {
			const daysSinceStart = Math.floor(
				(candidate.getTime() - seriesStart.getTime()) / (24 * 60 * 60 * 1000),
			);
			if (Math.floor(daysSinceStart / 7) % 2 !== 0) continue;
		}

		if (exceptionKeys.has(toLocalDateKey(candidate))) continue;

		const [lhStr, lmStr] = utcTimeToLocal(series.startTime, candidate).split(":");
		const result = new Date(
			candidate.getFullYear(),
			candidate.getMonth(),
			candidate.getDate(),
			Number(lhStr ?? "0"),
			Number(lmStr ?? "0"),
			0,
			0,
		);

		if (result >= now) continue;
		if (series.seriesEndDate && result > new Date(series.seriesEndDate)) continue;

		const resultKey = toLocalDateKey(result);
		const alreadyTracked = sessions.some(
			(session) => toLocalDateKey(new Date(session.startsAt)) === resultKey,
		);
		if (alreadyTracked) continue;
		return result;
	}

	return null;
}

/**
 * new Date("2026-01-05") --> "2026-01-05"
 */
export function toDateInputValue(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}
