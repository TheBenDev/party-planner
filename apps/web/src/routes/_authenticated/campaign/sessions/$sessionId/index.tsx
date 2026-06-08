import { createFileRoute } from "@tanstack/react-router";
import { SessionDetailPage } from "@/features/sessions/routes/session-detail";

export const Route = createFileRoute(
	"/_authenticated/campaign/sessions/$sessionId/",
)({
	component: SessionDetailPage,
});
