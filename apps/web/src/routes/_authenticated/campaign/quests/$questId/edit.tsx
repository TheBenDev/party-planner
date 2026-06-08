import { createFileRoute } from "@tanstack/react-router";
import { QuestEditPage } from "@/features/quests/routes/quest-edit";

export const Route = createFileRoute(
	"/_authenticated/campaign/quests/$questId/edit",
)({
	component: QuestEditPage,
});
