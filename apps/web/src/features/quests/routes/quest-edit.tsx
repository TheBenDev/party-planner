import { zodResolver } from "@hookform/resolvers/zod";
import { Status } from "@planner/enums/quest";
import { UserRole } from "@planner/enums/user";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate, useNavigate, useParams } from "@tanstack/react-router";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
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
import { useQuest } from "@/shared/hooks/queries";
import { client } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/query-keys";

export const questEditSchema = z.object({
	description: z.string().optional(),
	status: z.enum(Status),
	title: z.string().min(1),
});

export type QuestEditForm = z.infer<typeof questEditSchema>;

export function QuestEditPage() {
	const { questId } = useParams({ from: "/_authenticated/campaign/quests/$questId/edit" });
	const { role, campaignIsLoading } = useAuth();

	const { data, isPending, isError } = useQuest(questId);

	if (campaignIsLoading) return <div>Loading...</div>;
	if (role !== UserRole.DUNGEON_MASTER) {
		return <Navigate params={{ questId }} replace to="/campaign/quests/$questId" />;
	}

	if (isPending) return <div>Loading...</div>;
	if (isError || !data?.quest) return <div>Quest not found.</div>;

	return <QuestEditFormInner quest={data.quest} questId={questId} />;
}

type Quest = NonNullable<
	Awaited<ReturnType<typeof client.quest.getQuest>>["quest"]
>;

function QuestEditFormInner({
	quest,
	questId,
}: {
	quest: Quest;
	questId: string;
}) {
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	const form = useForm<QuestEditForm>({
		defaultValues: {
			description: quest.description ?? "",
			status: quest.status ?? Status.ACTIVE,
			title: quest.title,
		},
		resolver: zodResolver(questEditSchema),
	});

	const updateMutation = useMutation({
		mutationFn: (values: QuestEditForm) =>
			client.quest.updateQuest({
				id: questId,
				...values,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.quests.detail(questId) });
			queryClient.invalidateQueries({
				queryKey: queryKeys.quests.list(quest.campaignId),
			});
			navigate({
				params: { questId },
				to: "/campaign/quests/$questId",
			});
		},
	});

	return (
		<form
			className="max-w-3xl mx-auto px-4 py-8 space-y-6"
			onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))}
		>
			<div>
				<h1 className="text-2xl font-semibold">Edit Quest</h1>
				<p className="text-sm text-muted-foreground">Update quest details</p>
			</div>

			<div className="space-y-2">
				<Label>Title</Label>
				<Input {...form.register("title")} />
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
								{Object.values(Status).map((v) => (
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
				<Label>Description</Label>
				<Textarea
					{...form.register("description")}
					placeholder="Describe the quest..."
				/>
			</div>

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
				<Button disabled={updateMutation.isPending} type="submit">
					Save Changes
				</Button>
			</div>
		</form>
	);
}
