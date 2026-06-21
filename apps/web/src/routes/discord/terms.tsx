import { createFileRoute } from "@tanstack/react-router";
import { TermsPage } from "@/features/legal/routes/discord-terms";

export const Route = createFileRoute("/discord/terms")({
	component: TermsPage,
});
