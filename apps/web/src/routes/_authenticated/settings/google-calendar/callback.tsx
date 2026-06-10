import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { GoogleCalendarCallbackPage } from "@/features/integrations/routes/google-calendar-callback";

const callbackSearchSchema = z.object({
	code: z.string().optional(),
	state: z.string().optional(),
});

export const Route = createFileRoute(
	"/_authenticated/settings/google-calendar/callback",
)({
	component: GoogleCalendarCallbackPage,
	validateSearch: (search) => callbackSearchSchema.parse(search),
});
