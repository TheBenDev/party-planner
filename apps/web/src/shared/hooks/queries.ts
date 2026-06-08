import { useQuery } from "@tanstack/react-query";
import { client } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/query-keys";

export function useSession(sessionId: string) {
	return useQuery({
		queryFn: () => client.session.getSession({ id: sessionId }),
		queryKey: queryKeys.sessions.detail(sessionId),
	});
}

export function useNpc(npcId: string) {
	return useQuery({
		queryFn: () => client.npc.getNonPlayerCharacter({ id: npcId }),
		queryKey: queryKeys.npcs.detail(npcId),
	});
}

export function useQuest(questId: string) {
	return useQuery({
		queryFn: () => client.quest.getQuest({ id: questId }),
		queryKey: queryKeys.quests.detail(questId),
	});
}

export function useLocation(locationId: string) {
	return useQuery({
		queryFn: () => client.location.getLocationById({ id: locationId }),
		queryKey: queryKeys.locations.detail(locationId),
	});
}
