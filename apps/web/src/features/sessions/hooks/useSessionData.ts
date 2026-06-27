import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/shared/hooks/auth";
import { client } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/query-keys";
import type { UpdateSessionRequest } from "../types";

export function useSessionData() {
	const queryClient = useQueryClient();
	const { campaign } = useAuth();
	const campaignId = campaign?.campaign.id ?? "";

	const updateSession = useMutation({
		mutationFn: (input: UpdateSessionRequest) => client.session.updateSession(input),
		onSuccess: (_, variables) =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey: queryKeys.sessions.detail(variables.id) }),
				queryClient.invalidateQueries({ queryKey: queryKeys.sessions.list(campaignId) }),
				queryClient.invalidateQueries({ queryKey: queryKeys.sessionSeries.list(campaignId) }),
			]),
	});

	return { updateSession };
}
