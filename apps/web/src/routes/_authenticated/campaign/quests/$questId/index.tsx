import { createFileRoute } from "@tanstack/react-router";
import { QuestDetailPage } from "@/features/quests/routes/quest-detail";

export const Route = createFileRoute(
	"/_authenticated/campaign/quests/$questId/",
)({
	component: QuestDetailPage,
});
