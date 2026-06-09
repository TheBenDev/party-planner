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

export function parseRrule(rrule: string): {
	biWeekly: boolean;
	days: Set<string>;
} {
	const parts: Record<string, string> = {};
	for (const seg of rrule.split(";")) {
		const [k, v] = seg.split("=");
		if (k && v) parts[k] = v;
	}

	let byDay: Set<string>;
	if (parts.BYDAY?.includes(","))
		byDay = new Set(parts.BYDAY.split(",").filter(Boolean));
	else if (parts.BYDAY) byDay = new Set([parts.BYDAY]);
	else byDay = new Set();
	return {
		biWeekly: Number.parseInt(parts.INTERVAL ?? "1", 10) >= 2,
		days: byDay,
	};
}

export function formatStartTime(startTime: string): string {
	const [h, m] = startTime.split(":");
	const hour = Number.parseInt(h ?? "0", 10);
	const period = hour >= 12 ? "PM" : "AM";
	let display = hour;
	if (hour > 12) display = hour - 12;
	else if (hour === 0) display = 12;
	return `${display}:${m ?? "00"} ${period}`;
}

export function localTimeToUtc(localTime: string, sessionDate: Date): string {
	const [hStr, mStr] = localTime.split(":");
	const h = Number(hStr ?? "0");
	const m = Number(mStr ?? "0");
	const d = new Date(sessionDate);
	d.setHours(h, m, 0, 0);
	return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

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

export function rruleToHuman(
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

export function formatDateTime(date: Date | string | null | undefined): string {
	if (!date) return "";
	const d = typeof date === "string" ? new Date(date) : date;
	const datePart = d.toLocaleDateString("en-US", {
		day: "numeric",
		month: "short",
	});
	const h = d.getHours();
	const m = d.getMinutes();
	const period = h >= 12 ? "PM" : "AM";
	let display = h;
	if (h > 12) display = h - 12;
	else if (h === 0) display = 12;
	return `${datePart} at ${display}:${String(m).padStart(2, "0")} ${period}`;
}

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

const DAY_OF_WEEK: Record<string, number> = {
	FR: 5,
	MO: 1,
	SA: 6,
	SU: 0,
	TH: 4,
	TU: 2,
	WE: 3,
};

export function getNextOccurrence(
	series: {
		rrule: string;
		startTime: string;
		seriesStartDate: Date | string;
		seriesEndDate?: Date | string;
	},
	exceptions: Date[] = [],
): Date | null {
	const { biWeekly, days } = parseRrule(series.rrule);
	if (days.size === 0) return null;

	const targetDows = Array.from(days)
		.map((d) => DAY_OF_WEEK[d.trim().toUpperCase()] ?? -1)
		.filter((n) => n >= 0);
	if (targetDows.length === 0) return null;

	const seriesStart = new Date(series.seriesStartDate);
	const now = new Date();
	const searchFrom = now > seriesStart ? now : seriesStart;

	const toLocalDateKey = (d: Date) =>
		`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
	const exceptionKeys = new Set(exceptions.map(toLocalDateKey));

	// Extend window when exceptions exist; 90 days covers ~6 months of weekly sessions
	const maxDays = exceptions.length > 0 ? 90 : 21;

	for (let i = 0; i <= maxDays; i++) {
		const candidate = new Date(searchFrom);
		candidate.setDate(candidate.getDate() + i);

		if (!targetDows.includes(candidate.getDay())) continue;

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

export function toDateInputValue(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}
