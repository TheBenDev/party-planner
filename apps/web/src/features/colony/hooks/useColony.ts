import { useQuery } from "@tanstack/react-query";
import { client } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/query-keys";

export function useColonyNpcs(colonyId: string, campaignId: string) {
	return useQuery({
		queryFn: () => client.npc.listNpcsByColony({ campaignId, colonyId }),
		queryKey: queryKeys.npcs.listByColony(colonyId),
	});
}

export function useColony(campaignId: string) {
	return useQuery({
		queryFn: () => client.colony.getColonyByCampaign(),
		queryKey: queryKeys.colony.detail(campaignId),
	});
}

export function useColonyWorkforce(colonyId: string) {
	return useQuery({
		queryFn: () => client.colony.listColonyWorkforce({ colonyId }),
		queryKey: queryKeys.colony.workforce.list(colonyId),
	});
}
