import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { useUserIntegrationData } from "../hooks/useUserIntegrationData";

function decodeState(
	state: string,
): { oauthState: string } | null {
	try {
		return JSON.parse(atob(state));
	} catch {
		return null;
	}
}

export function GoogleCalendarCallbackPage() {
	const navigate = useNavigate();
	const { code, state } = useSearch({
		from: "/_authenticated/settings/google-calendar/callback",
	});
	const { connectGoogleCalendar } = useUserIntegrationData();

	useEffect(() => {
		if (!(code && state)) {
			sessionStorage.removeItem("google_calendar_oauth_state");
			navigate({ to: "/settings" });
			return;
		}

		const decoded = decodeState(state);
		const expectedState = sessionStorage.getItem("google_calendar_oauth_state");
		sessionStorage.removeItem("google_calendar_oauth_state");
		if (!decoded?.oauthState || decoded.oauthState !== expectedState) {
			navigate({ to: "/settings" });
			return;
		}

		connectGoogleCalendar.mutate(
			{ code },
			{
				onError: () => navigate({ to: "/settings" }),
				onSuccess: () => navigate({ to: "/settings" }),
			},
		);
	}, [code, state, navigate, connectGoogleCalendar.mutate]);

	if (connectGoogleCalendar.isError) {
		return (
			<div className="mx-auto max-w-2xl py-8">
				<div className="flex flex-col items-center gap-3 text-center">
					<p className="text-sm font-medium text-destructive">
						Failed to connect Google Calendar
					</p>
					<p className="text-sm text-muted-foreground">
						Something went wrong linking your calendar. Redirecting you back…
					</p>
				</div>
			</div>
		);
	}

	if (connectGoogleCalendar.isPending) {
		return (
			<div className="mx-auto max-w-2xl py-8">
				<div className="flex flex-col items-center gap-3 text-center">
					<div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-foreground" />
					<p className="text-sm text-muted-foreground">
						Connecting your Google Calendar…
					</p>
				</div>
			</div>
		);
	}

	return null;
}
