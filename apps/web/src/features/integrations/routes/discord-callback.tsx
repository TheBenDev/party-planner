import { IntegrationSource } from "@planner/enums/integration";
import { UserRole } from "@planner/enums/user";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/shared/hooks/auth";
import { client } from "@/shared/lib/client";

function decodeState(
	state: string,
): { campaignId: string; oauthState: string } | null {
	try {
		return JSON.parse(atob(state));
	} catch {
		return null;
	}
}

export function DiscordCallbackPage() {
	const navigate = useNavigate();
	const { role, campaignIsLoading } = useAuth();
	const { code, state } = useSearch({ from: "/_authenticated/campaign/integrations/discord/callback" });
	const {
		mutate: createIntegration,
		isPending,
		isError,
	} = useMutation({
		mutationFn: (campaignId: string) =>
			client.campaignIntegration.createCampaignIntegration({
				campaignId,
				code,
				source: IntegrationSource.DISCORD,
			}),
		onError: () => {
			navigate({ to: "/campaign/integrations/discord" });
		},
		onSuccess: () => {
			navigate({ to: "/campaign/integrations/discord" });
		},
	});

	useEffect(() => {
		if (!(code && state)) {
			sessionStorage.removeItem("discord_oauth_state");
			navigate({ to: "/campaign/integrations" });
			return;
		}
		if (campaignIsLoading) return;
		if (role !== UserRole.DUNGEON_MASTER) {
			sessionStorage.removeItem("discord_oauth_state");
			navigate({ to: "/campaign/integrations" });
			return;
		}

		const decoded = decodeState(state);
		const expectedState = sessionStorage.getItem("discord_oauth_state");
		sessionStorage.removeItem("discord_oauth_state");
		if (
			!(decoded?.campaignId && decoded.oauthState) ||
			decoded.oauthState !== expectedState
		) {
			navigate({ to: "/campaign/integrations" });
			return;
		}

		createIntegration(decoded.campaignId);
	}, [campaignIsLoading, role, code, state, navigate, createIntegration]);

	if (isError) {
		return (
			<div className="mx-auto max-w-2xl py-8">
				<div className="flex flex-col items-center gap-3 text-center">
					<p className="text-sm font-medium text-destructive">
						Failed to connect Discord
					</p>
					<p className="text-sm text-muted-foreground">
						Something went wrong linking your server. Redirecting you back…
					</p>
				</div>
			</div>
		);
	}

	if (isPending) {
		return (
			<div className="mx-auto max-w-2xl py-8">
				<div className="flex flex-col items-center gap-3 text-center">
					<div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-foreground" />
					<p className="text-sm text-muted-foreground">
						Connecting your Discord server…
					</p>
				</div>
			</div>
		);
	}

	return null;
}
