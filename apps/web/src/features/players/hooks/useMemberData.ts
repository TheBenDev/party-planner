import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/shared/hooks/auth";
import { client } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/query-keys";
import type {
	AcceptCampaignInvitationRequest,
	CreateCampaignInvitationRequest,
	CreateMemberRequest,
	DeclineCampaignInvitationRequest,
	RemoveMemberRequest,
	RevokeCampaignInvitationRequest,
} from "../types";

export function useMemberData() {
	const queryClient = useQueryClient();
	const { campaign } = useAuth();
	const campaignId = campaign?.campaign.id ?? "";

	const invalidateMembers = () =>
		queryClient.invalidateQueries({ queryKey: queryKeys.members.list(campaignId) });

	const invalidateInvitations = () =>
		queryClient.invalidateQueries({ queryKey: queryKeys.invitations.list() });

	const removeMember = useMutation({
		mutationFn: (input: RemoveMemberRequest) => client.member.removeMember(input),
		onSuccess: invalidateMembers,
	});

	const createMember = useMutation({
		mutationFn: (input: CreateMemberRequest) => client.member.createMember(input),
		onSuccess: invalidateMembers,
	});

	const createInvitation = useMutation({
		mutationFn: (input: CreateCampaignInvitationRequest) =>
			client.member.createInvitation(input),
		onSuccess: invalidateInvitations,
	});

	const revokeInvitation = useMutation({
		mutationFn: (input: RevokeCampaignInvitationRequest) =>
			client.member.revokeInvitation(input),
		onSuccess: invalidateInvitations,
	});

	const acceptCampaignInvitation = useMutation({
		mutationFn: (input: AcceptCampaignInvitationRequest) =>
			client.member.acceptCampaignInvitation(input),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: queryKeys.auth.campaign() }),
	});

	const declineCampaignInvitation = useMutation({
		mutationFn: (input: DeclineCampaignInvitationRequest) =>
			client.member.declineCampaignInvitation(input),
		onSuccess: invalidateInvitations,
	});

	return {
		acceptCampaignInvitation,
		createInvitation,
		createMember,
		declineCampaignInvitation,
		removeMember,
		revokeInvitation,
	};
}
