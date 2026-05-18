import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	CalendarDays,
	Clock,
	MoreHorizontal,
	Plus,
	Search,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/auth";
import { client } from "@/lib/client";

export const Route = createFileRoute("/_authenticated/campaign/sessions/")({
	component: SessionsPage,
});

const SESSION_NUMBER_RE = /\d+/;

const SESSION_COLORS = [
	"bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
	"bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
	"bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
	"bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300",
	"bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
	"bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900 dark:text-fuchsia-300",
];

function getSessionColor(title: string) {
	const index =
		title.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
		SESSION_COLORS.length;
	return SESSION_COLORS[index];
}

function getSessionNumber(title: string) {
	const match = SESSION_NUMBER_RE.exec(title);
	if (match) return match[0];
	return title
		.split(" ")
		.slice(0, 2)
		.map((n) => n[0])
		.join("")
		.toUpperCase();
}

function formatSessionDate(date: Date | string | null | undefined): string {
	if (!date) return "No date set";
	const d = typeof date === "string" ? new Date(date) : date;
	return d.toLocaleDateString("en-US", {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
}

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

type Session = {
	id: string;
	title: string;
	description?: string | null;
	startsAt?: Date | string | null;
	campaignId: string;
	createdAt: Date | string;
	updatedAt: Date | string;
};

function SessionSubtitle({ session }: { session: Session }) {
	if (session.startsAt) {
		return (
			<>
				<Clock className="w-3 h-3 shrink-0" />
				{formatSessionDate(session.startsAt)}
			</>
		);
	}

	if (session.description) {
		return <>{session.description}</>;
	}

	return (
		<span className="italic text-muted-foreground/50">No description yet.</span>
	);
}

function SessionRow({
	session,
	onView,
	onEdit,
	onDelete,
}: {
	session: Session;
	onView: () => void;
	onEdit: () => void;
	onDelete: () => void;
}) {
	const label = getSessionNumber(session.title);
	const color = getSessionColor(session.title);

	return (
		<div className="group flex w-full items-center gap-3 px-4 py-3.5 border rounded-xl hover:bg-muted/40 transition-colors">
			<div
				className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold ${color}`}
			>
				{label}
			</div>

			<button
				className="flex-1 min-w-0 text-left"
				onClick={onView}
				type="button"
			>
				<p className="font-medium text-sm leading-tight truncate">
					{session.title}
				</p>
				<p className="text-xs text-muted-foreground mt-0.5 truncate flex items-center gap-1">
					<SessionSubtitle session={session} />
				</p>
			</button>

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						className="inline-flex items-center justify-center rounded-lg h-8 w-8 opacity-0 hover:bg-accent group-hover:opacity-100 transition-opacity shrink-0"
						onClick={(e) => e.stopPropagation()}
						type="button"
					>
						<MoreHorizontal className="w-4 h-4" />
						<span className="sr-only">Options for {session.title}</span>
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-40">
					<DropdownMenuItem
						onClick={(e) => {
							e.stopPropagation();
							onView();
						}}
					>
						View
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={(e) => {
							e.stopPropagation();
							onEdit();
						}}
					>
						Edit
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						className="text-destructive focus:text-destructive"
						onClick={(e) => {
							e.stopPropagation();
							onDelete();
						}}
					>
						Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}

function SessionsPage() {
	const { campaign } = useAuth();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");

	const { data: sessions = { sessions: [] }, isLoading } = useQuery({
		enabled: Boolean(campaign),
		queryFn: () => {
			if (!campaign) throw new Error("campaign required");
			return client.session.listSessions({
				campaignId: campaign.campaign.id,
			});
		},
		queryKey: ["sessions", campaign?.campaign.id],
	});

	const { mutate: deleteSession } = useMutation({
		mutationFn: (id: string) => client.session.removeSession({ id }),
		onError: () => toast.error("Failed to delete session"),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["sessions", campaign?.campaign.id],
			});
		},
	});

	const { mutate: createSession, isPending: creatingSession } = useMutation({
		mutationFn: () => {
			if (!campaign) throw new Error("campaign required");
			return client.session.createSession({
				campaignId: campaign.campaign.id,
				title: "New Session",
			});
		},
		onError: () => toast.error("Failed to create session"),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["sessions", campaign?.campaign.id],
			});
		},
	});

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

	const filtered = sessions.sessions.filter((s) => {
		const q = search.toLowerCase();
		return (
			s.title.toLowerCase().includes(q) ||
			s.description?.toLowerCase().includes(q)
		);
	});

	return (
		<div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">Sessions</h1>
					{!isLoading && (
						<p className="text-sm text-muted-foreground mt-0.5">
							{sessions.sessions.length} session
							{sessions.sessions.length !== 1 ? "s" : ""} in this campaign
						</p>
					)}
				</div>
				<Button
					className="shrink-0"
					disabled={creatingSession}
					onClick={() => createSession()}
				>
					<Plus className="w-4 h-4 mr-2" />
					New Session
				</Button>
			</div>

			<div className="relative">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
				<Input
					className="pl-9"
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Search by title or description..."
					value={search}
				/>
			</div>

			<div className="space-y-2">
				{isLoading &&
					Array.from({ length: 5 }).map((_, i) => (
						<SessionCardSkeleton key={i} />
					))}

				{!isLoading && filtered.length === 0 && (
					<div className="flex flex-col items-center justify-center py-20 text-center">
						<div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
							<CalendarDays className="w-7 h-7 text-muted-foreground" />
						</div>
						{search ? (
							<>
								<p className="font-medium">No sessions match "{search}"</p>
								<p className="text-sm text-muted-foreground mt-1">
									Try searching by title or description.
								</p>
							</>
						) : (
							<>
								<p className="font-medium">No sessions yet</p>
								<p className="text-sm text-muted-foreground mt-1">
									Add your first session to get started.
								</p>
								<Button
									className="mt-4"
									disabled={creatingSession}
									onClick={() => createSession()}
									size="sm"
									variant="outline"
								>
									<Plus className="w-4 h-4 mr-1.5" />
									Create Session
								</Button>
							</>
						)}
					</div>
				)}

				{!isLoading &&
					filtered.length > 0 &&
					filtered.map((s) => (
						<SessionRow
							key={s.id}
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
					))}
			</div>
		</div>
	);
}
