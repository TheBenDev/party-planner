import { Status } from "@planner/enums/session";
import { UserRole } from "@planner/enums/user";
import type { Session } from "@/features/sessions/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { CalendarDays, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
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
import { client } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/query-keys";
import type {
	CreateOneOffInput,
	CreateSeriesInput,
} from "@/features/sessions/components/CreateSessionDialog";
import { CreateSessionDialog } from "@/features/sessions/components/CreateSessionDialog";
import { EditSeriesDialog } from "@/features/sessions/components/EditSeriesDialog";
import { SeriesGroup } from "@/features/sessions/components/SeriesGroup";
import { SessionRow } from "@/features/sessions/components/SessionRow";

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
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const [createMode, setCreateMode] = useState<"oneoff" | "series">("oneoff");
	const [editSeriesId, setEditSeriesId] = useState<string | null>(null);

	const campaignId = campaign?.campaign.id ?? "";

	const { data: sessionsData = { sessions: [] }, isLoading: loadingSessions } =
		useQuery({
			enabled: Boolean(campaign),
			queryFn: () => {
				if (!campaign) throw new Error("campaign required");
				return client.session.listSessions({
					campaignId: campaign.campaign.id,
				});
			},
			queryKey: queryKeys.sessions.list(campaignId),
		});

	const { data: seriesData = { series: [] }, isLoading: loadingSeries } =
		useQuery({
			enabled: Boolean(campaign),
			queryFn: () => {
				if (!campaign) throw new Error("campaign required");
				return client.sessionSeries.listSessionSeriesByCampaign({
					campaignId: campaign.campaign.id,
				});
			},
			queryKey: queryKeys.sessionSeries.list(campaignId),
		});

	const isLoading = loadingSessions || loadingSeries;

	const { mutate: deleteSession } = useMutation({
		mutationFn: (id: string) => client.session.removeSession({ id }),
		onError: () => toast.error("Failed to delete session"),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: queryKeys.sessions.list(campaignId),
			});
		},
	});

	const { mutate: createSession, isPending: creatingSession } = useMutation({
		mutationFn: (input: CreateOneOffInput) => {
			if (!campaign) throw new Error("campaign required");
			return client.session.createSession({
				campaignId: campaign.campaign.id,
				description: input.description,
				startsAt: input.startsAt,
        status: Status.DRAFT,
				title: input.title,
			});
		},
		onError: () => toast.error("Failed to create session"),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: queryKeys.sessions.list(campaignId),
			});
			toast.success("Session created");
		},
	});

	const { mutate: createSeries, isPending: creatingSeries } = useMutation({
		mutationFn: (input: CreateSeriesInput) => {
			if (!campaign) throw new Error("campaign required");
			return client.sessionSeries.createSessionSeries({
				campaignId: campaign.campaign.id,
				...input,
			});
		},
		onError: () => toast.error("Failed to create series"),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: queryKeys.sessionSeries.list(campaignId),
			});
			await queryClient.invalidateQueries({
				queryKey: queryKeys.sessions.list(campaignId),
			});
			toast.success("Series created");
		},
	});

	const { mutate: updateSeries, isPending: updatingSeries } = useMutation({
		mutationFn: (input: {
			id: string;
			title?: string;
			description?: string;
			rrule?: string;
			startTime?: string;
			timezone?: string;
			seriesEndDate?: Date;
		}) => client.sessionSeries.updateSessionSeries(input),
		onError: () => toast.error("Failed to update series"),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: queryKeys.sessionSeries.list(campaignId),
			});
			toast.success("Series updated");
			setEditSeriesId(null);
		},
	});

	const { mutate: removeSeries } = useMutation({
		mutationFn: (id: string) =>
			client.sessionSeries.removeSessionSeries({ id }),
		onError: () => toast.error("Failed to remove series"),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: queryKeys.sessionSeries.list(campaignId),
			});
			await queryClient.invalidateQueries({
				queryKey: queryKeys.sessions.list(campaignId),
			});
			toast.success("Series removed");
		},
	});

	const { mutate: endSeries } = useMutation({
		mutationFn: (id: string) =>
			client.sessionSeries.updateSessionSeries({
				id,
				seriesEndDate: new Date(),
			}),
		onError: () => toast.error("Failed to end series"),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: queryKeys.sessionSeries.list(campaignId),
			});
			toast.success("Series ended");
		},
	});

	const { mutate: scheduleNext } = useMutation({
		mutationFn: (input: { seriesId: string; title: string; startsAt: Date }) => {
			if (!campaign) throw new Error("campaign required");
			return client.session.createSession({
				campaignId: campaign.campaign.id,
				originalStartsAt: input.startsAt,
				seriesId: input.seriesId,
				startsAt: input.startsAt,
				status: Status.CONFIRMED,
				title: input.title,
			});
		},
		onError: () => toast.error("Failed to schedule session"),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: queryKeys.sessions.list(campaignId),
			});
			toast.success("Session scheduled");
		},
	});

	const { mutate: addException } = useMutation({
		mutationFn: (input: { seriesId: string; excludedDate: Date }) =>
			client.sessionSeries.addSeriesException(input),
		onError: () => toast.error("Failed to cancel occurrence"),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: queryKeys.sessions.list(campaignId),
			});
			toast.success("Occurrence cancelled");
		},
	});

	const seriesMap = useMemo(
		() => new Map(seriesData.series.map((s) => [s.id, s])),
		[seriesData.series],
	);

	const { sessionsBySeriesId, oneOffSessions } = useMemo(() => {
		const map = new Map<string, Session[]>();
		const oneOff: Session[] = [];
		for (const session of sessionsData.sessions) {
			if (session.seriesId && seriesMap.has(session.seriesId)) {
				const list = map.get(session.seriesId) ?? [];
				list.push(session);
				map.set(session.seriesId, list);
			} else {
				oneOff.push(session);
			}
		}
		return { oneOffSessions: oneOff, sessionsBySeriesId: map };
	}, [sessionsData.sessions, seriesMap]);

	const q = search.toLowerCase();

	const filteredSeries = seriesData.series.filter((s) => {
		if (!q) return true;
		if (s.title.toLowerCase().includes(q)) return true;
		return (sessionsBySeriesId.get(s.id) ?? []).some(
			(sess) =>
				sess.title.toLowerCase().includes(q) ||
				sess.description?.toLowerCase().includes(q),
		);
	});

	const filteredOneOffs = oneOffSessions.filter((s) => {
		if (!q) return true;
		return (
			s.title.toLowerCase().includes(q) ||
			s.description?.toLowerCase().includes(q)
		);
	});

	const totalSessions = sessionsData.sessions.length;
	const editingSeries = editSeriesId ? seriesMap.get(editSeriesId) : null;

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
							isDm={isDm}
							key={s.id}
							onCancelOccurrence={(session) => {
								if (session.startsAt) {
									addException({
										excludedDate: new Date(session.startsAt),
										seriesId: s.id,
									});
								}
							}}
							onDeleteSession={deleteSession}
							onEditSeries={() => setEditSeriesId(s.id)}
							onEditSession={(id) =>
								navigate({
									params: { sessionId: id },
									to: "/campaign/sessions/$sessionId/edit",
								})
							}
							onEndSeries={() => endSeries(s.id)}
							onRemoveSeries={() => removeSeries(s.id)}
							onScheduleNext={(startsAt) =>
								scheduleNext({ seriesId: s.id, startsAt, title: s.title })
							}
							onViewSession={(id) =>
								navigate({
									params: { sessionId: id },
									to: "/campaign/sessions/$sessionId",
								})
							}
							series={s}
							sessions={sessionsBySeriesId.get(s.id) ?? []}
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
												disabled={creatingSession}
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
				isCreatingOneOff={creatingSession}
				isCreatingSeries={creatingSeries}
				mode={createMode}
				onClose={() => setCreateDialogOpen(false)}
				onCreateOneOff={createSession}
				onCreateSeries={createSeries}
				onModeChange={setCreateMode}
				open={createDialogOpen}
			/>

			{editingSeries && (
				<EditSeriesDialog
					isUpdating={updatingSeries}
					onClose={() => setEditSeriesId(null)}
					onSave={(input) =>
						updateSeries({ id: editingSeries.id, ...input })
					}
					series={editingSeries}
				/>
			)}
		</div>
	);
}
