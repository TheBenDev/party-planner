import { zodResolver } from "@hookform/resolvers/zod";
import {
	CharacterStatusEnum,
	HealthConditionEnum,
	RelationToPartyEnum,
} from "@planner/enums/character";
import { UserRole } from "@planner/enums/user";
import { Navigate, useNavigate, useParams } from "@tanstack/react-router";
import { Fragment } from "react/jsx-runtime";
import {
	Controller,
	type Resolver,
	useFieldArray,
	useForm,
} from "react-hook-form";
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
import EditLabel from "../components/EditLabel";
import { useNpcData } from "../hooks/useNpcData";
import type { NonPlayerCharacterSchema, UpdateNpcRequest } from "../types";

export const npcEditSchema = z.object({
	age: z.string().optional(),
	aliases: z.array(z.object({ value: z.string() })).optional(),
	appearance: z.string().optional(),
	avatar: z.string().optional(),
	backstory: z.string().optional(),
	characterClass: z.string().optional(),
	dmNotes: z.string().optional(),
	healthCondition: z.enum(HealthConditionEnum).optional(),
	isKnownToParty: z.boolean().optional(),
	knownName: z.string().optional(),
	labels: z.array(z.object({ value: z.string() })).optional(),
	level: z.coerce.number().int().min(0).max(20).optional(),
	name: z.string().min(1).optional(),
	personality: z.string().optional(),
	playerNotes: z.string().optional(),
	race: z.string().optional(),
	relationToPartyStatus: z.enum(RelationToPartyEnum).optional(),
	role: z.string().optional(),
	status: z.enum(CharacterStatusEnum).optional(),
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

type Npc = z.infer<typeof NonPlayerCharacterSchema>;

function NpcEditFormInner({ npc, npcId }: { npc: Npc; npcId: string }) {
	const { updateNpc } = useNpcData();
	const navigate = useNavigate();

	const {
		handleSubmit,
		getValues,
		control,
		register,
		formState: { dirtyFields },
	} = useForm<NpcEditForm>({
		defaultValues: {
			age: npc.age ?? "",
			aliases: npc.aliases?.map((a) => ({ value: a })) ?? [],
			appearance: npc.appearance ?? "",
			avatar: npc.avatar ?? "",
			backstory: npc.backstory ?? "",
			characterClass: npc.characterClass ?? "",
			dmNotes: npc.dmNotes ?? "",
			healthCondition: npc.healthCondition,
			isKnownToParty: npc.isKnownToParty,
			knownName: npc.knownName ?? "",
			labels: npc.labels?.map((l) => ({ value: l })) ?? [],
			level: npc.level ?? undefined,
			name: npc.name,
			personality: npc.personality ?? "",
			playerNotes: npc.playerNotes ?? "",
			race: npc.race ?? "",
			relationToPartyStatus: npc.relationToPartyStatus,
			role: npc.role ?? "",
			status: npc.status,
		},
		resolver: zodResolver(npcEditSchema) as Resolver<NpcEditForm>,
	});

	const aliases = useFieldArray({ control, name: "aliases" });
	const labels = useFieldArray({ control, name: "labels" });
	const editTextAreas: {
		key: "appearance" | "backstory" | "personality" | "dmNotes" | "playerNotes";
		label: string;
	}[] = [
		{ key: "appearance", label: "Appearance" },
		{ key: "backstory", label: "Backstory" },
		{ key: "personality", label: "Personality" },
		{ key: "dmNotes", label: "DM Notes" },
		{ key: "playerNotes", label: "Player Notes" },
	];

	return (
		<form
			className="max-w-3xl mx-auto px-4 py-8 space-y-6"
			onSubmit={handleSubmit((data) => {
				const dirty = dirtyFields;
				const currentValues = getValues();
				const removedFields: string[] = [];
				const changedData = Object.keys(dirty).reduce(
					(acc, key) => {
						const value = currentValues[key as keyof typeof currentValues];
						acc[key] = value === "" ? null : value;
						if (value === "") removedFields.push(key);
						if (key === "level" && value === undefined) removedFields.push(key);
						return acc;
					},
					{} as Record<string, unknown>,
				);
				return updateNpc.mutate(
					{
						id: npcId,
						...(changedData as Partial<UpdateNpcRequest>),
						aliases: (data.aliases ?? []).map((a) => a.value),
						labels: (data.labels ?? []).map((l) => l.value),
						removedFields,
					},
					{
						onError: () => toast.error("Failed to update NPC"),
						onSuccess: () => {
							navigate({ params: { npcId }, to: "/campaign/npcs/$npcId" });
							toast.success("NPC updated");
						},
					},
				);
			})}
		>
			<div>
				<h1 className="text-2xl font-semibold">Edit NPC</h1>
				<p className="text-sm text-muted-foreground">
					Update character details
				</p>
			</div>

			{/* Identity */}
			<div className="space-y-2">
				<Label>Name</Label>
				<Input {...register("name")} />
			</div>

			<div className="space-y-2">
				<Label>Known Name</Label>
				<Input {...register("knownName")} />
			</div>

			<div className="space-y-2">
				<Label>Aliases</Label>
				<Input
					onKeyDown={(e) => {
						if (e.key !== "Enter") return;
						e.preventDefault();
						const value = e.currentTarget.value.trim();
						if (!value) return;
						aliases.append({ value });
						e.currentTarget.value = "";
					}}
					placeholder="Add alias..."
				/>
				<div className="flex flex-wrap gap-2 pt-2">
					{aliases.fields.map((field, index) => (
						<div
							className="flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
							key={field.id}
						>
							<span>{field.value}</span>
							<button
								onClick={() => {
									aliases.remove(index);
								}}
								type="button"
							>
								×
							</button>
						</div>
					))}
				</div>
			</div>

			{/* Character stats */}
			<div className="grid grid-cols-2 gap-4">
				<div className="space-y-2">
					<Label>Race</Label>
					<Input {...register("race")} />
				</div>
				<div className="space-y-2">
					<Label>Age</Label>
					<Input {...register("age")} />
				</div>
				<div className="space-y-2">
					<Label>Class</Label>
					<Input {...register("characterClass")} placeholder="e.g. Wizard" />
				</div>
				<div className="space-y-2">
					<Label>Level</Label>
					<Input
						{...register("level", {
							setValueAs: (v) => (v === "" ? undefined : Number(v)),
						})}
						max={20}
						min={1}
						placeholder="1–20"
						type="number"
					/>
				</div>
				<div className="space-y-2 col-span-2">
					<Label>Role</Label>
					<Input
						{...register("role")}
						placeholder="e.g. Quest giver, Merchant"
					/>
				</div>
			</div>

			{/* Status */}
			<div className="grid grid-cols-3 gap-4">
				<div className="space-y-2">
					<Label>Health Condition</Label>
					<Controller
						control={control}
						name="healthCondition"
						render={({ field }) => (
							<Select onValueChange={field.onChange} value={field.value}>
								<SelectTrigger>
									<SelectValue placeholder="Select condition" />
								</SelectTrigger>
								<SelectContent>
									{Object.values(HealthConditionEnum).map((v) => (
										<SelectItem key={v} value={v}>
											{v.charAt(0) + v.slice(1).toLowerCase()}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					/>
				</div>

				<div className="space-y-2">
					<Label>Status</Label>
					<Controller
						control={control}
						name="status"
						render={({ field }) => (
							<Select onValueChange={field.onChange} value={field.value}>
								<SelectTrigger>
									<SelectValue placeholder="Select status" />
								</SelectTrigger>
								<SelectContent>
									{Object.values(CharacterStatusEnum).map((v) => (
										<SelectItem key={v} value={v}>
											{v.charAt(0) + v.slice(1).toLowerCase()}
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
						control={control}
						name="relationToPartyStatus"
						render={({ field }) => (
							<Select onValueChange={field.onChange} value={field.value}>
								<SelectTrigger>
									<SelectValue placeholder="Select relation" />
								</SelectTrigger>
								<SelectContent>
									{Object.values(RelationToPartyEnum).map((v) => (
										<SelectItem key={v} value={v}>
											{v.charAt(0) + v.slice(1).toLowerCase()}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					/>
				</div>
			</div>

			{/* Labels */}
			<div className="space-y-2">
				<Label>Labels</Label>
				<Input
					onKeyDown={(e) => {
						if (e.key !== "Enter") return;
						e.preventDefault();
						const value = e.currentTarget.value.trim();
						if (!value) return;
						labels.append({ value });
						e.currentTarget.value = "";
					}}
					placeholder="Add label..."
				/>
				<div className="flex flex-wrap gap-2 pt-2">
					{labels.fields.map((field, index) => (
						<div
							className="flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
							key={field.id}
						>
							<span>{field.value}</span>
							<button onClick={() => labels.remove(index)} type="button">
								×
							</button>
						</div>
					))}
				</div>
			</div>

			{/* Lore */}
			<div className="space-y-2">
				{editTextAreas.map((textArea) => (
					<Fragment key={textArea.key}>
						<EditLabel>{textArea.label}</EditLabel>
						<Textarea
							{...register(textArea.key)}
							placeholder={textArea.label}
						/>
					</Fragment>
				))}
			</div>

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
				<Button
					disabled={
						Object.keys(dirtyFields).length === 0 || updateNpc.isPending
					}
					type="submit"
				>
					Save Changes
				</Button>
			</div>
		</form>
	);
}
