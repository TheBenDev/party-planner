import { createFileRoute } from "@tanstack/react-router";
import { SessionEditPage } from "@/features/sessions/routes/session-edit";

export const Route = createFileRoute(
	"/_authenticated/campaign/sessions/$sessionId/edit",
)({
	component: SessionEditPage,
});
