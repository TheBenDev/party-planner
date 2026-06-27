import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/shared/hooks/auth";
import { client } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/query-keys";
import type {
	CreateLocationRequest,
	RemoveLocationRequest,
	UpdateLocationRequest,
} from "../types";

export function useLocationData() {
	const queryClient = useQueryClient();
	const { campaign } = useAuth();
	const campaignId = campaign?.campaign.id ?? "";

	const invalidateList = () =>
		queryClient.invalidateQueries({
			queryKey: queryKeys.locations.list(campaignId),
		});

	const createLocation = useMutation({
		mutationFn: (input: CreateLocationRequest) =>
			client.location.createLocation(input),
		onSuccess: invalidateList,
	});

	const updateLocation = useMutation({
		mutationFn: (input: UpdateLocationRequest) =>
			client.location.updateLocation(input),
		onSuccess: async (_, variables) => {
			queryClient.removeQueries({
				queryKey: queryKeys.locations.detail(variables.id),
			});
			await invalidateList();
		},
	});

	const deleteLocation = useMutation({
		mutationFn: (input: RemoveLocationRequest) =>
			client.location.removeLocation(input),
		onSuccess: async (_, variables) => {
			queryClient.removeQueries({
				queryKey: queryKeys.locations.detail(variables.id),
			});
			await invalidateList();
		},
	});

	return { createLocation, deleteLocation, updateLocation };
}
