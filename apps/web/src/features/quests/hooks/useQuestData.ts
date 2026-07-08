import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/shared/hooks/auth";
import { client } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/query-keys";
import type {
	CompleteQuestRequest,
	CreateQuestRequest,
	RemoveQuestRequest,
	UpdateQuestRequest,
} from "../types";

export function useQuestData() {
	const queryClient = useQueryClient();
	const { campaign } = useAuth();
	const campaignId = campaign?.campaign.id ?? "";

	const invalidateList = () =>
		queryClient.invalidateQueries({
			queryKey: queryKeys.quests.list(campaignId),
		});
	const invalidateDetail = (id: string) =>
		queryClient.invalidateQueries({ queryKey: queryKeys.quests.detail(id) });

	const createQuest = useMutation({
		mutationFn: (input: CreateQuestRequest) => client.quest.createQuest(input),
		onSuccess: invalidateList,
	});

	const updateQuest = useMutation({
		mutationFn: (input: UpdateQuestRequest) => client.quest.updateQuest(input),
		onSuccess: (_, variables) =>
			Promise.all([invalidateDetail(variables.id), invalidateList()]),
	});

	const completeQuest = useMutation({
		mutationFn: (input: CompleteQuestRequest) =>
			client.quest.completeQuest(input),
		onSuccess: (data, variables) => {
			const invalidations: Promise<unknown>[] = [
				invalidateDetail(variables.id),
				invalidateList(),
			];
			if (data.quest.reward?.colony) {
				invalidations.push(
					queryClient.invalidateQueries({
						queryKey: queryKeys.colony.detail(campaignId),
					}),
				);
			}
			return Promise.all(invalidations);
		},
	});

	const deleteQuest = useMutation({
		mutationFn: (input: RemoveQuestRequest) => client.quest.removeQuest(input),
		onSuccess: invalidateList,
	});

	return { completeQuest, createQuest, deleteQuest, updateQuest };
}
