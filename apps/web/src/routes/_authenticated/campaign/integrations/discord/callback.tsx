import { createFileRoute } from "@tanstack/react-router";
import { DiscordCallbackPage } from "@/features/integrations/routes/discord-callback";

export const Route = createFileRoute("/_authenticated/campaign/integrations/discord/callback")({
	component: DiscordCallbackPage,
	validateSearch: (search: Record<string, string>) => ({
		code: search.code ?? "",
		permissions: search.permissions ?? "",
		state: search.state ?? "",
	}),
});
