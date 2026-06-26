import { zodResolver } from "@hookform/resolvers/zod";
import {
	CharacterStatusEnum,
	RelationToPartyEnum,
} from "@planner/enums/character";
import { UserRole } from "@planner/enums/user";
import { Navigate, useNavigate, useParams } from "@tanstack/react-router";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useNpc } from "@/features/npcs/hooks/useNpc";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import { useAuth } from "@/shared/hooks/auth";
import type { client } from "@/shared/lib/client";
import { useNpcData } from "../hooks/useNpcData";

export const npcEditSchema = z.object({
	age: z.string().optional(),
	aliases: z.array(z.object({ value: z.string() })),
	appearance: z.string().optional(),
	avatar: z.string().optional(),
	backstory: z.string().optional(),
	dmNotes: z.string().optional(),
	isKnownToParty: z.boolean(),
	knownName: z.string().optional(),
	name: z.string().min(1),
	personality: z.string().optional(),
	playerNotes: z.string().optional(),
	race: z.string().optional(),
	relationToPartyStatus: z.enum(RelationToPartyEnum),
	status: z.enum(CharacterStatusEnum),
});

export type NpcEditForm = z.infer<typeof npcEditSchema>;

export function NpcEditPage() {
	const { npcId } = useParams({
		from: "/_authenticated/campaign/npcs/$npcId/edit",
	});
	const { role, campaignIsLoading } = useAuth();

	const { data: npc, isPending, isError } = useNpc(npcId);

	if (campaignIsLoading) return <div>Loading...</div>;
	if (role !== UserRole.DUNGEON_MASTER) {
		return <Navigate params={{ npcId }} replace to="/campaign/npcs/$npcId" />;
	}

	if (isPending) return <div>Loading...</div>;
	if (isError || !npc?.npc) return <div>NPC not found.</div>;

	return <NpcEditFormInner npc={npc.npc} npcId={npcId} />;
}

type Npc = NonNullable<
	Awaited<ReturnType<typeof client.npc.getNonPlayerCharacter>>["npc"]
>;

function NpcEditFormInner({ npc, npcId }: { npc: Npc; npcId: string }) {
	const { updateNpc } = useNpcData();
	const navigate = useNavigate();

	const form = useForm<NpcEditForm>({
		defaultValues: {
			age: npc.age ?? "",
			aliases: npc.aliases?.map((a) => ({ value: a })) ?? [],
			appearance: npc.appearance ?? "",
			avatar: npc.avatar ?? "",
			backstory: npc.backstory ?? "",
			dmNotes: npc.dmNotes ?? "",
			isKnownToParty: npc.isKnownToParty,
			knownName: npc.knownName ?? "",
			name: npc.name,
			personality: npc.personality ?? "",
			playerNotes: npc.playerNotes ?? "",
			race: npc.race ?? "",
			relationToPartyStatus: npc.relationToPartyStatus,
			status: npc.status,
		},
		resolver: zodResolver(npcEditSchema),
	});

	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: "aliases",
	});

	return (
		<form
			className="max-w-3xl mx-auto px-4 py-8 space-y-6"
			onSubmit={form.handleSubmit((data) =>
				updateNpc.mutate(
					{ id: npcId, ...data, aliases: data.aliases.map((a) => a.value) },
					{
						onError: () => toast.error("Failed to update NPC"),
						onSuccess: () => {
							navigate({ params: { npcId }, to: "/campaign/npcs/$npcId" });
							toast.success("NPC updated");
						},
					},
				),
			)}
		>
			<div>
				<h1 className="text-2xl font-semibold">Edit NPC</h1>
				<p className="text-sm text-muted-foreground">
					Update character details
				</p>
			</div>

			<div className="space-y-2">
				<Label>Name</Label>
				<Input {...form.register("name")} />
			</div>

			<div className="space-y-2">
				<Label>Known Name</Label>
				<Input {...form.register("knownName")} />
			</div>

			<div className="space-y-2">
				<Label>Aliases</Label>
				<div className="flex gap-2">
					<Input
						onKeyDown={(e) => {
							if (e.key !== "Enter") return;
							e.preventDefault();

							const value = e.currentTarget.value.trim();
							if (!value) return;

							append({ value });
							e.currentTarget.value = "";
						}}
						placeholder="Add alias..."
					/>
				</div>
				<div className="flex flex-wrap gap-2 pt-2">
					{fields.map((field, index) => (
						<div
							className="flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
							key={field.id}
						>
							<span>{field.value}</span>
							<button onClick={() => remove(index)} type="button">
								×
							</button>
						</div>
					))}
				</div>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div className="space-y-2">
					<Label>Race</Label>
					<Input {...form.register("race")} />
				</div>
				<div className="space-y-2">
					<Label>Age</Label>
					<Input {...form.register("age")} />
				</div>
			</div>

			<div className="space-y-2">
				<Label>Status</Label>
				<Controller
					control={form.control}
					name="status"
					render={({ field }) => (
						<Select onValueChange={field.onChange} value={field.value}>
							<SelectTrigger>
								<SelectValue placeholder="Select status" />
							</SelectTrigger>
							<SelectContent>
								{Object.values(CharacterStatusEnum).map((v) => (
									<SelectItem key={v} value={v}>
										{v}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
				/>
			</div>

			<div className="space-y-2">
				<Label>Relation to Party</Label>
				<Controller
					control={form.control}
					name="relationToPartyStatus"
					render={({ field }) => (
						<Select onValueChange={field.onChange} value={field.value}>
							<SelectTrigger>
								<SelectValue placeholder="Select relation" />
							</SelectTrigger>
							<SelectContent>
								{Object.values(RelationToPartyEnum).map((v) => (
									<SelectItem key={v} value={v}>
										{v}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
				/>
			</div>

			<Textarea {...form.register("appearance")} placeholder="Appearance" />
			<Textarea {...form.register("backstory")} placeholder="Backstory" />
			<Textarea {...form.register("personality")} placeholder="Personality" />
			<Textarea {...form.register("dmNotes")} placeholder="DM Notes" />
			<Textarea {...form.register("playerNotes")} placeholder="Player Notes" />

			<div className="flex justify-end gap-2 pt-4">
				<Button
					onClick={() =>
						navigate({ params: { npcId }, to: "/campaign/npcs/$npcId" })
					}
					type="button"
					variant="outline"
				>
					Cancel
				</Button>
				<Button disabled={updateNpc.isPending} type="submit">
					Save Changes
				</Button>
			</div>
		</form>
	);
}
