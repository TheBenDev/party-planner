import { zodResolver } from "@hookform/resolvers/zod";
import { QuestStatusEnum, QuestTypeEnum } from "@planner/enums/quest";
import { UserRole } from "@planner/enums/user";
import { Navigate, useNavigate, useParams } from "@tanstack/react-router";
import { Plus, X } from "lucide-react";
import {
	type Control,
	Controller,
	type Resolver,
	type UseFormRegister,
	useFieldArray,
	useForm,
} from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useQuest } from "@/features/quests/hooks/useQuest";
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
import { useQuestData } from "../hooks/useQuestData";

const optionalInt = (min = 0, max?: number): z.ZodType<number | undefined> =>
	z.preprocess(
		(value) => {
			if (value === "" || value === undefined || value === null)
				return undefined;
			const n = Number(value);
			return Number.isNaN(n) ? undefined : n;
		},
		z
			.number()
			.int()
			.min(min)
			.max(max ?? Number.MAX_SAFE_INTEGER)
			.optional(),
	);

const QUEST_TYPE_LABELS: Record<QuestTypeEnum, string> = {
	[QuestTypeEnum.MAINLAND]: "Mainland",
	[QuestTypeEnum.COLONY]: "Colony",
};

export const questEditSchema = z.object({
	description: z.string().optional(),
	reward: z
		.object({
			colony: z
				.object({
					buildingMaterials: optionalInt(),
					colonistCount: optionalInt(),
					food: optionalInt(),
					gold: optionalInt(),
					morale: optionalInt(0, 100),
				})
				.optional(),
			loot: z
				.array(
					z.object({
						description: z.string().optional(),
						name: z.string().min(1, "Name is required"),
						quantity: optionalInt(1),
					}),
				)
				.optional(),
		})
		.optional(),
	status: z.enum(QuestStatusEnum),
	title: z.string().min(1),
	type: z.enum(QuestTypeEnum).optional(),
});

export type QuestEditForm = z.infer<typeof questEditSchema>;

export function QuestEditPage() {
	const { questId } = useParams({
		from: "/_authenticated/campaign/quests/$questId/edit",
	});
	const { role, campaignIsLoading } = useAuth();

	const { data, isPending, isError } = useQuest(questId);

	if (campaignIsLoading) return <div>Loading...</div>;
	if (role !== UserRole.DUNGEON_MASTER) {
		return (
			<Navigate params={{ questId }} replace to="/campaign/quests/$questId" />
		);
	}

	if (isPending) return <div>Loading...</div>;
	if (isError || !data?.quest) return <div>Quest not found.</div>;

	return <QuestEditFormInner quest={data.quest} questId={questId} />;
}

type Quest = NonNullable<
	Awaited<ReturnType<typeof client.quest.getQuest>>["quest"]
>;

function LootRewardFields({
	control,
	register,
}: {
	control: Control<QuestEditForm>;
	register: UseFormRegister<QuestEditForm>;
}) {
	const { fields, append, remove } = useFieldArray({
		control,
		name: "reward.loot",
	});

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-sm font-medium">Loot Rewards</h2>
					<p className="text-xs text-muted-foreground mt-0.5">
						Items awarded on completion.
					</p>
				</div>
				<Button
					onClick={() =>
						append({ description: "", name: "", quantity: undefined })
					}
					size="sm"
					type="button"
					variant="outline"
				>
					<Plus className="w-4 h-4 mr-1.5" />
					Add Item
				</Button>
			</div>

			{fields.length > 0 && (
				<div className="border rounded-2xl divide-y">
					{fields.map((field, index) => (
						<div className="p-4 space-y-3" key={field.id}>
							<div className="flex items-end gap-3">
								<div className="flex-1 space-y-2">
									<Label className="text-xs">Name</Label>
									<Input
										{...register(`reward.loot.${index}.name`)}
										placeholder="Item name"
									/>
								</div>
								<div className="w-24 space-y-2">
									<Label className="text-xs">Qty</Label>
									<Input
										{...register(`reward.loot.${index}.quantity`, {
											valueAsNumber: true,
										})}
										min={1}
										placeholder="—"
										type="number"
									/>
								</div>
								<button
									className="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
									onClick={() => remove(index)}
									type="button"
								>
									<X className="w-4 h-4" />
									<span className="sr-only">Remove item</span>
								</button>
							</div>
							<div className="space-y-2">
								<Label className="text-xs">Description</Label>
								<Input
									{...register(`reward.loot.${index}.description`)}
									placeholder="Optional description"
								/>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

const COLONY_REWARD_FIELDS: {
	key: "gold" | "food" | "buildingMaterials" | "colonistCount" | "morale";
	label: string;
	placeholder: string;
}[] = [
	{ key: "gold", label: "Gold", placeholder: "0" },
	{ key: "food", label: "Food", placeholder: "0" },
	{ key: "buildingMaterials", label: "Materials", placeholder: "0" },
	{ key: "colonistCount", label: "Colonists", placeholder: "0" },
	{ key: "morale", label: "Morale (max 100)", placeholder: "0" },
];

function QuestEditFormInner({
	quest,
	questId,
}: {
	quest: Quest;
	questId: string;
}) {
	const { updateQuest } = useQuestData();
	const navigate = useNavigate();

	const form = useForm<QuestEditForm>({
		defaultValues: {
			description: quest.description ?? "",
			reward: {
				colony: {
					buildingMaterials: quest.reward?.colony?.buildingMaterials,
					colonistCount: quest.reward?.colony?.colonistCount,
					food: quest.reward?.colony?.food,
					gold: quest.reward?.colony?.gold,
					morale: quest.reward?.colony?.morale,
				},
				loot: quest.reward?.loot ?? [],
			},
			status: quest.status ?? QuestStatusEnum.ACTIVE,
			title: quest.title,
			type: quest.type,
		},
		resolver: zodResolver(questEditSchema) as Resolver<QuestEditForm>,
	});

	return (
		<form
			className="max-w-3xl mx-auto px-4 py-8 space-y-6"
			onSubmit={form.handleSubmit((formData) => {
				const colonyFields = formData.reward?.colony;
				const hasColony =
					colonyFields !== undefined &&
					Object.values(colonyFields).some((v) => (v ?? 0) > 0);

				const lootFields = formData.reward?.loot;
				const reward = {
					colony: hasColony ? colonyFields : undefined,
					loot: lootFields && lootFields.length > 0 ? lootFields : undefined,
				};
				updateQuest.mutate(
					{ id: questId, ...formData, reward },
					{
						onError: () => toast.error("Failed to update quest"),
						onSuccess: () =>
							navigate({
								params: { questId },
								to: "/campaign/quests/$questId",
							}),
					},
				);
			})}
		>
			<div>
				<h1 className="text-2xl font-semibold">Edit Quest</h1>
				<p className="text-sm text-muted-foreground">Update quest details</p>
			</div>

			<div className="space-y-2">
				<Label>Title</Label>
				<Input {...form.register("title")} />
			</div>

			<div className="grid grid-cols-2 gap-4">
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
									{Object.values(QuestStatusEnum).map((v) => (
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
					<Label>Type</Label>
					<Controller
						control={form.control}
						name="type"
						render={({ field }) => (
							<Select onValueChange={field.onChange} value={field.value ?? ""}>
								<SelectTrigger>
									<SelectValue placeholder="Select type" />
								</SelectTrigger>
								<SelectContent>
									{Object.values(QuestTypeEnum).map((v) => (
										<SelectItem key={v} value={v}>
											{QUEST_TYPE_LABELS[v]}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					/>
				</div>
			</div>

			<div className="space-y-2">
				<Label>Description</Label>
				<Textarea
					{...form.register("description")}
					placeholder="Describe the quest..."
				/>
			</div>

			<div className="space-y-4">
				<div>
					<h2 className="text-sm font-medium">Colony Reward</h2>
					<p className="text-xs text-muted-foreground mt-0.5">
						Resources added to the colony on completion.
					</p>
				</div>
				<div className="border rounded-2xl p-5 grid grid-cols-3 gap-4">
					{COLONY_REWARD_FIELDS.map(({ key, label, placeholder }) => (
						<div className="space-y-2" key={key}>
							<Label className="text-xs">{label}</Label>
							<Input
								{...form.register(`reward.colony.${key}`, {
									valueAsNumber: true,
								})}
								min={0}
								placeholder={placeholder}
								type="number"
							/>
						</div>
					))}
				</div>
			</div>

			<LootRewardFields control={form.control} register={form.register} />

			<div className="flex justify-end gap-2 pt-4">
				<Button
					onClick={() =>
						navigate({ params: { questId }, to: "/campaign/quests/$questId" })
					}
					type="button"
					variant="outline"
				>
					Cancel
				</Button>
				<Button disabled={updateQuest.isPending} type="submit">
					Save Changes
				</Button>
			</div>
		</form>
	);
}
