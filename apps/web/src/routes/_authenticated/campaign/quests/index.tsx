import { createFileRoute } from "@tanstack/react-router";
import { QuestsPage } from "@/features/quests/routes/quests-list";

export const Route = createFileRoute("/_authenticated/campaign/quests/")({
	component: QuestsPage,
});
