import { useQuery } from "@tanstack/react-query";
import type { CalendarConflict } from "@/features/integrations/types";
import { client } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/query-keys";

export function useCalendarConflicts({
	campaignId,
	startsAt,
	durationMinutes,
}: {
	campaignId: string;
	startsAt: string;
	durationMinutes: number;
}): { conflicts: CalendarConflict[]; isLoading: boolean } {
	const query = useQuery({
		enabled: Boolean(campaignId && startsAt),
		queryFn: () =>
			client.userIntegration.checkCalendarConflicts({
				campaignId,
				durationMinutes,
				startsAt,
			}),
		queryKey: queryKeys.calendarConflicts(campaignId, startsAt, durationMinutes),
		staleTime: 60_000,
	});
	return {
		conflicts: query.data?.conflicts ?? [],
		isLoading: query.isFetching,
	};
}
