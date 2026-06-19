import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { CreateSeriesInput, Session } from "@/features/sessions/types";
import { useAuth } from "@/shared/hooks/auth";
import { client } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/query-keys";

export function useSessionsData() {
	const { campaign } = useAuth();
	const queryClient = useQueryClient();
	const campaignId = campaign?.campaign.id ?? "";

	const oneOffSessionsQuery = useQuery({
		enabled: Boolean(campaign),
		queryFn: async (): Promise<{ sessions: Session[] }> => ({ sessions: [] }),
		queryKey: queryKeys.sessions.list(campaignId),
	});

	const seriesQuery = useQuery({
		enabled: Boolean(campaign),
		queryFn: () => {
			if (!campaign) throw new Error("campaign required");
			return client.sessionSeries.listSessionSeriesByCampaign({
				campaignId: campaign.campaign.id,
			});
		},
		queryKey: queryKeys.sessionSeries.list(campaignId),
	});

	const deleteSessionMutation = useMutation({
		mutationFn: (id: string) => client.session.removeSession({ id }),
		onError: () => toast.error("Failed to delete session"),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: queryKeys.sessions.list(campaignId),
				}),
				queryClient.invalidateQueries({
					queryKey: queryKeys.sessionSeries.list(campaignId),
				}),
			]);
		},
	});

	const createSeriesMutation = useMutation({
		mutationFn: (input: CreateSeriesInput) => {
			if (!campaign) throw new Error("campaign required");
			return client.sessionSeries.createSessionSeries({
				campaignId: campaign.campaign.id,
				...input,
			});
		},
		onError: () => toast.error("Failed to create series"),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: queryKeys.sessionSeries.list(campaignId),
			});
			await queryClient.invalidateQueries({
				queryKey: queryKeys.sessions.list(campaignId),
			});
			toast.success("Series created");
		},
	});

	const updateSeriesMutation = useMutation({
		mutationFn: (input: {
			id: string;
			title?: string;
			description?: string;
			rrule?: string;
			startTime?: string;
			timezone?: string;
			seriesEndDate?: Date;
		}) => client.sessionSeries.updateSessionSeries(input),
		onError: () => toast.error("Failed to update series"),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: queryKeys.sessionSeries.list(campaignId),
			});
			toast.success("Series updated");
		},
	});

	const removeSeriesMutation = useMutation({
		mutationFn: (id: string) =>
			client.sessionSeries.removeSessionSeries({ id }),
		onError: () => toast.error("Failed to remove series"),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: queryKeys.sessionSeries.list(campaignId),
			});
			await queryClient.invalidateQueries({
				queryKey: queryKeys.sessions.list(campaignId),
			});
			toast.success("Series removed");
		},
	});

	const endSeriesMutation = useMutation({
		mutationFn: (id: string) =>
			client.sessionSeries.updateSessionSeries({
				id,
				seriesEndDate: new Date(),
			}),
		onError: () => toast.error("Failed to end series"),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: queryKeys.sessionSeries.list(campaignId),
			});
			toast.success("Series ended");
		},
	});

	const announceToDiscordMutation = useMutation({
		mutationFn: (seriesId: string) =>
			client.sessionSeries.announceToDiscord({ seriesId }),
		onError: () => toast.error("Failed to announce to Discord"),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: queryKeys.sessionSeries.list(campaignId),
			});
			toast.success("Announced to Discord");
		},
	});

	const excludeFromSeriesMutation = useMutation({
		mutationFn: (input: { seriesId: string; excludedDate: Date }) =>
			client.sessionSeries.excludeSessionFromSeries(input),
		onError: () => toast.error("Failed to cancel occurrence"),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: queryKeys.sessionSeries.list(campaignId),
			});
			toast.success("Occurrence cancelled");
		},
	});

	const removeSeriesExceptionMutation = useMutation({
		mutationFn: (input: { seriesId: string; excludedDate: Date }) =>
			client.sessionSeries.removeSeriesException(input),
		onError: () => toast.error("Failed to restore occurrence"),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: queryKeys.sessionSeries.list(campaignId),
			});
			toast.success("Occurrence restored");
		},
	});

	return {
		announceToDiscord: announceToDiscordMutation.mutate,
		createSeries: createSeriesMutation.mutate,
		deleteSession: deleteSessionMutation.mutate,
		endSeries: endSeriesMutation.mutate,
		excludeFromSeries: excludeFromSeriesMutation.mutate,
		isAnnouncingToDiscord: announceToDiscordMutation.isPending,
		isCreatingSeries: createSeriesMutation.isPending,
		isUpdatingSeries: updateSeriesMutation.isPending,
		oneOffSessionsQuery,
		removeSeries: removeSeriesMutation.mutate,
		removeSeriesException: removeSeriesExceptionMutation.mutate,
		seriesQuery,
		updateSeries: updateSeriesMutation.mutate,
	};
}
