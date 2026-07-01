import { useQuery } from "@tanstack/react-query";
import { client } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/query-keys";

export function useRegion(regionId: string) {
	return useQuery({
		queryFn: () => client.region.getRegion({ id: regionId }),
		queryKey: queryKeys.regions.detail(regionId),
	});
}
