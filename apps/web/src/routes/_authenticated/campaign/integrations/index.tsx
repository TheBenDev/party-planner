import { createFileRoute } from "@tanstack/react-router";
import { IntegrationsPage } from "@/features/integrations/routes/integrations-list";

export const Route = createFileRoute(
	"/_authenticated/campaign/integrations/",
)({
	component: IntegrationsPage,
});
