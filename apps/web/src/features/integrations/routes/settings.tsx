import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useUserIntegrationData } from "../hooks/useUserIntegrationData";
import { Button } from "@/shared/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { useAuth } from "@/shared/hooks/auth";
import { client } from "@/shared/lib/client";
import { env } from "@/shared/lib/env";
import { queryKeys } from "@/shared/lib/query-keys";

function buildGoogleOAuthUrl(): string {
	const oauthState = crypto.randomUUID();
	sessionStorage.setItem("google_calendar_oauth_state", oauthState);

	const params = new URLSearchParams({
		access_type: "offline",
		client_id: env.VITE_GOOGLE_CLIENT_ID,
		prompt: "consent",
		redirect_uri: `${env.VITE_APP_URL}/settings/google-calendar/callback`,
		response_type: "code",
		scope:
			"https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly",
		state: btoa(JSON.stringify({ oauthState })),
	});

	return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function UserSettingsPage() {
	const { disconnectGoogleCalendar } = useUserIntegrationData();
	const { user: userAuth } = useAuth();
	const userId = userAuth?.user?.id;
	const [isConnecting, setIsConnecting] = useState(false);

	const { data: calendarStatus, isLoading: isStatusLoading } = useQuery({
		enabled: !!userId,
		queryFn: () => client.userIntegration.getGoogleCalendarStatus({}),
		queryKey: queryKeys.userIntegrations.bySource(
			userId ?? "",
			"GOOGLE_CALENDAR",
		),
	});

	const handleConnect = () => {
		setIsConnecting(true);
		window.location.href = buildGoogleOAuthUrl();
	};

	const isConnected = calendarStatus?.connected ?? false;

	let cardContent: React.ReactNode;
	if (isStatusLoading) {
		cardContent = <div className="text-sm text-muted-foreground">Loading…</div>;
	} else if (isConnected) {
		cardContent = (
			<div className="space-y-4">
				<p className="text-sm text-green-600">
					✓ Your Google Calendar is connected
				</p>
				<Button
					disabled={disconnectGoogleCalendar.isPending}
					onClick={() => disconnectGoogleCalendar.mutate(undefined, { onError: () => toast.error("Something went wrong disconnecting your Google Calendar") })}
					variant="destructive"
				>
					{disconnectGoogleCalendar.isPending ? "Disconnecting…" : "Disconnect"}
				</Button>
			</div>
		);
	} else {
		cardContent = (
			<div className="space-y-4">
				<p className="text-sm text-muted-foreground">Not connected</p>
				<Button disabled={isConnecting} onClick={handleConnect}>
					{isConnecting ? "Connecting…" : "Connect Google Calendar"}
				</Button>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-2xl py-8 px-4">
			<div className="mb-8">
				<h1 className="text-3xl font-bold">Account Settings</h1>
				<p className="text-muted-foreground">
					Manage your account and connected services
				</p>
			</div>

			<div className="space-y-6">
				<div>
					<h2 className="text-xl font-semibold mb-4">Connected Accounts</h2>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<span>Google Calendar</span>
							</CardTitle>
							<CardDescription>
								Connect your personal Google Calendar to sync sessions and check
								availability
							</CardDescription>
						</CardHeader>
						<CardContent>{cardContent}</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
