import { createFileRoute } from "@tanstack/react-router";
import { NPCSPage } from "@/features/npcs/routes/npcs-list";

export const Route = createFileRoute("/_authenticated/campaign/npcs/")({
	component: NPCSPage,
});
