import { Status } from "@planner/enums/quest";
import { UserRole } from "@planner/enums/user";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { MoreHorizontal, Plus, ScrollText, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useAuth } from "@/shared/hooks/auth";
import { useQuestData } from "../hooks/useQuestData";
import { client } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/query-keys";

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
	ACTIVE: {
		className:
			"bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
		label: "Active",
	},
	COMPLETED: {
		className:
			"bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
		label: "Completed",
	},
	FAILED: {
		className: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
		label: "Failed",
	},
	UNSPECIFIED: {
		className:
			"bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
		label: "Unknown",
	},
};

const QUEST_COLORS = [
	"bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
	"bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
	"bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
	"bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300",
	"bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
	"bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900 dark:text-fuchsia-300",
];

function getQuestColor(title: string) {
	const index =
		title.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
		QUEST_COLORS.length;
	return QUEST_COLORS[index];
}

function getInitials(title: string) {
	return title
		.split(" ")
		.slice(0, 2)
		.map((n) => n[0])
		.join("")
		.toUpperCase();
}

function QuestCardSkeleton() {
	return (
		<div className="flex items-center gap-3 px-4 py-3.5 border rounded-xl">
			<Skeleton className="w-10 h-10 rounded-full shrink-0" />
			<div className="flex-1 space-y-2">
				<Skeleton className="h-4 w-48" />
				<Skeleton className="h-3 w-64" />
			</div>
			<Skeleton className="h-5 w-16 rounded-full hidden sm:block" />
			<Skeleton className="h-8 w-8 rounded-md" />
		</div>
	);
}

type Quest = {
	id: string;
	title: string;
	status: string;
	description?: string | null;
};

function QuestRow({
	quest,
	onView,
	onEdit,
	onDelete,
	isDm,
}: {
	quest: Quest;
	onView: () => void;
	onEdit: () => void;
	onDelete: () => void;
	isDm: boolean;
}) {
	const color = getQuestColor(quest.title);
	const initials = getInitials(quest.title);
	const status = STATUS_STYLES[quest.status] ?? STATUS_STYLES.UNSPECIFIED;

	return (
		<Button
			className="group flex w-full items-center gap-3 px-4 py-3.5 border rounded-xl hover:bg-muted/40 transition-colors cursor-pointer justify-start h-auto"
			onClick={onView}
			size={null}
			variant="ghost"
		>
			<div
				className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold ${color}`}
			>
				{initials}
			</div>

			<div className="flex-1 min-w-0">
				<p className="font-medium text-sm leading-tight truncate">
					{quest.title}
				</p>
				<p className="text-xs text-muted-foreground mt-0.5 truncate text-start">
					{quest.description ?? (
						<span className="italic text-muted-foreground/50">
							No description yet.
						</span>
					)}
				</p>
			</div>

			<div className="hidden sm:flex items-center gap-2 shrink-0">
				<span
					className={`text-xs px-2 py-0.5 rounded-full font-normal ${status.className}`}
				>
					{status.label}
				</span>
			</div>

			<DropdownMenu>
				<DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
					<div className="inline-flex items-center justify-center rounded-lg h-8 w-8 opacity-0 hover:bg-accent group-hover:opacity-100 hover:cursor-pointer transition-opacity shrink-0">
						<MoreHorizontal className="w-4 h-4" />
						<span className="sr-only">Options for {quest.title}</span>
					</div>
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
					{isDm && (
						<>
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
						</>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
		</Button>
	);
}

export function QuestsPage() {
	const { campaign, role } = useAuth();
	const isDm = role === UserRole.DUNGEON_MASTER;
	const navigate = useNavigate();
	const { createQuest, deleteQuest } = useQuestData();
	const [search, setSearch] = useState("");

	const { data: quests = { quests: [] }, isLoading } = useQuery({
		enabled: Boolean(campaign),
		queryFn: () => {
			if (!campaign) throw new Error("campaign required");
			return client.quest.listQuestsByCampaign({
				campaignId: campaign.campaign.id,
			});
		},
		queryKey: queryKeys.quests.list(campaign?.campaign.id ?? ""),
	});

	if (!campaign) {
		return (
			<div className="flex flex-col space-y-3 justify-center items-center">
				<span>Campaign Missing</span>
				<Button onClick={() => navigate({ to: "/campaign/create" })}>
					Create new Campaign
				</Button>
			</div>
		);
	}

	const filtered = quests.quests.filter((quest) => {
		const q = search.toLowerCase();
		return (
			quest.title.toLowerCase().includes(q) ||
			quest.description?.toLowerCase().includes(q)
		);
	});

	return (
		<div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">Quests</h1>
					{!isLoading && (
						<p className="text-sm text-muted-foreground mt-0.5">
							{quests.quests.length} quest
							{quests.quests.length !== 1 ? "s" : ""} in this campaign
						</p>
					)}
				</div>
				{isDm && (
					<Button
						className="shrink-0"
						disabled={createQuest.isPending}
						onClick={() => createQuest.mutate({ campaignId: campaign.campaign.id, status: Status.ACTIVE, title: "New Quest" }, { onError: () => toast.error("Failed to create Quest") })}
					>
						<Plus className="w-4 h-4 mr-2" />
						New Quest
					</Button>
				)}
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
						<QuestCardSkeleton key={i} />
					))}

				{!isLoading && filtered.length === 0 && (
					<div className="flex flex-col items-center justify-center py-20 text-center">
						<div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
							<ScrollText className="w-7 h-7 text-muted-foreground" />
						</div>
						{search ? (
							<>
								<p className="font-medium">No quests match "{search}"</p>
								<p className="text-sm text-muted-foreground mt-1">
									Try searching by title or description.
								</p>
							</>
						) : (
							<>
								<p className="font-medium">No quests yet</p>
								{isDm && (
									<>
										<p className="text-sm text-muted-foreground mt-1">
											Add your first quest to get started.
										</p>
										<Button
											className="mt-4"
											disabled={createQuest.isPending}
											onClick={() => createQuest.mutate({ campaignId: campaign.campaign.id, status: Status.ACTIVE, title: "New Quest" }, { onError: () => toast.error("Failed to create Quest") })}
											size="sm"
											variant="outline"
										>
											<Plus className="w-4 h-4 mr-1.5" />
											Create Quest
										</Button>
									</>
								)}
							</>
						)}
					</div>
				)}

				{!isLoading &&
					filtered.length > 0 &&
					filtered.map((quest) => (
						<QuestRow
							isDm={isDm}
							key={quest.id}
							onDelete={() => deleteQuest.mutate({ id: quest.id }, { onError: () => toast.error("Failed to delete Quest") })}
							onEdit={() =>
								navigate({
									params: { questId: quest.id },
									to: "/campaign/quests/$questId/edit",
								})
							}
							onView={() =>
								navigate({
									params: { questId: quest.id },
									to: "/campaign/quests/$questId",
								})
							}
							quest={quest}
						/>
					))}
			</div>
		</div>
	);
}
