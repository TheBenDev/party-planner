import { useState } from "react";
import { cn } from "@/shared/lib/utils";
import { DAY_FULL, DAY_SHORT, DAYS, parseRrule } from "./session-utils";

type Frequency = "WEEKLY" | "BIWEEKLY" | "ONE_OFF";

function deriveFrequency(value: string | null): Frequency {
	if (value === null) return "ONE_OFF";
	return parseRrule(value).biWeekly ? "BIWEEKLY" : "WEEKLY";
}

function buildRrule(days: Set<string>, frequency: Frequency): string | null {
	if (frequency === "ONE_OFF") return null;
	if (days.size === 0) return "";
	const byday = Array.from(days).join(",");
	const interval = frequency === "BIWEEKLY" ? ";INTERVAL=2" : "";
	return `FREQ=WEEKLY${interval};BYDAY=${byday}`;
}

export function RRuleBuilder({
	value,
	onChange,
}: {
	value: string | null;
	onChange: (v: string | null) => void;
}) {
	const [frequency, setFrequency] = useState<Frequency>(() =>
		deriveFrequency(value),
	);
	const [selectedDays, setSelectedDays] = useState<Set<string>>(
		() => parseRrule(value ?? "").days,
	);

	function handleFrequency(freq: Frequency) {
		setFrequency(freq);
		onChange(buildRrule(selectedDays, freq));
	}

	function toggleDay(day: string) {
		const next = new Set(selectedDays);
		if (next.has(day)) next.delete(day);
		else next.add(day);
		setSelectedDays(next);
		onChange(buildRrule(next, frequency));
	}

	const orderedSelected = DAYS.filter((d) => selectedDays.has(d));
	const previewDays = orderedSelected.map((d) => DAY_FULL[d]).join(", ");
	const FREQUENCY_OPTIONS = [
		{ label: "Weekly", value: "WEEKLY" },
		{ label: "Every 2 weeks", value: "BIWEEKLY" },
		{ label: "One-off", value: "ONE_OFF" },
	] as const;

	return (
		<div className="space-y-3">
			<div className="space-y-1.5">
				<p className="text-xs font-medium text-muted-foreground">Frequency</p>
				<div className="flex gap-2">
					{FREQUENCY_OPTIONS.map((option) => (
						<button
							className={cn(
								"flex-1 rounded-lg border py-2 text-sm font-medium transition-colors",
								frequency === option.value
									? "bg-primary text-primary-foreground border-transparent"
									: "text-muted-foreground hover:bg-muted",
							)}
							key={option.value}
							onClick={() => handleFrequency(option.value)}
							type="button"
						>
							{option.label}
						</button>
					))}
				</div>
			</div>

			{frequency !== "ONE_OFF" && (
				<>
					<div className="space-y-1.5">
						<p className="text-xs font-medium text-muted-foreground">Day(s)</p>
						<div className="grid grid-cols-7 gap-1">
							{DAYS.map((day) => (
								<button
									className={cn(
										"py-2 rounded-md border text-xs font-medium transition-colors",
										selectedDays.has(day)
											? "bg-primary text-primary-foreground border-primary"
											: "border-border text-muted-foreground hover:bg-muted",
									)}
									key={day}
									onClick={() => toggleDay(day)}
									title={DAY_FULL[day]}
									type="button"
								>
									{DAY_SHORT[day]}
								</button>
							))}
						</div>
					</div>

					{orderedSelected.length > 0 ? (
						<div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
							{frequency === "BIWEEKLY" ? "Every other" : "Every"}{" "}
							<span className="font-medium text-foreground">{previewDays}</span>
						</div>
					) : (
						<p className="text-xs italic text-muted-foreground/60">
							Select at least one day
						</p>
					)}
				</>
			)}
		</div>
	);
}
