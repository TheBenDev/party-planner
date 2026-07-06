import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/shared/hooks/auth";
import { client } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/query-keys";
import type {
	CreateColonyRequest,
	RemoveColonyRequest,
	UpdateColonyRequest,
	UpsertColonyWorkforceRequest,
} from "../types";

export function useColonyData() {
	const queryClient = useQueryClient();
	const { campaign } = useAuth();
	const campaignId = campaign?.campaign.id ?? "";

	const invalidateColony = () =>
		queryClient.invalidateQueries({
			queryKey: queryKeys.colony.detail(campaignId),
		});

	const createColony = useMutation({
		mutationFn: (input: CreateColonyRequest) =>
			client.colony.createColony(input),
		onSuccess: invalidateColony,
	});

	const updateColony = useMutation({
		mutationFn: (input: UpdateColonyRequest) =>
			client.colony.updateColony(input),
		onSuccess: invalidateColony,
	});

	const removeColony = useMutation({
		mutationFn: (input: RemoveColonyRequest) =>
			client.colony.removeColony(input),
		onSuccess: invalidateColony,
	});

	const upsertColonyWorkforce = useMutation({
		mutationFn: (input: UpsertColonyWorkforceRequest) =>
			client.colony.upsertColonyWorkforce(input),
		onSuccess: (_, variables) =>
			queryClient.invalidateQueries({
				queryKey: queryKeys.colony.workforce.list(variables.colonyId),
			}),
	});

	return { createColony, removeColony, updateColony, upsertColonyWorkforce };
}
