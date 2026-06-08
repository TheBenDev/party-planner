import { createFileRoute } from "@tanstack/react-router";
import { InvitePlayerPage } from "@/features/players/routes/invite";

export const Route = createFileRoute("/_authenticated/campaign/settings/invite/")({
	component: InvitePlayerPage,
});
