import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/shared/hooks/auth";
import { client } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/query-keys";
import type {
	CreateRegionRequest,
	RemoveRegionRequest,
	UpdateRegionRequest,
} from "../types";

export function useRegionData() {
	const queryClient = useQueryClient();
	const { campaign } = useAuth();
	const campaignId = campaign?.campaign.id ?? "";

	const invalidateList = () =>
		queryClient.invalidateQueries({
			queryKey: queryKeys.regions.list(campaignId),
		});

	const createRegion = useMutation({
		mutationFn: (input: CreateRegionRequest) => {
			return client.region.createRegion(input);
		},
		onSuccess: invalidateList,
	});

	const updateRegion = useMutation({
		mutationFn: (input: UpdateRegionRequest) =>
			client.region.updateRegion(input),
		onSuccess: async (_, variables) => {
			queryClient.removeQueries({
				queryKey: queryKeys.regions.detail(variables.id),
			});
			await invalidateList();
		},
	});

	const deleteRegion = useMutation({
		mutationFn: (input: RemoveRegionRequest) =>
			client.region.removeRegion(input),
		onSuccess: async (_, variables) => {
			queryClient.removeQueries({
				queryKey: queryKeys.regions.detail(variables.id),
			});
			await invalidateList();
		},
	});

	return { createRegion, deleteRegion, updateRegion };
}
