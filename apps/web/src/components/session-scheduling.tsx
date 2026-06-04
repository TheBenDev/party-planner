import { IntegrationSource } from "@planner/enums/integration";
import { Status } from "@planner/enums/session";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
	CalendarCheck,
	CalendarClock,
	Check,
	Plus,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { client } from "@/lib/client";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import { DateTimePicker } from "./date-time-picker";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "./ui/dialog";

// ----------------------------------------------------------------
// Types — swap these out for your generated proto/schema types
// ----------------------------------------------------------------

type Session = {
	id: string;
	status: Status;
	announcedAt?: Date | string | null;
	startsAt?: Date | string | null;
	campaignId: string;
	seriesId?: string | null;
	discordEventId?: string | null;
};

// ----------------------------------------------------------------
// Public component
// ----------------------------------------------------------------

type Props = {
	session: Session;
};

export function SessionScheduling({ session }: Props) {
	const { data } = useQuery({
		enabled: !!session.campaignId,
		queryFn: () =>
			client.campaignIntegration.getCampaignIntegration({
				campaignId: session.campaignId,
				source: IntegrationSource.DISCORD,
			}),
		queryKey: queryKeys.integrations.bySource(session.campaignId, IntegrationSource.DISCORD),
	});
	return (
		<div className="space-y-1.5">
			<h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
				Scheduling
			</h2>
			{renderState(session, !!data?.integration)}
		</div>
	);
}

// ----------------------------------------------------------------
// State router
// ----------------------------------------------------------------

function renderState(session: Session, hasDiscordIntegration: boolean) {
	switch (session.status) {
		case Status.DRAFT:
			return (
				<DraftState
					campaignId={session.campaignId}
					hasDiscordIntegration={hasDiscordIntegration}
					sessionId={session.id}
				/>
			);
		case Status.CONFIRMED:
			return (
				<ConfirmedState
					announcedAt={session.announcedAt}
					campaignId={session.campaignId}
					discordEventId={session.discordEventId}
					hasDiscordIntegration={hasDiscordIntegration}
					seriesId={session.seriesId}
					sessionId={session.id}
					startsAt={session.startsAt}
				/>
			);
		case Status.POLLING:
			return (
				<PollingState campaignId={session.campaignId} sessionId={session.id} />
			);
	}
}

// ----------------------------------------------------------------
// POLLING state
// ----------------------------------------------------------------

function parseAnswerDate(text: string): Date | undefined {
	const d = new Date(text);
	return Number.isNaN(d.getTime()) ? undefined : d;
}

type PollingStateProps = {
	sessionId: string;
	campaignId: string;
};

function PollingState({ sessionId, campaignId }: PollingStateProps) {
	const queryClient = useQueryClient();
	const { data, isLoading, isError } = useQuery({
		queryFn: () => client.session.getPoll({ campaignId, sessionId }),
		queryKey: queryKeys.sessions.poll(sessionId),
		refetchInterval: 60_000,
	});

	const confirmMutation = useMutation({
		mutationFn: (answerText: string) => {
			const startsAt = parseAnswerDate(answerText);
			if (!startsAt) throw new Error("could not parse startsAt.");
			return client.session.updateSession({
				id: sessionId,
				startsAt,
				status: Status.CONFIRMED,
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.sessions.detail(sessionId) });
		},
	});

	const isFinalized = data?.poll?.isFinalized ?? false;
	const answers = data?.poll?.answers ?? [];
	const maxVotes =
		answers.length > 0 ? Math.max(...answers.map((a) => a.voteCount)) : 0;

	return (
		<div className="rounded-lg border bg-card">
			<div className="px-4 py-4 flex items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					<div className="flex items-center justify-center size-9 rounded-md bg-muted shrink-0">
						<CalendarClock className="size-4 text-muted-foreground" />
					</div>
					<div className="space-y-0.5">
						<p className="text-sm font-medium leading-none">
							Availability poll in progress
						</p>
						<p className="text-xs text-muted-foreground">
							Waiting for the party to vote on Discord
						</p>
					</div>
				</div>
				<span
					className={cn(
						"text-xs font-medium px-2.5 py-1 rounded-full border",
						"bg-amber-500/10 text-amber-600 border-amber-500/20",
						"dark:text-amber-400 dark:bg-amber-500/15 dark:border-amber-500/25",
					)}
				>
					{data?.poll?.isFinalized ? "Poll closed" : "Polling"}
				</span>
			</div>

			<Separator />

			<div className="px-4 py-3 space-y-2">
				{isLoading && (
					<p className="text-xs text-muted-foreground">Loading poll results…</p>
				)}
				{isError && (
					<p className="text-xs text-destructive">
						Failed to load poll results.
					</p>
				)}
				{answers.map((answer, i) => (
					<PollAnswerRow
						answer={answer}
						isConfirming={confirmMutation.isPending}
						key={i}
						maxVotes={maxVotes}
						onConfirm={
							isFinalized ? (text) => confirmMutation.mutate(text) : undefined
						}
					/>
				))}
			</div>
		</div>
	);
}

// ----------------------------------------------------------------
// PollAnswerRow
// ----------------------------------------------------------------

type PollAnswerRowProps = {
	answer: { text: string; voteCount: number };
	maxVotes: number;
	onConfirm?: (text: string) => void;
	isConfirming?: boolean;
};

function PollAnswerRow({
	answer,
	maxVotes,
	onConfirm,
	isConfirming,
}: PollAnswerRowProps) {
	const pct = maxVotes > 0 ? (answer.voteCount / maxVotes) * 100 : 0;
	const isLeading = maxVotes > 0 && answer.voteCount === maxVotes;

	return (
		<div className="space-y-1">
			<div className="flex items-center justify-between text-xs">
				<span
					className={cn(
						"font-medium",
						isLeading ? "text-foreground" : "text-muted-foreground",
					)}
				>
					{answer.text}
				</span>
				<div className="flex items-center gap-2">
					<span className="tabular-nums text-muted-foreground">
						{answer.voteCount} {answer.voteCount === 1 ? "vote" : "votes"}
					</span>
					{onConfirm && (
						<Button
							disabled={isConfirming}
							onClick={() => onConfirm(answer.text)}
							size="sm"
							type="button"
							variant={isLeading ? "default" : "outline"}
						>
							{isConfirming ? "Confirming…" : "Confirm this date"}
						</Button>
					)}
				</div>
			</div>
			<div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
				<div
					className={cn(
						"h-full rounded-full transition-all duration-500",
						isLeading ? "bg-amber-500" : "bg-muted-foreground/30",
					)}
					style={{ width: `${pct}%` }}
				/>
			</div>
		</div>
	);
}

// ----------------------------------------------------------------
// DRAFT state
// ----------------------------------------------------------------

function DraftState({
	sessionId,
	campaignId,
	hasDiscordIntegration,
}: {
	hasDiscordIntegration: boolean;
	sessionId: string;
	campaignId: string;
}) {
	return (
		<div className="rounded-lg border border-dashed px-6 py-8 flex flex-col items-center gap-3 text-center">
			<div className="flex items-center justify-center size-10 rounded-full bg-muted">
				<CalendarClock className="size-5 text-muted-foreground" />
			</div>

			<div className="space-y-1">
				<p className="text-sm font-medium">No date proposed yet</p>
				<p className="text-sm text-muted-foreground">
					Start a poll to find a time that works for the party.
				</p>
			</div>

			<ProposeDatesDialog
				campaignId={campaignId}
				disabled={!hasDiscordIntegration}
				sessionId={sessionId}
			/>
		</div>
	);
}

// ----------------------------------------------------------------
// ProposeDatesDialog
// ----------------------------------------------------------------

export function ProposeDatesDialog({
	sessionId,
	campaignId,
	disabled = false,
}: {
	disabled: boolean;
	sessionId: string;
	campaignId: string;
}) {
	const [open, setOpen] = useState(false);
	const [options, setOptions] = useState<(Date | undefined)[]>([undefined]);
	const MAX_OPTIONS = 4;
	const queryClient = useQueryClient();

	const pollMutation = useMutation({
		mutationFn: () =>
			client.session.pollSession({
				campaignId,
				options: options.filter((d): d is Date => d !== undefined),
				sessionId,
			}),
		onSuccess: () => {
			setOpen(false);
			setOptions([undefined]);
			queryClient.invalidateQueries({ queryKey: queryKeys.sessions.detail(sessionId) });
		},
	});

	const filledOptions = options.filter((d) => d !== undefined);
	const canSubmit = filledOptions.length > 0 && !pollMutation.isPending;

	function handleAdd() {
		if (options.length < MAX_OPTIONS) {
			setOptions((prev) => [...prev, undefined]);
		}
	}

	function handleRemove(index: number) {
		setOptions((prev) => prev.filter((_, i) => i !== index));
	}

	function handleChange(index: number, date: Date | undefined) {
		setOptions((prev) => prev.map((d, i) => (i === index ? date : d)));
	}

	function handleOpenChange(next: boolean) {
		setOpen(next);
		if (!next) {
			setOptions([undefined]);
			pollMutation.reset();
		}
	}

	return (
		<Dialog onOpenChange={handleOpenChange} open={open}>
			<DialogTrigger asChild disabled={disabled}>
				<Button
					className="mt-1 gap-2 hover:cursor-pointer"
					disabled={disabled}
					size="sm"
					variant="outline"
				>
					<CalendarClock className="size-3.5" />
					Poll party availability
				</Button>
			</DialogTrigger>

			<DialogContent className="sm:max-w-[480px]">
				<DialogHeader>
					<DialogTitle>Propose dates</DialogTitle>
					<DialogDescription>
						Add up to {MAX_OPTIONS} options. The party will vote on Discord.
					</DialogDescription>
				</DialogHeader>

				<Separator />

				<div className="space-y-3 py-1">
					{options.map((date, index) => (
						<div className="flex items-center gap-2" key={index}>
							<span className="w-5 text-center text-xs font-medium text-muted-foreground shrink-0">
								{index + 1}
							</span>
							<div className="flex-1">
								<DateTimePicker
									onChange={(d) => handleChange(index, d)}
									value={date}
								/>
							</div>
							{options.length > 1 && (
								<Button
									className="shrink-0 text-muted-foreground hover:text-destructive"
									onClick={() => handleRemove(index)}
									size="icon"
									type="button"
									variant="ghost"
								>
									<Trash2 className="size-4" />
								</Button>
							)}
						</div>
					))}

					{options.length < MAX_OPTIONS && (
						<Button
							className="w-full gap-2 border-dashed"
							onClick={handleAdd}
							size="sm"
							type="button"
							variant="outline"
						>
							<Plus className="size-3.5" />
							Add option
						</Button>
					)}
				</div>

				{pollMutation.isError && (
					<p className="text-sm text-destructive">
						Failed to send poll. Please try again.
					</p>
				)}

				<Separator />

				<DialogFooter>
					<Button
						onClick={() => handleOpenChange(false)}
						type="button"
						variant="outline"
					>
						Cancel
					</Button>
					<Button
						disabled={!canSubmit}
						onClick={() => pollMutation.mutate()}
						type="button"
					>
						{pollMutation.isPending ? "Sending…" : "Send poll"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ----------------------------------------------------------------
// CONFIRMED state
// ----------------------------------------------------------------

type ConfirmedStateProps = {
	announcedAt?: Date | string | null;
	startsAt?: Date | string | null;
	sessionId: string;
	campaignId: string;
	hasDiscordIntegration: boolean;
	seriesId?: string | null;
	discordEventId?: string | null;
};

type DiscordActionProps = {
	isSeriesSession: boolean;
	hasDiscordEvent: boolean;
	announced: boolean;
	hasDiscordIntegration: boolean;
	announceMutation: { isPending: boolean; mutate: () => void };
};

function renderDiscordAction({
	isSeriesSession,
	hasDiscordEvent,
	announced,
	hasDiscordIntegration,
	announceMutation,
}: DiscordActionProps) {
	if (isSeriesSession) {
		if (!hasDiscordEvent) return null;
		return (
			<p className="text-xs text-muted-foreground flex items-center gap-1.5">
				<Check className="size-3.5 text-emerald-500" />
				Discord event scheduled
			</p>
		);
	}

	if (announced) {
		return (
			<p className="text-xs text-muted-foreground flex items-center gap-1.5">
				<Check className="size-3.5 text-emerald-500" />
				Announced on Discord
			</p>
		);
	}

	return (
		<Button
			className="gap-1.5"
			disabled={announceMutation.isPending || !hasDiscordIntegration}
			onClick={() => announceMutation.mutate()}
			size="sm"
			variant="outline"
		>
			Announce on Discord
		</Button>
	);
}

function toDate(value: Date | string | null | undefined): Date | undefined {
	if (!value) return undefined;
	const parsed = typeof value === "string" ? new Date(value) : value;
	return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function ConfirmedState({
	announcedAt,
	startsAt,
	campaignId,
	sessionId,
	hasDiscordIntegration,
	seriesId,
	discordEventId,
}: ConfirmedStateProps) {
	const queryClient = useQueryClient();
	const date = toDate(startsAt);
	const announced = !!announcedAt;
	const isSeriesSession = !!seriesId;
	const hasDiscordEvent = !!discordEventId;

	const announceMutation = useMutation({
		mutationFn: () => client.session.announceSession({ campaignId, sessionId }),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: queryKeys.sessions.detail(sessionId) }),
	});

	return (
		<div className="rounded-lg border bg-card">
			{/* Date display */}
			<div className="px-4 py-4 flex items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					<div className="flex items-center justify-center size-9 rounded-md bg-muted shrink-0">
						<CalendarCheck className="size-4 text-muted-foreground" />
					</div>
					<div className="space-y-0.5">
						{date ? (
							<>
								<p className="text-sm font-medium leading-none">
									{format(date, "EEEE, MMMM d · h:mm a")}
								</p>
								<p className="text-xs text-muted-foreground">
									{format(date, "yyyy")}
								</p>
							</>
						) : (
							<p className="text-sm text-muted-foreground italic">
								Date not set
							</p>
						)}
					</div>
				</div>

				<span
					className={cn(
						"text-xs font-medium px-2.5 py-1 rounded-full border",
						"bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
						"dark:text-emerald-400 dark:bg-emerald-500/15 dark:border-emerald-500/25",
					)}
				>
					Confirmed
				</span>
			</div>

			<Separator />

			{/* Actions */}
			<div className="px-4 py-3 flex items-center gap-2 justify-end">
				{renderDiscordAction({
					announced,
					announceMutation,
					hasDiscordEvent,
					hasDiscordIntegration,
					isSeriesSession,
				})}
			</div>
		</div>
	);
}
