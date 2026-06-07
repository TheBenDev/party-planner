import { UserRole } from "@planner/enums/user";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { EyeOff, MoreHorizontal, Plus, Search, User2 } from "lucide-react";
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
import { client } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/query-keys";

const RELATION_STYLES: Record<string, { label: string; className: string }> = {
	ALLY: {
		className:
			"bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
		label: "Ally",
	},
	FRIENDLY: {
		className:
			"bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
		label: "Friendly",
	},
	HOSTILE: {
		className: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
		label: "Hostile",
	},
	NEUTRAL: {
		className: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
		label: "Neutral",
	},
	UNFRIENDLY: {
		className:
			"bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300",
		label: "Unfriendly",
	},
	UNKNOWN: {
		className:
			"bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
		label: "Unknown",
	},
};

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
	ALIVE: {
		className:
			"bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300",
		label: "Alive",
	},
	DEAD: {
		className:
			"bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400 line-through",
		label: "Dead",
	},
	MISSING: {
		className:
			"bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
		label: "Missing",
	},
	UNKNOWN: {
		className:
			"bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
		label: "Unknown",
	},
};

const AVATAR_COLORS = [
	"bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
	"bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
	"bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
	"bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300",
	"bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
	"bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900 dark:text-fuchsia-300",
];

function getAvatarColor(name: string) {
	const index =
		name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
		AVATAR_COLORS.length;
	return AVATAR_COLORS[index];
}

function getInitials(name: string) {
	return name
		.split(" ")
		.slice(0, 2)
		.map((n) => n[0])
		.join("")
		.toUpperCase();
}

function NPCCardSkeleton() {
	return (
		<div className="flex items-center gap-3 px-4 py-3.5 border rounded-xl">
			<Skeleton className="w-10 h-10 rounded-full shrink-0" />
			<div className="flex-1 space-y-2">
				<Skeleton className="h-4 w-36" />
				<Skeleton className="h-3 w-24" />
			</div>
			<Skeleton className="h-5 w-14 rounded-full hidden sm:block" />
			<Skeleton className="h-5 w-16 rounded-full hidden sm:block" />
			<Skeleton className="h-8 w-8 rounded-md" />
		</div>
	);
}

type NPC = {
	id: string;
	name: string;
	race?: string | null;
	avatar?: string | null;
	knownName?: string | null;
	isKnownToParty?: boolean | null;
	status: string;
	relationToPartyStatus: string;
	aliases?: string[] | null;
};

function NPCRow({
	npc,
	onView,
	onEdit,
	onDelete,
	isDm,
}: {
	npc: NPC;
	onView: () => void;
	onEdit: () => void;
	onDelete: () => void;
	isDm: boolean;
}) {
	const displayName = npc.isKnownToParty
		? (npc.knownName ?? npc.name)
		: npc.name;
	const initials = getInitials(displayName);
	const avatarColor = getAvatarColor(npc.name);
	const relation =
		RELATION_STYLES[npc.relationToPartyStatus] ?? RELATION_STYLES.UNKNOWN;
	const status = STATUS_STYLES[npc.status] ?? STATUS_STYLES.UNKNOWN;
	const showStatus = npc.status !== "UNKNOWN" && npc.status !== "ALIVE";

	return (
		<Button
			className="group flex w-full items-center gap-3 px-4 py-3.5 border rounded-xl hover:bg-muted/40 transition-colors cursor-pointer justify-start h-auto"
			onClick={onView}
			size={null}
			variant="ghost"
		>
			{npc.avatar ? (
				<img
					alt={displayName}
					className="w-10 h-10 rounded-full object-cover shrink-0"
					src={npc.avatar}
				/>
			) : (
				<div
					className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold ${avatarColor}`}
				>
					{initials}
				</div>
			)}

			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-1.5">
					<p className="font-medium text-sm leading-tight truncate">
						{displayName}
					</p>
					{!npc.isKnownToParty && (
						<EyeOff
							aria-label="Not known to party"
							className="w-3.5 h-3.5 text-muted-foreground shrink-0"
						/>
					)}
				</div>
				<p className="text-xs text-muted-foreground mt-0.5 truncate text-start">
					{npc.race ?? "Unknown race"}
					{npc.aliases && npc.aliases.length > 0 && (
						<span className="text-muted-foreground/60">
							{" "}
							· {npc.aliases.join(", ")}
						</span>
					)}
				</p>
			</div>

			<div className="hidden sm:flex items-center gap-2 shrink-0">
				<span
					className={`text-xs px-2 py-0.5 rounded-full font-normal ${relation.className}`}
				>
					{relation.label}
				</span>
				{showStatus && (
					<span
						className={`text-xs px-2 py-0.5 rounded-full font-normal ${status.className}`}
					>
						{status.label}
					</span>
				)}
			</div>

			<DropdownMenu>
				<DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
					<div className="inline-flex items-center justify-center rounded-lg h-8 w-8 opacity-0 hover:bg-accent group-hover:opacity-100 hover:cursor-pointer transition-opacity shrink-0">
						<MoreHorizontal className="w-4 h-4" />
						<span className="sr-only">Options for {displayName}</span>
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

export function NPCSPage() {
	const { campaign, role } = useAuth();
	const isDm = role === UserRole.DUNGEON_MASTER;
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");

	const { data: npcs = { npcs: [] }, isLoading } = useQuery({
		enabled: Boolean(campaign),
		queryFn: () => {
			if (!campaign) throw new Error("campaign required");
			return client.npc.listNonPlayerCharactersByCampaign({
				campaignId: campaign.campaign.id,
			});
		},
		queryKey: queryKeys.npcs.list(campaign?.campaign.id ?? ""),
	});

	const { mutate: deleteNpc } = useMutation({
		mutationFn: async (c: string) => await client.npc.removeNpc({ id: c }),
		onError: () => {
			toast.error("Failed to delete Npc");
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: queryKeys.npcs.list(campaign?.campaign.id ?? ""),
			});
		},
	});

	const { mutate: createNpc, isPending: creatingNpc } = useMutation({
		mutationFn: async () => {
			if (!campaign) throw new Error("campaign required");
			await client.npc.createNpc({
				campaignId: campaign.campaign.id,
				name: "New Npc",
			});
		},
		onError: () => {
			toast.error("Failed to create Npc");
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: queryKeys.npcs.list(campaign?.campaign.id ?? ""),
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

	//TODO: filter optimization
	const filtered = npcs.npcs.filter((npc) => {
		const q = search.toLowerCase();
		return (
			npc.name.toLowerCase().includes(q) ||
			npc.knownName?.toLowerCase().includes(q) ||
			npc.race?.toLowerCase().includes(q) ||
			npc.aliases?.some((a) => a.toLowerCase().includes(q))
		);
	});

	return (
		<div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">
						Non-Player Characters
					</h1>
					{!isLoading && (
						<p className="text-sm text-muted-foreground mt-0.5">
							{npcs.npcs.length} character{npcs.npcs.length !== 1 ? "s" : ""} in
							this campaign
						</p>
					)}
				</div>
				{isDm && (
					<Button
						className="shrink-0"
						disabled={creatingNpc}
						onClick={() => createNpc()}
					>
						<Plus className="w-4 h-4 mr-2" />
						New NPC
					</Button>
				)}
			</div>
			<div className="relative">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
				<Input
					className="pl-9"
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Search by name, alias, or race..."
					value={search}
				/>
			</div>
			<div className="space-y-2">
				{isLoading && (
					// biome-ignore lint/complexity/noUselessFragments: multiple skeletons need a wrapper
					<>
						{Array.from({ length: 5 }).map((_, i) => (
							<NPCCardSkeleton key={i} />
						))}
					</>
				)}

				{!isLoading && filtered.length === 0 && (
					<div className="flex flex-col items-center justify-center py-20 text-center">
						<div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
							<User2 className="w-7 h-7 text-muted-foreground" />
						</div>

						{search && (
							<>
								<p className="font-medium">No characters match "{search}"</p>
								<p className="text-sm text-muted-foreground mt-1">
									Try searching by name, alias, or race.
								</p>
							</>
						)}

						{!search && (
							<>
								<p className="font-medium">No NPCs yet</p>
								{isDm && (
									<>
										<p className="text-sm text-muted-foreground mt-1">
											Add your first character to get started.
										</p>
										<Button
											className="mt-4"
											disabled={creatingNpc}
											onClick={() => createNpc()}
											size="sm"
											variant="outline"
										>
											<Plus className="w-4 h-4 mr-1.5" />
											Create NPC
										</Button>
									</>
								)}
							</>
						)}
					</div>
				)}

				{!isLoading &&
					filtered.length > 0 &&
					filtered.map((npc) => (
						<NPCRow
							isDm={isDm}
							key={npc.id}
							npc={npc}
							onDelete={() => {
								deleteNpc(npc.id);
							}}
							onEdit={() =>
								navigate({
									params: { npcId: npc.id },
									to: "/campaign/npcs/$npcId/edit",
								})
							}
							onView={() =>
								navigate({
									params: { npcId: npc.id },
									to: "/campaign/npcs/$npcId",
								})
							}
						/>
					))}
			</div>
		</div>
	);
}
