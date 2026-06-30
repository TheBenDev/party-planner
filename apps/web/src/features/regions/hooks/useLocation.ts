import { useQuery } from "@tanstack/react-query";
import { client } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/query-keys";

export function useLocation(locationId: string) {
	return useQuery({
		queryFn: () => client.location.getLocationById({ id: locationId }),
		queryKey: queryKeys.locations.detail(locationId),
	});
}
