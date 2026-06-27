import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/shared/hooks/auth";
import { client } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/query-keys";
import type { ConnectGoogleCalendarRequest } from "../types";

export function useUserIntegrationData() {
	const queryClient = useQueryClient();
	const { user } = useAuth();
	const userId = user?.user.id ?? "";

	const connectGoogleCalendar = useMutation({
		mutationFn: (input: ConnectGoogleCalendarRequest) =>
			client.userIntegration.connectGoogleCalendar(input),
	});

	const disconnectGoogleCalendar = useMutation({
		mutationFn: () => client.userIntegration.disconnectGoogleCalendar({}),
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: queryKeys.userIntegrations.bySource(userId, "GOOGLE_CALENDAR"),
			}),
	});

	return { connectGoogleCalendar, disconnectGoogleCalendar };
}
