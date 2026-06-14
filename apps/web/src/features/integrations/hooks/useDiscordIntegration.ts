import { ORPCError } from "@orpc/client";
import { IntegrationSource } from "@planner/enums/integration";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { client } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/query-keys";

export function useDiscordIntegration({ campaignId }: { campaignId: string }) {
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	const { data, isLoading } = useQuery({
		enabled: !!campaignId,
		queryFn: () =>
			client.campaignIntegration.getCampaignIntegration({
				campaignId,
				source: IntegrationSource.DISCORD,
			}),
		queryKey: queryKeys.integrations.bySource(
			campaignId,
			IntegrationSource.DISCORD,
		),
	});

	const integration = data?.integration ?? null;

	const { mutate: remove, isPending: isRemoving } = useMutation({
		mutationFn: () =>
			client.campaignIntegration.removeCampaignIntegration({
				campaignId,
				source: IntegrationSource.DISCORD,
			}),
		onError: () =>
			toast.error("Failed to remove Discord integration. Please try again."),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.integrations.list(campaignId),
			});
			toast.success("Discord integration removed.");
			navigate({ to: "/campaign/integrations" });
		},
	});

	const { mutate: update, isPending: isUpdating } = useMutation({
		mutationFn: ({
			defaultChannelId,
			enableSessionReminders,
			sessionReminderChannelId,
			sessionRecapChannelId,
			timezone,
		}: {
			defaultChannelId?: string | undefined;
			enableSessionReminders: boolean;
			sessionReminderChannelId?: string | undefined;
			sessionRecapChannelId?: string | undefined;
			timezone?: string;
		}) => {
			if (!integration) throw new Error("integration not loaded");
			return client.campaignIntegration.updateCampaignIntegration({
				campaignId,
				defaultChannel: defaultChannelId
					? { id: defaultChannelId, name: "" }
					: undefined,
				enableSessionReminders,
				recapChannel: sessionRecapChannelId
					? { id: sessionRecapChannelId, name: "" }
					: undefined,
				sessionCreateAnnouncements:
					integration.settings.sessionCreateAnnouncements,
				sessionReminderChannel: sessionReminderChannelId
					? { id: sessionReminderChannelId, name: "" }
					: undefined,
				source: IntegrationSource.DISCORD,
				timezone: timezone ?? integration.settings.timezone,
			});
		},
		onError: (err) => {
			if (err instanceof ORPCError && err.code === "BAD_REQUEST") {
				toast.error(
					"That channel ID isn't valid or doesn't belong to your server.",
				);
			} else {
				toast.error("Failed to save settings. Please try again.");
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.integrations.bySource(
					campaignId,
					IntegrationSource.DISCORD,
				),
			});
			toast.success("Settings saved.");
		},
	});

	return {
		integration,
		isConnected: integration !== null,
		isLoading,
		isRemoving,
		isUpdating,
		remove,
		update,
	};
}
