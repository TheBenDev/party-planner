import { UserRole } from "@planner/enums/user";
import { useNavigate } from "@tanstack/react-router";
import { CalendarDays, Plus, Search } from "lucide-react";
import { useState } from "react";
import { CreateSessionDialog } from "@/features/sessions/components/CreateSessionDialog";
import { EditSeriesDialog } from "@/features/sessions/components/EditSeriesDialog";
import { SeriesGroup } from "@/features/sessions/components/SeriesGroup";
import { SessionRow } from "@/features/sessions/components/SessionRow";
import { useSessionsData } from "@/features/sessions/hooks/useSessionsData";

import { Button } from "@/shared/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useAuth } from "@/shared/hooks/auth";

function SessionCardSkeleton() {
	return (
		<div className="flex items-center gap-3 px-4 py-3.5 border rounded-xl">
			<Skeleton className="w-10 h-10 rounded-full shrink-0" />
			<div className="flex-1 space-y-2">
				<Skeleton className="h-4 w-36" />
				<Skeleton className="h-3 w-56" />
			</div>
			<Skeleton className="h-8 w-8 rounded-md" />
		</div>
	);
}

export function SessionsPage() {
	const { campaign, role } = useAuth();
	const isDm = role === UserRole.DUNGEON_MASTER;
	const navigate = useNavigate();
	const [search, setSearch] = useState("");
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const [createMode, setCreateMode] = useState<"oneoff" | "series">("oneoff");
	const [editSeriesId, setEditSeriesId] = useState<string | null>(null);

	const {
		oneOffSessionsQuery,
		seriesQuery,
		deleteSession,
		createSession,
		createSeries,
		updateSeries,
		removeSeries,
		removeSeriesException,
		endSeries,
		scheduleNext,
		excludeFromSeries,
		isCreatingSession,
		isCreatingSeries,
		isUpdatingSeries,
	} = useSessionsData();

	const { data: oneOffData = { sessions: [] }, isLoading: loadingSessions } =
		oneOffSessionsQuery;
	const { data: seriesData = { series: [] }, isLoading: loadingSeries } =
		seriesQuery;
	const isLoading = loadingSessions || loadingSeries;

	const q = search.toLowerCase();

	const filteredSeries = seriesData.series.filter((s) => {
		if (!q) return true;
		if (s.series.title.toLowerCase().includes(q)) return true;
		return s.sessions.some(
			(sess) =>
				sess.title.toLowerCase().includes(q) ||
				sess.description?.toLowerCase().includes(q),
		);
	});

	const filteredOneOffs = oneOffData.sessions.filter((s) => {
		if (!q) return true;
		return (
			s.title.toLowerCase().includes(q) ||
			s.description?.toLowerCase().includes(q)
		);
	});

	const totalSessions =
		oneOffData.sessions.length +
		seriesData.series.reduce((sum, s) => sum + s.sessions.length, 0);

	const editingSeries = editSeriesId
		? (seriesData.series.find((s) => s.series.id === editSeriesId)?.series ??
			null)
		: null;

	if (!campaign) {
		return (
			<div className="flex flex-col space-x-3 justify-center items-center">
				<span>Campaign Missing</span>
				<Button onClick={() => navigate({ to: "/campaign/create" })}>
					Create new Campaign
				</Button>
			</div>
		);
	}

	return (
		<div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">Sessions</h1>
					{!isLoading && (
						<p className="text-sm text-muted-foreground mt-0.5">
							{totalSessions} session{totalSessions !== 1 ? "s" : ""} in this
							campaign
						</p>
					)}
				</div>
				{isDm && (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button className="shrink-0">
								<Plus className="w-4 h-4 mr-2" />
								New Session
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-44">
							<DropdownMenuItem
								onClick={() => {
									setCreateMode("oneoff");
									setCreateDialogOpen(true);
								}}
							>
								One-off session
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() => {
									setCreateMode("series");
									setCreateDialogOpen(true);
								}}
							>
								Recurring series
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				)}
			</div>

			<div className="relative">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
				<Input
					className="pl-9"
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Search sessions..."
					value={search}
				/>
			</div>

			<div className="space-y-3">
				{isLoading &&
					Array.from({ length: 4 }).map((_, i) => (
						<SessionCardSkeleton key={i} />
					))}

				{!isLoading &&
					filteredSeries.map((s) => (
						<SeriesGroup
							exceptions={s.exceptions}
							isDm={isDm}
							key={s.series.id}
							onCancelOccurrence={(session) => {
								if (session.startsAt) {
									excludeFromSeries({
										excludedDate: new Date(session.startsAt),
										seriesId: s.series.id,
										sessionId: session.id,
									});
								}
							}}
							onDeleteSession={deleteSession}
							onEditSeries={() => setEditSeriesId(s.series.id)}
							onEditSession={(id) =>
								navigate({
									params: { sessionId: id },
									to: "/campaign/sessions/$sessionId/edit",
								})
							}
							onEndSeries={() => endSeries(s.series.id)}
							onRecapSession={(id) =>
								navigate({
									params: { sessionId: id },
									to: "/campaign/sessions/$sessionId/edit",
								})
							}
							onRemoveException={(date) =>
								removeSeriesException({
									excludedDate: date,
									seriesId: s.series.id,
								})
							}
							onRemoveSeries={() => removeSeries(s.series.id)}
							onScheduleNext={(startsAt) =>
								scheduleNext({
									seriesId: s.series.id,
									startsAt,
									title: s.series.title,
								})
							}
							onViewSession={(id) =>
								navigate({
									params: { sessionId: id },
									to: "/campaign/sessions/$sessionId",
								})
							}
							series={s.series}
							sessions={s.sessions}
						/>
					))}

				{!isLoading && filteredOneOffs.length > 0 && (
					<div className="space-y-2">
						{filteredSeries.length > 0 && (
							<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1 pt-1">
								One-off Sessions
							</p>
						)}
						{filteredOneOffs.map((s) => (
							<div className="border rounded-xl overflow-hidden" key={s.id}>
								<SessionRow
									isDm={isDm}
									onDelete={() => deleteSession(s.id)}
									onEdit={() =>
										navigate({
											params: { sessionId: s.id },
											to: "/campaign/sessions/$sessionId/edit",
										})
									}
									onRecap={() =>
										navigate({
											params: { sessionId: s.id },
											to: "/campaign/sessions/$sessionId/edit",
										})
									}
									onView={() =>
										navigate({
											params: { sessionId: s.id },
											to: "/campaign/sessions/$sessionId",
										})
									}
									session={s}
								/>
							</div>
						))}
					</div>
				)}

				{!isLoading &&
					filteredSeries.length === 0 &&
					filteredOneOffs.length === 0 && (
						<div className="flex flex-col items-center justify-center py-20 text-center">
							<div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
								<CalendarDays className="w-7 h-7 text-muted-foreground" />
							</div>
							{search ? (
								<>
									<p className="font-medium">No sessions match "{search}"</p>
									<p className="text-sm text-muted-foreground mt-1">
										Try a different search term.
									</p>
								</>
							) : (
								<>
									<p className="font-medium">No sessions yet</p>
									{isDm && (
										<>
											<p className="text-sm text-muted-foreground mt-1">
												Add your first session to get started.
											</p>
											<Button
												className="mt-4"
												disabled={isCreatingSession}
												onClick={() => {
													setCreateMode("oneoff");
													setCreateDialogOpen(true);
												}}
												size="sm"
												variant="outline"
											>
												<Plus className="w-4 h-4 mr-1.5" />
												Create Session
											</Button>
										</>
									)}
								</>
							)}
						</div>
					)}
			</div>

			<CreateSessionDialog
				isCreatingOneOff={isCreatingSession}
				isCreatingSeries={isCreatingSeries}
				mode={createMode}
				onClose={() => setCreateDialogOpen(false)}
				onCreateOneOff={createSession}
				onCreateSeries={createSeries}
				onModeChange={setCreateMode}
				open={createDialogOpen}
			/>

			{editingSeries && (
				<EditSeriesDialog
					isUpdating={isUpdatingSeries}
					onClose={() => setEditSeriesId(null)}
					onSave={(input) =>
						updateSeries(
							{ id: editingSeries.id, ...input },
							{ onSuccess: () => setEditSeriesId(null) },
						)
					}
					series={editingSeries}
				/>
			)}
		</div>
	);
}
