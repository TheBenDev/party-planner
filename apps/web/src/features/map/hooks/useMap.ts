import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "@/shared/lib/client";

const MAP_QUERY_KEY = (campaignId: string) => ["map", campaignId];

export function useMapQuery(campaignId: string) {
	return useQuery({
		queryKey: MAP_QUERY_KEY(campaignId),
		queryFn: () => client.map.getCampaignMap(),
		enabled: !!campaignId,
	});
}

export function useUpsertMapHex(campaignId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: { q: number; r: number; terrain: string; label?: string }) =>
			client.map.upsertMapHex(input),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: MAP_QUERY_KEY(campaignId) }),
	});
}

export function useClearMapHex(campaignId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: { q: number; r: number }) =>
			client.map.clearMapHex(input),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: MAP_QUERY_KEY(campaignId) }),
	});
}
