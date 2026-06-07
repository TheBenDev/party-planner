import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "@/features/players/routes/settings";

export const Route = createFileRoute("/_authenticated/campaign/settings/")({
	component: SettingsPage,
});
