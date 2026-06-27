import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/shared/hooks/auth";
import { client } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/query-keys";
import type {
	CreateQuestRequest,
	RemoveQuestRequest,
	UpdateQuestRequest,
} from "../types";

export function useQuestData() {
	const queryClient = useQueryClient();
	const { campaign } = useAuth();
	const campaignId = campaign?.campaign.id ?? "";

	const invalidateList = () =>
		queryClient.invalidateQueries({ queryKey: queryKeys.quests.list(campaignId) });

	const createQuest = useMutation({
		mutationFn: (input: CreateQuestRequest) => client.quest.createQuest(input),
		onSuccess: invalidateList,
	});

	const updateQuest = useMutation({
		mutationFn: (input: UpdateQuestRequest) => client.quest.updateQuest(input),
		onSuccess: (_, variables) =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey: queryKeys.quests.detail(variables.id) }),
				invalidateList(),
			]),
	});

	const deleteQuest = useMutation({
		mutationFn: (input: RemoveQuestRequest) => client.quest.removeQuest(input),
		onSuccess: invalidateList,
	});

	return { createQuest, deleteQuest, updateQuest };
}
