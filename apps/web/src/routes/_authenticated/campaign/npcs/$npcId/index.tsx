import { createFileRoute } from "@tanstack/react-router";
import { NpcDetailPage } from "@/features/npcs/routes/npc-detail";

export const Route = createFileRoute(
	"/_authenticated/campaign/npcs/$npcId/",
)({
	component: NpcDetailPage,
});
