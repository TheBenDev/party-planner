import { useSuspenseQuery } from "@tanstack/react-query";
import {
	Ban,
	CheckCircle2,
	ChevronDown,
	MoreHorizontal,
	Repeat2,
	RotateCcw,
} from "lucide-react";
import { Component, type ReactNode, Suspense, useMemo, useState } from "react";
import type { Session, SessionSeries } from "@/features/sessions/types";
import { Button } from "@/shared/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { client } from "@/shared/lib/client";
import { cn } from "@/shared/lib/utils";
import { SessionRow } from "./SessionRow";
import { formatSessionDate, rruleToHuman } from "./session-utils";

type SeriesItem =
	| { type: "session"; data: Session; date: Date | null }
	| { type: "exception"; date: Date };

class DiscordEventErrorBoundary extends Component<
	{ children: ReactNode; fallback: ReactNode },
	{ hasError: boolean }
> {
	constructor(props: { children: ReactNode; fallback: ReactNode }) {
		super(props);
		this.state = { hasError: false };
	}
	static getDerivedStateFromError() {
		return { hasError: true };
	}
	render() {
		if (this.state.hasError) return this.props.fallback;
		return this.props.children;
	}
}

function DiscordEventVerified({
	seriesId,
	discordEventId,
}: {
	seriesId: string;
	discordEventId: string;
}) {
	useSuspenseQuery({
		queryFn: () =>
			client.sessionSeries.getDiscordEvent({ discordEventId, seriesId }),
		queryKey: ["discord-event", seriesId, discordEventId],
		retry: false,
		staleTime: 60_000,
	});
	return (
		<span className="text-xs text-muted-foreground italic flex items-center gap-1.5">
			<CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
			Announced to Discord
		</span>
	);
}

export function SeriesGroup({
	series,
	sessions,
	exceptions,
	isAnnouncingToDiscord,
	isDm,
	onAddToGoogleCalendar,
	onRemoveFromGoogleCalendar,
	onViewSession,
	onEditSession,
	onDeleteSession,
	onCancelOccurrence,
	onEditSeries,
	onEndSeries,
	onRemoveSeries,
	onRemoveException,
	onAnnounceToDiscord,
	onRecapSession,
}: {
	series: SessionSeries;
	sessions: Session[];
	exceptions: Date[];
	isDm: boolean;
	isAnnouncingToDiscord: boolean;
	onAddToGoogleCalendar: (seriesId: string) => void;
	onRemoveFromGoogleCalendar: (seriesId: string) => void;
	onViewSession: (id: string) => void;
	onEditSession: (id: string) => void;
	onDeleteSession: (id: string) => void;
	onCancelOccurrence: (session: Session) => void;
	onEditSeries: () => void;
	onEndSeries: () => void;
	onRemoveSeries: () => void;
	onRemoveException: (date: Date) => void;
	onAnnounceToDiscord: () => void;
	onRecapSession: (id: string) => void;
}) {
	const [expanded, setExpanded] = useState(true);
	const now = new Date();

	const merged = useMemo((): SeriesItem[] => {
		const items: SeriesItem[] = [
			...sessions.map((s) => ({
				data: s,
				date: s.startsAt ? new Date(s.startsAt) : null,
				type: "session" as const,
			})),
			...exceptions.map((e) => ({
				date: e,
				type: "exception" as const,
			})),
		];
		return items.sort((a, b) => {
			if (!b.date) return 1;
			if (!a.date) return -1;
			return b.date.getTime() - a.date.getTime();
		});
	}, [sessions, exceptions]);

	const announceButton = (
		<Button
			className="h-8 text-sm"
			disabled={isAnnouncingToDiscord}
			onClick={onAnnounceToDiscord}
			size="sm"
			variant="outline"
		>
			Announce to Discord
		</Button>
	);

	return (
		<div className="border rounded-xl overflow-hidden">
			<div className="flex items-center gap-3 px-4 py-3 bg-muted/30">
				<button
					className="flex-1 flex items-center gap-3 text-left min-w-0"
					onClick={() => setExpanded((expandedState) => !expandedState)}
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
							{series.rrule
								? rruleToHuman(
										series.rrule,
										series.startTime,
										series.seriesStartDate,
									)
								: "One-off session"}{" "}
							&middot; {sessions.length} session
							{sessions.length !== 1 ? "s" : ""}
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
							<DropdownMenuItem className="text-xs" onClick={onEditSeries}>
								Edit series
							</DropdownMenuItem>
							<DropdownMenuItem className="text-xs" onClick={onEndSeries}>
								End series
							</DropdownMenuItem>
							{series.googleCalendarEventId ? (
								<DropdownMenuItem
									className="text-xs"
									onClick={() => onRemoveFromGoogleCalendar(series.id)}
								>
									Remove from Google Calendar
								</DropdownMenuItem>
							) : (
								<DropdownMenuItem
									className="text-xs"
									onClick={() => onAddToGoogleCalendar(series.id)}
								>
									Add to Google Calendar
								</DropdownMenuItem>
							)}
							<DropdownMenuSeparator />
							<DropdownMenuItem
								className="text-destructive focus:text-destructive text-xs"
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
					{merged.length === 0 ? (
						<p className="px-6 py-3 text-xs text-muted-foreground italic">
							No sessions yet.
						</p>
					) : (
						merged.map((item) => {
							if (item.type === "session") {
								return (
									<SessionRow
										indented
										isDm={isDm}
										isSeriesSession
										key={item.data.id}
										onCancelOccurrence={() => onCancelOccurrence(item.data)}
										onDelete={() => onDeleteSession(item.data.id)}
										onEdit={() => onEditSession(item.data.id)}
										onRecap={() => onRecapSession(item.data.id)}
										onView={() => onViewSession(item.data.id)}
										session={item.data}
									/>
								);
							}
							const isFuture = item.date > now;
							return (
								<div
									className="flex items-center gap-3 pl-10 pr-4 py-3"
									key={item.date.toISOString()}
								>
									<div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
										<Ban className="w-4 h-4 text-muted-foreground/60" />
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-sm text-muted-foreground line-through">
											{formatSessionDate(item.date)}
										</p>
										<p className="text-xs text-muted-foreground/70">
											Cancelled occurrence
										</p>
									</div>
									{isDm && isFuture && (
										<Button
											className="h-7 text-xs shrink-0"
											onClick={() => onRemoveException(item.date)}
											size="sm"
											variant="ghost"
										>
											<RotateCcw className="w-3.5 h-3.5 mr-1" />
											Restore
										</Button>
									)}
								</div>
							);
						})
					)}

					{isDm && (
						<div className="flex items-center justify-end px-4 py-3 bg-muted/20">
							{series.discordEventId ? (
								<DiscordEventErrorBoundary
									fallback={announceButton}
									key={series.discordEventId}
								>
									<Suspense fallback={<Skeleton className="h-5 w-40" />}>
										<DiscordEventVerified
											discordEventId={series.discordEventId}
											seriesId={series.id}
										/>
									</Suspense>
								</DiscordEventErrorBoundary>
							) : (
								announceButton
							)}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
