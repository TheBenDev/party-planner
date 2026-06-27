import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/shared/hooks/auth";
import { client } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/query-keys";
import type {
	CreateNpcInput,
	RemoveNpcRequest,
	UpdateNpcRequest,
} from "../types";

export function useNpcData() {
	const queryClient = useQueryClient();
	const { campaign } = useAuth();
	const campaignId = campaign?.campaign.id ?? "";

	const invalidateList = () =>
		queryClient.invalidateQueries({
			queryKey: queryKeys.npcs.list(campaignId),
		});

	const createNpc = useMutation({
		mutationFn: (input: CreateNpcInput) => client.npc.createNpc(input),
		onSuccess: invalidateList,
	});

	const updateNpc = useMutation({
		mutationFn: (input: UpdateNpcRequest) => client.npc.updateNpc(input),
		onSuccess: (_, variables) =>
			Promise.all([
				queryClient.invalidateQueries({
					queryKey: queryKeys.npcs.detail(variables.id),
				}),
				invalidateList(),
			]),
	});

	const deleteNpc = useMutation({
		mutationFn: (input: RemoveNpcRequest) => client.npc.removeNpc(input),
		onSuccess: (_, variables) =>
			Promise.all([
				queryClient.invalidateQueries({
					queryKey: queryKeys.npcs.detail(variables.id),
				}),
				invalidateList(),
			]),
	});

	return { createNpc, deleteNpc, updateNpc };
}
