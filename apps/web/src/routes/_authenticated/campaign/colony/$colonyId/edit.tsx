import { createFileRoute } from "@tanstack/react-router";
import ColonyEditPage from "@/features/colony/routes/colony-edit";

export const Route = createFileRoute(
	"/_authenticated/campaign/colony/$colonyId/edit",
)({
	component: ColonyEditPage,
});
