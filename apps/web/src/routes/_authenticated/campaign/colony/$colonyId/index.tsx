import { createFileRoute } from "@tanstack/react-router";
import ColonyDetailPage from "@/features/colony/routes/colony-detail";

export const Route = createFileRoute(
	"/_authenticated/campaign/colony/$colonyId/",
)({
	component: ColonyDetailPage,
});
