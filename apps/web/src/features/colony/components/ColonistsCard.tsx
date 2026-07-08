import {
	CharacterStatusEnum,
	HealthConditionEnum,
	RelationToPartyEnum,
} from "@planner/enums/character";
import { WorkerTypeEnum } from "@planner/enums/colony";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, EyeOff, Plus, Search, Trash2, User2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
	characterStatusBadgeColor,
	healthConditionBadgeColor,
	relationToPartyBadgeColor,
} from "@/features/npcs/constants";
import { useNpcsByCampaign } from "@/features/npcs/hooks/useNpc";
import { useNpcData } from "@/features/npcs/hooks/useNpcData";
import type { NonPlayerCharacter } from "@/features/npcs/types";
import { Button } from "@/shared/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { queryKeys } from "@/shared/lib/query-keys";
import { useColonyNpcs, useColonyWorkforce } from "../hooks/useColony";

const AVATAR_COLORS = [
	"bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
	"bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
	"bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
	"bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300",
	"bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
	"bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900 dark:text-fuchsia-300",
];

const WORKER_TYPE_LABEL: Record<WorkerTypeEnum, string> = {
	[WorkerTypeEnum.FARMER]: "Farmer",
	[WorkerTypeEnum.HEALER]: "Healer",
	[WorkerTypeEnum.BLACKSMITH]: "Blacksmith",
	[WorkerTypeEnum.SOLDIER]: "Soldier",
	[WorkerTypeEnum.MINER]: "Miner",
	[WorkerTypeEnum.BUILDER]: "Builder",
	[WorkerTypeEnum.SCHOLAR]: "Scholar",
	[WorkerTypeEnum.MAGE]: "Mage",
};

type WorkforceEntry = { id: string; workerType: WorkerTypeEnum; count: number };

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

function NpcAvatar({
	avatar,
	name,
	size = "sm",
}: {
	avatar?: string | null;
	name: string;
	size?: "sm" | "lg";
}) {
	const sizeClass = size === "lg" ? "w-12 h-12 text-sm" : "w-8 h-8 text-xs";
	if (avatar) {
		return (
			<img
				alt={name}
				className={`${sizeClass} rounded-full object-cover shrink-0`}
				src={avatar}
			/>
		);
	}
	return (
		<div
			className={`${sizeClass} rounded-full flex items-center justify-center shrink-0 font-semibold ${getAvatarColor(name)}`}
		>
			{getInitials(name)}
		</div>
	);
}

function NpcRow({
	npc,
	workerType,
	isSelected,
	onClick,
}: {
	npc: NonPlayerCharacter;
	workerType: WorkerTypeEnum | null;
	isSelected: boolean;
	onClick: () => void;
}) {
	const displayName = npc.knownName ?? npc.name;

	return (
		<button
			className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/40 ${
				isSelected ? "bg-muted/60" : ""
			}`}
			onClick={onClick}
			type="button"
		>
			<NpcAvatar avatar={npc.avatar} name={npc.name} />
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-1">
					<p className="text-sm font-medium truncate leading-tight">
						{displayName}
					</p>
					{!npc.isKnownToParty && (
						<EyeOff className="w-3 h-3 text-muted-foreground shrink-0" />
					)}
				</div>
				<p className="text-xs text-muted-foreground truncate mt-0.5">
					{workerType ? WORKER_TYPE_LABEL[workerType] : (npc.race ?? "Unknown")}
				</p>
			</div>
		</button>
	);
}

function NpcDetail({
	npc,
	workerType,
	workforce,
	onJobChange,
	onRemoveFromColony,
	isPending,
}: {
	npc: NonPlayerCharacter;
	workerType: WorkerTypeEnum | null;
	workforce: WorkforceEntry[];
	onJobChange: (workforceId: string | null) => void;
	onRemoveFromColony: () => void;
	isPending: boolean;
}) {
	const navigate = useNavigate();
	const displayName = npc.isKnownToParty
		? (npc.knownName ?? npc.name)
		: npc.name;
	const relationKey = npc.relationToPartyStatus as RelationToPartyEnum;
	const statusKey = npc.status as CharacterStatusEnum;
	const healthKey = npc.healthCondition as HealthConditionEnum;
	const showStatus =
		npc.status !== CharacterStatusEnum.UNKNOWN &&
		npc.status !== CharacterStatusEnum.ALIVE;
	const showHealth = npc.healthCondition !== HealthConditionEnum.HEALTHY;

	return (
		<div className="space-y-4">
			<div className="flex items-start gap-3">
				<NpcAvatar avatar={npc.avatar} name={npc.name} size="lg" />
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-1.5">
						<p className="font-semibold text-sm leading-tight truncate">
							{displayName}
						</p>
						{!npc.isKnownToParty && (
							<EyeOff className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
						)}
					</div>
					{npc.race && (
						<p className="text-xs text-muted-foreground mt-0.5">{npc.race}</p>
					)}
				</div>
			</div>

			<div className="flex flex-wrap gap-1.5">
				<span
					className={`text-xs px-2 py-0.5 rounded-full border ${relationToPartyBadgeColor[relationKey] ?? relationToPartyBadgeColor[RelationToPartyEnum.UNKNOWN]}`}
				>
					{relationKey.charAt(0) + relationKey.slice(1).toLowerCase()}
				</span>
				{showHealth && (
					<span
						className={`text-xs px-2 py-0.5 rounded-full border ${healthConditionBadgeColor[healthKey] ?? healthConditionBadgeColor[HealthConditionEnum.UNKNOWN]}`}
					>
						{healthKey.charAt(0) + healthKey.slice(1).toLowerCase()}
					</span>
				)}
				{showStatus && (
					<span
						className={`text-xs px-2 py-0.5 rounded-full border ${characterStatusBadgeColor[statusKey] ?? characterStatusBadgeColor[CharacterStatusEnum.UNKNOWN]}`}
					>
						{statusKey.charAt(0) + statusKey.slice(1).toLowerCase()}
					</span>
				)}
			</div>

			{npc.personality && (
				<p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
					{npc.personality}
				</p>
			)}

			<div className="space-y-1.5">
				<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
					Job
				</p>
				<Select
					disabled={isPending}
					onValueChange={(value) => {
						if (value === "none") {
							onJobChange(null);
						} else {
							const row = workforce.find((w) => w.workerType === value);
							onJobChange(row?.id ?? null);
						}
					}}
					value={workerType ?? "none"}
				>
					<SelectTrigger className="w-full h-8 text-sm">
						<SelectValue placeholder="No job assigned" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="none">No job</SelectItem>
						{Object.entries(WORKER_TYPE_LABEL).map(([type, label]) => (
							<SelectItem key={type} value={type}>
								{label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="flex gap-2">
				<Button
					className="flex-1"
					disabled={isPending}
					onClick={() =>
						navigate({ params: { npcId: npc.id }, to: "/campaign/npcs/$npcId" })
					}
					size="sm"
					variant="outline"
				>
					View full profile
					<ArrowRight className="w-3.5 h-3.5 ml-1.5" />
				</Button>
				<Button
					disabled={isPending}
					onClick={onRemoveFromColony}
					size="sm"
					title="Remove from colony"
					variant="destructive"
				>
					<Trash2 className="w-3.5 h-3.5" />
				</Button>
			</div>
		</div>
	);
}

export default function ColonistsCard({
	colonyId,
	campaignId,
}: {
	colonyId: string;
	campaignId: string;
}) {
	const [search, setSearch] = useState("");
	const [activeRole, setActiveRole] = useState<WorkerTypeEnum | null>(null);
	const [selectedNpcId, setSelectedNpcId] = useState<string | null>(null);
	const [addNpcOpen, setAddNpcOpen] = useState(false);
	const [addNpcSearch, setAddNpcSearch] = useState("");

	const { data: workforceData, isLoading: isWorkforceLoading } =
		useColonyWorkforce(colonyId);
	const { data: npcsData, isLoading: isNpcsLoading } = useColonyNpcs(
		colonyId,
		campaignId,
	);
	const { data: allNpcsData, isLoading: isAllNpcsLoading } =
		useNpcsByCampaign(campaignId);
	const queryClient = useQueryClient();
	const { updateNpc } = useNpcData();

	function invalidateColonyNpcs() {
		queryClient.invalidateQueries({
			queryKey: queryKeys.npcs.listByColony(colonyId),
		});
	}

	const workforce = workforceData?.workforce ?? [];
	const colonyNpcs = npcsData?.npcs ?? [];

	const workforceTypeMap = new Map<string, WorkerTypeEnum>(
		workforce.map((entry) => [entry.id, entry.workerType as WorkerTypeEnum]),
	);

	const activeWorkerTypes = [
		...new Set(
			colonyNpcs
				.map((npc) =>
					npc.workforceId ? workforceTypeMap.get(npc.workforceId) : undefined,
				)
				.filter((type): type is WorkerTypeEnum => type !== undefined),
		),
	];

	const filtered = colonyNpcs.filter((npc) => {
		const displayName = npc.knownName ?? npc.name;
		const matchesSearch =
			!search ||
			displayName.toLowerCase().includes(search.toLowerCase()) ||
			npc.aliases?.some((alias) =>
				alias.toLowerCase().includes(search.toLowerCase()),
			);
		const workforceId = npc.workforceId ?? "";
		const matchesRole =
			!activeRole || workforceTypeMap.get(workforceId) === activeRole;
		return matchesSearch === true && matchesRole === true;
	});

	const selectedNpc =
		colonyNpcs.find((npc) => npc.id === selectedNpcId) ?? null;

	const isLoading = isWorkforceLoading || isNpcsLoading;

	const assignableNpcs = (allNpcsData?.npcs ?? []).filter(
		(npc) => npc.colonyId !== colonyId,
	);
	const filteredAssignable = assignableNpcs.filter((npc) => {
		const displayName = npc.knownName ?? npc.name;
		return (
			!addNpcSearch ||
			displayName.toLowerCase().includes(addNpcSearch.toLowerCase())
		);
	});

	function handleAddNpc(npc: NonPlayerCharacter) {
		updateNpc.mutate(
			{
				aliases: npc.aliases ?? [],
				colonyId,
				id: npc.id,
				labels: npc.labels ?? [],
				removedFields: [],
			},
			{
				onError: () => toast.error("failed to add npc to colony"),
				onSuccess: () => {
					toast.success("npc added to colony");
					invalidateColonyNpcs();
					setAddNpcOpen(false);
					setAddNpcSearch("");
				},
			},
		);
	}

	function handleJobChange(
		npc: NonPlayerCharacter,
		workforceId: string | null,
	) {
		if (workforceId === null) {
			updateNpc.mutate(
				{
					aliases: npc.aliases ?? [],
					id: npc.id,
					labels: npc.labels ?? [],
					removedFields: ["workforceId"],
				},
				{
					onError: () => toast.error("failed to add npc to job"),
					onSuccess: () => {
						invalidateColonyNpcs();
						toast.success("npc added to job");
					},
				},
			);
		} else {
			updateNpc.mutate(
				{
					aliases: npc.aliases ?? [],
					id: npc.id,
					labels: npc.labels ?? [],
					removedFields: [],
					workforceId,
				},
				{ onSuccess: invalidateColonyNpcs },
			);
		}
	}

	function handleRemoveFromColony(npc: NonPlayerCharacter) {
		updateNpc.mutate(
			{
				aliases: npc.aliases ?? [],
				id: npc.id,
				labels: npc.labels ?? [],
				removedFields: ["colonyId", "workforceId"],
			},
			{
				onError: () => toast.error("failed to remove npc from colony"),
				onSuccess: () => {
					invalidateColonyNpcs();
					setSelectedNpcId(null);
					toast.success("npc removed from colony");
				},
			},
		);
	}

	return (
		<>
			<div className="border rounded-2xl overflow-hidden">
				<div className="flex h-[480px]">
					{/* Left: NPC list */}
					<div className="flex flex-col w-1/2 border-r">
						<div className="p-3 space-y-2 border-b shrink-0">
							<div className="flex items-center gap-2">
								<div className="relative flex-1">
									<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
									<Input
										className="pl-8 h-8 text-sm"
										onChange={(e) => setSearch(e.target.value)}
										placeholder="Filter by name..."
										value={search}
									/>
								</div>
								<Button
									className="shrink-0 h-8 w-8"
									onClick={() => setAddNpcOpen(true)}
									size="icon"
									title="Add NPC to colony"
									variant="outline"
								>
									<Plus className="w-3.5 h-3.5" />
								</Button>
							</div>
							{activeWorkerTypes.length > 0 && (
								<div className="flex flex-wrap gap-1.5">
									{activeWorkerTypes.map((type) => (
										<button
											className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
												activeRole === type
													? "bg-primary text-primary-foreground border-primary"
													: "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
											}`}
											key={type}
											onClick={() =>
												setActiveRole(activeRole === type ? null : type)
											}
											type="button"
										>
											{WORKER_TYPE_LABEL[type]}
										</button>
									))}
								</div>
							)}
						</div>

						<div className="flex-1 overflow-y-auto">
							{isLoading && (
								<div className="p-3 space-y-1">
									{Array.from({ length: 5 }).map((_, index) => (
										<div
											className="flex items-center gap-2.5 px-3 py-2"
											key={index}
										>
											<Skeleton className="w-8 h-8 rounded-full shrink-0" />
											<div className="flex-1 space-y-1.5">
												<Skeleton className="h-3.5 w-28" />
												<Skeleton className="h-3 w-20" />
											</div>
										</div>
									))}
								</div>
							)}

							{!isLoading && filtered.length === 0 && (
								<div className="flex flex-col items-center justify-center h-full text-center p-6">
									<div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
										<User2 className="w-5 h-5 text-muted-foreground" />
									</div>
									<p className="text-sm font-medium">No colonists</p>
									{(search || activeRole) && (
										<p className="text-xs text-muted-foreground mt-1">
											Try adjusting your filters
										</p>
									)}
								</div>
							)}

							{!isLoading &&
								filtered.map((npc) => (
									<NpcRow
										isSelected={npc.id === selectedNpcId}
										key={npc.id}
										npc={npc}
										onClick={() =>
											setSelectedNpcId(npc.id === selectedNpcId ? null : npc.id)
										}
										workerType={
											npc.workforceId
												? (workforceTypeMap.get(npc.workforceId) ?? null)
												: null
										}
									/>
								))}
						</div>
					</div>

					{/* Right: workforce summary + NPC detail */}
					<div className="flex flex-col flex-1 min-w-0">
						<div className="p-4 border-b shrink-0">
							<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
								Colonist Roles
							</p>
							{isWorkforceLoading && (
								<div className="space-y-2">
									{Array.from({ length: 3 }).map((_, index) => (
										<Skeleton className="h-4 w-full" key={index} />
									))}
								</div>
							)}
							{!isWorkforceLoading && workforce.length === 0 && (
								<p className="text-xs text-muted-foreground">
									No workforce assigned yet.
								</p>
							)}
							{!isWorkforceLoading && workforce.length > 0 && (
								<div className="space-y-1.5">
									{workforce.map((entry) => (
										<div
											className="flex items-center justify-between"
											key={entry.id}
										>
											<span className="text-sm text-muted-foreground">
												{WORKER_TYPE_LABEL[entry.workerType as WorkerTypeEnum]}
											</span>
											<span className="text-sm font-medium tabular-nums">
												{entry.count}
											</span>
										</div>
									))}
								</div>
							)}
						</div>

						<div className="flex-1 overflow-y-auto p-4">
							{!selectedNpc && (
								<div className="flex items-center justify-center h-full">
									<p className="text-xs text-muted-foreground">
										Select a colonist to view details
									</p>
								</div>
							)}
							{selectedNpc && (
								<NpcDetail
									isPending={updateNpc.isPending}
									npc={selectedNpc}
									onJobChange={(workforceId) =>
										handleJobChange(selectedNpc, workforceId)
									}
									onRemoveFromColony={() => handleRemoveFromColony(selectedNpc)}
									workerType={
										selectedNpc.workforceId
											? (workforceTypeMap.get(selectedNpc.workforceId) ?? null)
											: null
									}
									workforce={workforce}
								/>
							)}
						</div>
					</div>
				</div>
			</div>

			<Dialog
				onOpenChange={(open) => {
					setAddNpcOpen(open);
					if (!open) setAddNpcSearch("");
				}}
				open={addNpcOpen}
			>
				<DialogContent className="max-w-sm">
					<DialogHeader>
						<DialogTitle>Add colonist</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<div className="relative">
							<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
							<Input
								className="pl-8 h-8 text-sm"
								onChange={(e) => setAddNpcSearch(e.target.value)}
								placeholder="Search NPCs..."
								value={addNpcSearch}
							/>
						</div>
						<div className="max-h-64 overflow-y-auto -mx-6 px-6">
							{isAllNpcsLoading && (
								<div className="space-y-2 py-2">
									{Array.from({ length: 3 }).map((_, index) => (
										<Skeleton className="h-10 w-full" key={index} />
									))}
								</div>
							)}
							{!isAllNpcsLoading && filteredAssignable.length === 0 && (
								<p className="text-sm text-muted-foreground text-center py-6">
									No available NPCs
								</p>
							)}
							{!isAllNpcsLoading &&
								filteredAssignable.map((npc) => (
									<button
										className="w-full flex items-center gap-2.5 px-2 py-2 text-left rounded-lg hover:bg-muted/40 transition-colors disabled:opacity-50"
										disabled={updateNpc.isPending}
										key={npc.id}
										onClick={() => handleAddNpc(npc)}
										type="button"
									>
										<NpcAvatar avatar={npc.avatar} name={npc.name} />
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium truncate">
												{npc.knownName ?? npc.name}
											</p>
											{npc.race && (
												<p className="text-xs text-muted-foreground truncate">
													{npc.race}
												</p>
											)}
										</div>
									</button>
								))}
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
