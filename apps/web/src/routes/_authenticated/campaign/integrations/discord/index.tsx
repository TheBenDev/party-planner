import { createFileRoute } from "@tanstack/react-router";
import { DiscordIntegrationPage } from "@/features/integrations/routes/discord";

export const Route = createFileRoute("/_authenticated/campaign/integrations/discord/")({
	component: DiscordIntegrationPage,
});
