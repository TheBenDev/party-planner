import { useQuery } from "@tanstack/react-query";
import { client } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/query-keys";

export function useNpc(npcId: string) {
	return useQuery({
		queryFn: () => client.npc.getNonPlayerCharacter({ id: npcId }),
		queryKey: queryKeys.npcs.detail(npcId),
	});
}
