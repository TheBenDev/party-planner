import { createFileRoute } from "@tanstack/react-router";
import { SessionsPage } from "@/features/sessions/routes/sessions-list";

export const Route = createFileRoute("/_authenticated/campaign/sessions/")({
	component: SessionsPage,
});
