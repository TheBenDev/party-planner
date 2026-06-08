import { useQuery } from "@tanstack/react-query";
import { client } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/query-keys";

export function useQuest(questId: string) {
	return useQuery({
		queryFn: () => client.quest.getQuest({ id: questId }),
		queryKey: queryKeys.quests.detail(questId),
	});
}
