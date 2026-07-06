import { useQuery } from "@tanstack/react-query";
import { client } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/query-keys";

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
