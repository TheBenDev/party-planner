import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { client } from "@/lib/client";

export const Route = createFileRoute(
	"/_authenticated/campaign/integrations/discord/callback",
)({
	component: DiscordCallbackPage,
	validateSearch: (search: Record<string, unknown>) => ({
		code: (search.code as string) ?? "",
		guild_id: (search.guild_id as number) ?? "",
		permissions: (search.permissions as string) ?? "",
		state: (search.state as string) ?? "",
	}),
});

// TODO The callback trusts any decodable state containing campaignId. Without a nonce tied to the initiating session, this flow is vulnerable to forged callback links.
function decodeState(state: string): { campaignId: string } | null {
	try {
		return JSON.parse(atob(state));
	} catch {
		return null;
	}
}

function DiscordCallbackPage() {
	const navigate = useNavigate();
	const { code, guild_id, state } = Route.useSearch();
	const {
		mutate: createIntegration,
		isPending,
		isError,
	} = useMutation({
		mutationFn: (campaignId: string) =>
			client.campaignIntegration.createCampaignIntegration({
				campaignId,
				// TODO set up a way to add channelId
				channelId: "placeholder",
				serverId: String(guild_id),
			}),
		onError: () => {
			navigate({ to: "/campaign/integrations/discord" });
		},
		onSuccess: () => {
			navigate({ to: "/campaign/integrations/discord" });
		},
	});

	useEffect(() => {
		if (!(code && guild_id && state)) {
			navigate({ to: "/campaign/integrations" });
			return;
		}

		const decoded = decodeState(state);
		if (!decoded?.campaignId) {
			navigate({ to: "/campaign/integrations" });
			return;
		}

		createIntegration(decoded.campaignId);
	}, []);

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
