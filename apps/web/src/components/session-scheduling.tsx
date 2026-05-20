import { IntegrationSource } from "@planner/enums/integration";
import { Status } from "@planner/enums/session";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarCheck, CalendarClock, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { client } from "@/lib/client";
import { cn } from "@/lib/utils";

// ----------------------------------------------------------------
// Types — swap these out for your generated proto/schema types
// ----------------------------------------------------------------

type Session = {
	id: string;
	status: Status;
	startsAt?: Date | string | null;
	campaignId: string;
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
		queryKey: ["integrations", session.campaignId, IntegrationSource.DISCORD],
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
			return <DraftState sessionId={session.id} />;
		case Status.CONFIRMED:
			return (
				<ConfirmedState
					campaignId={session.campaignId}
					hasDiscordIntegration={hasDiscordIntegration}
					sessionId={session.id}
					startsAt={session.startsAt}
				/>
			);
		case "POLLING":
			return null; // TODO
	}
}

// ----------------------------------------------------------------
// DRAFT state
// ----------------------------------------------------------------

function DraftState({ sessionId }: { sessionId: string }) {
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

			<Sheet>
				<SheetTrigger asChild>
					<Button className="mt-1 gap-2" size="sm" variant="outline">
						{/* Swap for your Discord icon if you have one */}
						<CalendarClock className="size-3.5" />
						Poll party availability
					</Button>
				</SheetTrigger>
				<SheetContent
					className="w-[420px] sm:w-[460px] p-0 flex flex-col"
					side="right"
				>
					{/* ProposeDatesForm goes here — receives sessionId, closes sheet on success */}
					<div className="p-6 text-sm text-muted-foreground">
						ProposeDatesForm — sessionId: {sessionId}
					</div>
				</SheetContent>
			</Sheet>
		</div>
	);
}

// ----------------------------------------------------------------
// CONFIRMED state
// ----------------------------------------------------------------

type ConfirmedStateProps = {
	startsAt?: Date | string | null;
	sessionId: string;
	campaignId: string;
	hasDiscordIntegration: boolean;
};

function toDate(value: Date | string | null | undefined): Date | undefined {
	if (!value) return undefined;
	const parsed = typeof value === "string" ? new Date(value) : value;
	return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function ConfirmedState({
	startsAt,
	campaignId,
	sessionId,
	hasDiscordIntegration,
}: ConfirmedStateProps) {
	const date = toDate(startsAt);
	const [announced, setAnnounced] = useState(false);

	const announceMutation = useMutation({
		mutationFn: () => client.session.announceSession({ campaignId, sessionId }),
		onSuccess: () => setAnnounced(true),
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
			<div className="px-4 py-3 flex items-center gap-2">
				{announced ? (
					<p className="text-xs text-muted-foreground flex items-center gap-1.5">
						<Check className="size-3.5 text-emerald-500" />
						Announced on Discord
					</p>
				) : (
					<Button
						className="gap-1.5"
						disabled={announceMutation.isPending || !hasDiscordIntegration}
						onClick={() => announceMutation.mutate()}
						size="sm"
						variant="outline"
					>
						{/* Swap for a Discord icon if you have one */}
						Announce on Discord
					</Button>
				)}
			</div>
		</div>
	);
}
