import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/query-keys";
import type { CreateCampaignRequest, UpdateCampaignRequest } from "../types";

export function useCampaignData() {
	const queryClient = useQueryClient();

	const invalidateCampaign = () =>
		queryClient.invalidateQueries({ queryKey: queryKeys.auth.campaign() });

	const createCampaign = useMutation({
		mutationFn: (input: CreateCampaignRequest) =>
			client.campaign.createCampaign(input),
		onSuccess: invalidateCampaign,
	});

	const updateCampaign = useMutation({
		mutationFn: (input: UpdateCampaignRequest) =>
			client.campaign.updateCampaign(input),
		onSuccess: invalidateCampaign,
	});

	const deleteCampaign = useMutation({
		mutationFn: (id: string) => client.campaign.deleteCampaign({ id }),
		onSuccess: invalidateCampaign,
	});

	return { createCampaign, deleteCampaign, updateCampaign };
}
