import { createFileRoute } from "@tanstack/react-router";
import { PrivacyPage } from "@/features/legal/routes/discord-privacy";

export const Route = createFileRoute("/discord/privacy")({
	component: PrivacyPage,
});
