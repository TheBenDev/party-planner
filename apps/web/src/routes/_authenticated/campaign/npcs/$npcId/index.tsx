import {
	CharacterStatusEnum,
	RelationToPartyEnum,
} from "@planner/enums/character";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { client } from "@/lib/client";

export const Route = createFileRoute("/_authenticated/campaign/npcs/$npcId/")({
	component: RouteComponent,
});

function RouteComponent() {
	const { npcId } = Route.useParams();
	const navigate = useNavigate();

	const { data, isLoading } = useQuery({
		queryFn: () => client.npc.getNonPlayerCharacter({ id: npcId }),
		queryKey: ["npc", npcId],
	});

	if (isLoading)
		return <div className="p-8 text-muted-foreground">Loading...</div>;

	const npc = data?.npc;
	if (!npc)
		return <div className="p-8 text-muted-foreground">NPC not found.</div>;

	const statusColor: Record<string, string> = {
		[CharacterStatusEnum.ALIVE]:
			"bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
		[CharacterStatusEnum.DEAD]: "bg-red-500/15 text-red-400 border-red-500/30",
		[CharacterStatusEnum.UNKNOWN]:
			"bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
	};

	const relationColor: Record<string, string> = {
		[RelationToPartyEnum.ALLY]:
			"bg-blue-500/15 text-blue-400 border-blue-500/30",
		[RelationToPartyEnum.ENEMY]: "bg-red-500/15 text-red-400 border-red-500/30",
		[RelationToPartyEnum.SUSPICIOUS]:
			"bg-red-500/15 text-orange-400 border-orange-500/30",
		[RelationToPartyEnum.NEUTRAL]:
			"bg-amber-500/15 text-amber-400 border-amber-500/30",
		[RelationToPartyEnum.UNKNOWN]:
			"bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
	};

	return (
		<div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
			{/* Header */}
			<div className="flex items-start justify-between gap-4">
				<div className="space-y-1">
					<h1 className="text-3xl font-semibold tracking-tight">{npc.name}</h1>
					{npc.knownName && npc.knownName !== npc.name && (
						<p className="text-sm text-muted-foreground">
							Known as <span className="italic">{npc.knownName}</span>
						</p>
					)}
					{npc.aliases && npc.aliases.length > 0 && (
						<div className="flex flex-wrap gap-1 pt-1">
							{npc.aliases.map((alias) => (
								<span
									className="text-xs text-muted-foreground border rounded-full px-2 py-0.5"
									key={alias}
								>
									{alias}
								</span>
							))}
						</div>
					)}
				</div>
				<Button
					onClick={() =>
						navigate({ params: { npcId }, to: "/campaign/npcs/$npcId/edit" })
					}
					size="sm"
					variant="outline"
				>
					Edit
				</Button>
			</div>

			{/* Status badges + meta */}
			<div className="flex flex-wrap items-center gap-3">
				<span
					className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusColor[npc.status] ?? statusColor[CharacterStatusEnum.UNKNOWN]}`}
				>
					{npc.status}
				</span>
				<span
					className={`text-xs font-medium px-2.5 py-1 rounded-full border ${relationColor[npc.relationToPartyStatus] ?? relationColor[RelationToPartyEnum.UNKNOWN]}`}
				>
					{npc.relationToPartyStatus}
				</span>
				{npc.isKnownToParty && (
					<span className="text-xs font-medium px-2.5 py-1 rounded-full border bg-violet-500/15 text-violet-400 border-violet-500/30">
						Known to Party
					</span>
				)}
			</div>

			{/* Identity */}
			<div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
				<MetaField label="Race" placeholder="Unknown" value={npc.race} />
				<MetaField label="Age" placeholder="Unknown" value={npc.age} />
				<MetaField
					label="Current Location"
					placeholder="Whereabouts unknown"
					value={npc.currentLocationId}
				/>
				<MetaField
					label="Origin"
					placeholder="Unknown origin"
					value={npc.originLocationId}
				/>
				<MetaField
					label="First Encountered"
					placeholder="Not recorded"
					value={npc.sessionEncounteredId}
				/>
				{npc.foundryActorId && (
					<MetaField label="Foundry Actor" value={npc.foundryActorId} />
				)}
			</div>

			<Separator />

			{/* Lore */}
			<div className="space-y-6">
				<Section
					content={npc.appearance}
					placeholder="No appearance description recorded."
					title="Appearance"
				/>
				<Section
					content={npc.personality}
					placeholder="No personality notes recorded."
					title="Personality"
				/>
				<Section
					content={npc.backstory}
					placeholder="The history of this character remains a mystery."
					title="Backstory"
				/>
			</div>

			<Separator />

			{/* Notes */}
			<div className="space-y-6">
				<Section
					content={npc.dmNotes}
					muted
					placeholder="No DM notes yet."
					title="DM Notes"
				/>
				<Section
					content={npc.playerNotes}
					muted
					placeholder="The party hasn't noted anything about this character."
					title="Player Notes"
				/>
			</div>

			{npc.lastFoundrySyncAt && (
				<p className="text-xs text-muted-foreground/50">
					Last synced with Foundry:{" "}
					{new Date(npc.lastFoundrySyncAt).toLocaleString()}
				</p>
			)}
		</div>
	);
}

function MetaField({
	label,
	value,
	placeholder = "—",
}: {
	label: string;
	value?: string | null;
	placeholder?: string;
}) {
	return (
		<div className="space-y-0.5">
			<p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
				{label}
			</p>
			<p
				className={`text-sm ${value ? "" : "italic text-muted-foreground/50"}`}
			>
				{value ?? placeholder}
			</p>
		</div>
	);
}

function Section({
	title,
	content,
	muted = false,
	placeholder,
}: {
	title: string;
	content?: string | null;
	muted?: boolean;
	placeholder: string;
}) {
	return (
		<div className="space-y-1.5">
			<h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
				{title}
			</h2>
			{content ? (
				<p
					className={`text-sm leading-relaxed whitespace-pre-wrap ${muted ? "text-muted-foreground" : ""}`}
				>
					{content}
				</p>
			) : (
				<p className="text-sm italic text-muted-foreground/50">{placeholder}</p>
			)}
		</div>
	);
}
