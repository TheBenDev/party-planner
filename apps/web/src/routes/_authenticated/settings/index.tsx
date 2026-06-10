import { createFileRoute } from "@tanstack/react-router";
import { UserSettingsPage } from "@/features/integrations/routes/settings";

export const Route = createFileRoute("/_authenticated/settings/")({
	component: UserSettingsPage,
});
