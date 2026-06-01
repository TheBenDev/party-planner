import type { SessionSeries } from "@planner/schemas/sessionSeries";
import type { Session } from "@planner/schemas/sessions";
import { ChevronDown, MoreHorizontal, Plus, Repeat2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatSessionDate, getNextOccurrence, rruleToHuman } from "./session-utils";
import { SessionRow } from "./SessionRow";

export function SeriesGroup({
	series,
	sessions,
	isDm,
	onViewSession,
	onEditSession,
	onDeleteSession,
	onCancelOccurrence,
	onEditSeries,
	onEndSeries,
	onRemoveSeries,
	onScheduleNext,
}: {
	series: SessionSeries;
	sessions: Session[];
	isDm: boolean;
	onViewSession: (id: string) => void;
	onEditSession: (id: string) => void;
	onDeleteSession: (id: string) => void;
	onCancelOccurrence: (session: Session) => void;
	onEditSeries: () => void;
	onEndSeries: () => void;
	onRemoveSeries: () => void;
	onScheduleNext: (startsAt: Date) => void;
}) {
	const [expanded, setExpanded] = useState(true);

	const hasUpcoming = sessions.some(
		(s) => s.startsAt && new Date(s.startsAt) > new Date(),
	);

	const nextOccurrence = useMemo(
		() => (hasUpcoming ? null : getNextOccurrence(series)),
		[hasUpcoming, series],
	);

	const sorted = useMemo(
		() =>
			[...sessions].sort((a, b) => {
				if (!a.startsAt) return 1;
				if (!b.startsAt) return -1;
				return (
					new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime()
				);
			}),
		[sessions],
	);

	return (
		<div className="border rounded-xl overflow-hidden">
			<div className="flex items-center gap-3 px-4 py-3 bg-muted/30">
				<button
					className="flex-1 flex items-center gap-3 text-left min-w-0"
					onClick={() => setExpanded((v) => !v)}
					type="button"
				>
					<div className="w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center shrink-0">
						<Repeat2 className="w-4 h-4 text-violet-700 dark:text-violet-300" />
					</div>
					<div className="min-w-0 flex-1">
						<p className="font-medium text-sm leading-tight truncate">
							{series.title}
						</p>
						<p className="text-xs text-muted-foreground mt-0.5 truncate">
							{rruleToHuman(series.rrule, series.startTime)} &middot;{" "}
							{sessions.length} session{sessions.length !== 1 ? "s" : ""}
						</p>
					</div>
					<ChevronDown
						className={cn(
							"w-4 h-4 text-muted-foreground shrink-0 transition-transform",
							!expanded && "-rotate-90",
						)}
					/>
				</button>

				{isDm && (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button
								className="inline-flex items-center justify-center rounded-lg h-8 w-8 hover:bg-accent shrink-0"
								onClick={(e) => e.stopPropagation()}
								type="button"
							>
								<MoreHorizontal className="w-4 h-4" />
								<span className="sr-only">Series options</span>
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-44">
							<DropdownMenuItem onClick={onEditSeries}>
								Edit series
							</DropdownMenuItem>
							<DropdownMenuItem onClick={onEndSeries}>
								End series
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								className="text-destructive focus:text-destructive"
								onClick={onRemoveSeries}
							>
								Remove series
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				)}
			</div>

			{expanded && (
				<div className="divide-y">
					{sorted.length === 0 ? (
						<p className="px-6 py-3 text-xs text-muted-foreground italic">
							No sessions yet.
						</p>
					) : (
						sorted.map((s) => (
							<SessionRow
								indented
								isDm={isDm}
								isSeriesSession
								key={s.id}
								onCancelOccurrence={() => onCancelOccurrence(s)}
								onDelete={() => onDeleteSession(s.id)}
								onEdit={() => onEditSession(s.id)}
								onView={() => onViewSession(s.id)}
								session={s}
							/>
						))
					)}

					{isDm && !hasUpcoming && (
						<div className="flex flex-col items-end px-4 py-3 bg-muted/20">
							{nextOccurrence ? (
								<Button
									className="h-8 text-sm"
									onClick={() => onScheduleNext(nextOccurrence)}
									size="sm"
									variant="outline"
								>
									<Plus className="w-3.5 h-3.5 mr-1" />
									Set Time - {formatSessionDate(nextOccurrence)}
								</Button>
							) : (
								<p className="text-xs text-muted-foreground italic">
									No upcoming occurrences
								</p>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
