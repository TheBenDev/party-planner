import { useQuery } from "@tanstack/react-query";
import { client } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/query-keys";

export function useSession(sessionId: string) {
	return useQuery({
		queryFn: () => client.session.getSession({ id: sessionId }),
		queryKey: queryKeys.sessions.detail(sessionId),
	});
}
