import { createFileRoute } from "@tanstack/react-router";
import { NpcEditPage } from "@/features/npcs/routes/npc-edit";

export const Route = createFileRoute(
	"/_authenticated/campaign/npcs/$npcId/edit",
)({
	component: NpcEditPage,
});
