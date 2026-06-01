import { useState } from "react";
import { cn } from "@/lib/utils";
import {
	DAYS,
	DAY_FULL,
	DAY_SHORT,
	parseRrule,
} from "./session-utils";

export function RRuleBuilder({
	value,
	onChange,
}: {
	value: string;
	onChange: (v: string) => void;
}) {
	const [initial] = useState(() => parseRrule(value));
	const [biWeekly, setBiWeekly] = useState(initial.biWeekly);
	const [selectedDays, setSelectedDays] = useState<Set<string>>(initial.days);

	function build(days: Set<string>, bi: boolean) {
		if (days.size === 0) {
			onChange("");
			return;
		}
		const byday = Array.from(days).join(",");
		const interval = bi ? ";INTERVAL=2" : "";
		onChange(`FREQ=WEEKLY${interval};BYDAY=${byday}`);
	}

	function toggleDay(day: string) {
		const next = new Set(selectedDays);
		if (next.has(day)) next.delete(day);
		else next.add(day);
		setSelectedDays(next);
		build(next, biWeekly);
	}

	function handleFreq(bi: boolean) {
		setBiWeekly(bi);
		build(selectedDays, bi);
	}

	const orderedSelected = DAYS.filter((d) => selectedDays.has(d));
	const previewDays = orderedSelected.map((d) => DAY_FULL[d]).join(", ");

	return (
		<div className="space-y-3">
			<div className="space-y-1.5">
				<p className="text-xs font-medium text-muted-foreground">Frequency</p>
				<div className="flex gap-2">
					<button
						className={cn(
							"flex-1 rounded-lg border py-2 text-sm font-medium transition-colors",
							biWeekly
								? "text-muted-foreground hover:bg-muted" : "bg-primary text-primary-foreground border-transparent",
						)}
						onClick={() => handleFreq(false)}
						type="button"
					>
						Weekly
					</button>
					<button
						className={cn(
							"flex-1 rounded-lg border py-2 text-sm font-medium transition-colors",
							biWeekly
								? "bg-primary text-primary-foreground border-transparent"
								: "text-muted-foreground hover:bg-muted",
						)}
						onClick={() => handleFreq(true)}
						type="button"
					>
						Every 2 weeks
					</button>
				</div>
			</div>

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
					{biWeekly ? "Every other" : "Every"}{" "}
					<span className="font-medium text-foreground">{previewDays}</span>
				</div>
			) : (
				<p className="text-xs italic text-muted-foreground/60">
					Select at least one day
				</p>
			)}
		</div>
	);
}
