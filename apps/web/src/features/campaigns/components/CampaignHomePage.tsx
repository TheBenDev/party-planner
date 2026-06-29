import { UserRole } from "@planner/enums/user";
import { Link } from "@tanstack/react-router";
import { CalendarDays, ChevronRight, Clock } from "lucide-react";
import { useSessionsData } from "@/features/sessions/hooks/useSessionsData";
import type { Session } from "@/features/sessions/types";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useAuth } from "@/shared/hooks/auth";

function formatDate(date: Date): string {
	return new Intl.DateTimeFormat("en-US", {
		day: "numeric",
		month: "long",
		weekday: "long",
		year: "numeric",
	}).format(date);
}

function formatTime(date: Date): string {
	return new Intl.DateTimeFormat("en-US", {
		hour: "numeric",
		hour12: true,
		minute: "2-digit",
	}).format(date);
}

function relativeLabel(date: Date): string {
	const diffDays = Math.ceil(
		(date.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
	);
	if (diffDays <= 0) return "Today";
	if (diffDays === 1) return "Tomorrow";
	if (diffDays < 7) return `In ${diffDays} days`;
	if (diffDays < 14) return "Next week";
	return `In ${Math.ceil(diffDays / 7)} weeks`;
}

function formatDuration(minutes: number | undefined): string | null {
	if (!minutes) return null;
	const hours = Math.floor(minutes / 60);
	const mins = minutes % 60;
	if (mins === 0) return `${hours}h`;
	return `${hours}h ${mins}m`;
}

function NextSessionCard({
	session,
	seriesTitle,
}: {
	session: Session;
	seriesTitle: string | undefined;
}) {
	const startsAt = new Date(session.startsAt);
	const duration = formatDuration(session.durationMinutes);

	return (
		<Link
			className="block border rounded-2xl p-6 hover:bg-muted/40 transition-colors group"
			params={{ sessionId: session.id }}
			to="/campaign/sessions/$sessionId"
		>
			<div className="flex items-start justify-between gap-4">
				<div className="space-y-1">
					<p className="text-xs font-medium text-primary">
						{relativeLabel(startsAt)}
					</p>
					<h3 className="text-xl font-semibold tracking-tight">
						{session.title}
					</h3>
					{seriesTitle && (
						<p className="text-sm text-muted-foreground">{seriesTitle}</p>
					)}
				</div>
				<ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 mt-1 group-hover:translate-x-0.5 transition-transform" />
			</div>
			<div className="flex flex-wrap items-center gap-4 mt-5 text-sm text-muted-foreground">
				<span className="flex items-center gap-1.5">
					<CalendarDays className="w-4 h-4" />
					{formatDate(startsAt)}
				</span>
				<span className="flex items-center gap-1.5">
					<Clock className="w-4 h-4" />
					{formatTime(startsAt)}
					{duration && (
						<span className="text-muted-foreground/60">· {duration}</span>
					)}
				</span>
			</div>
		</Link>
	);
}

function NoUpcomingSession({ isDm }: { isDm: boolean }) {
	return (
		<div className="border border-dashed rounded-2xl p-8 text-center text-muted-foreground">
			<CalendarDays className="w-8 h-8 mx-auto mb-3 opacity-40" />
			<p className="text-sm font-medium">No upcoming sessions</p>
			{isDm && (
				<p className="text-xs mt-1 opacity-70">
					Head to{" "}
					<Link
						className="underline hover:text-foreground transition-colors"
						to="/campaign/sessions"
					>
						Sessions
					</Link>{" "}
					to schedule one.
				</p>
			)}
		</div>
	);
}

function RecentSessionRow({ session }: { session: Session }) {
	return (
		<Link
			className="flex items-center justify-between px-4 py-3 border rounded-xl hover:bg-muted/40 transition-colors group"
			params={{ sessionId: session.id }}
			to="/campaign/sessions/$sessionId"
		>
			<div className="min-w-0">
				<p className="text-sm font-medium truncate">{session.title}</p>
				<p className="text-xs text-muted-foreground mt-0.5">
					{formatDate(new Date(session.startsAt))}
				</p>
			</div>
		</Link>
	);
}

export function CampaignHomePage() {
	const { role } = useAuth();
	const isDm = role === UserRole.DUNGEON_MASTER;
	const { seriesQuery, oneOffSessionsQuery } = useSessionsData();

	const isLoading = seriesQuery.isLoading || oneOffSessionsQuery.isLoading;
	const now = Date.now();

	const seriesMap = new Map(
		(seriesQuery.data?.series ?? []).map((s) => [s.series.id, s.series.title]),
	);

	const allSessions: Session[] = [
		...(seriesQuery.data?.series ?? []).flatMap((s) => s.sessions),
		...(oneOffSessionsQuery.data?.sessions ?? []),
	];

	const upcoming = allSessions
		.filter((s) => new Date(s.startsAt).getTime() > now)
		.sort(
			(a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
		);

	const recent = allSessions
		.filter((s) => new Date(s.startsAt).getTime() <= now)
		.sort(
			(a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
		)
		.slice(0, 4);

	const nextSession = upcoming[0] ?? null;

	if (isLoading) {
		return (
			<div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
				<Skeleton className="h-48 rounded-2xl" />
				<div className="space-y-3">
					{Array.from({ length: 3 }).map((_, i) => (
						<Skeleton className="h-16 rounded-xl" key={i} />
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
			<section>
				<h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">
					Next Session
				</h2>
				{nextSession ? (
					<NextSessionCard
						seriesTitle={
							nextSession.seriesId
								? seriesMap.get(nextSession.seriesId)
								: undefined
						}
						session={nextSession}
					/>
				) : (
					<NoUpcomingSession isDm={isDm} />
				)}
			</section>

			{recent.length > 0 && (
				<section>
					<div className="flex items-center justify-between mb-3">
						<h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
							Recent Sessions
						</h2>
						<Link
							className="text-xs text-muted-foreground hover:text-foreground transition-colors"
							to="/campaign/sessions"
						>
							View all
						</Link>
					</div>
					<div className="space-y-2">
						{recent.map((session) => (
							<RecentSessionRow key={session.id} session={session} />
						))}
					</div>
				</section>
			)}
		</div>
	);
}
