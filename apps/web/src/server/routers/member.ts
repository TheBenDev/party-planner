import { ORPCError } from "@orpc/client";
import {
	AcceptCampaignInvitationRequestSchema,
	AcceptCampaignInvitationResponseSchema,
	CreateMemberRequestSchema,
	CreateMemberResponseSchema,
	DeclineCampaignInvitationRequestSchema,
	DeclineCampaignInvitationResponseSchema,
	GetMemberRequestSchema,
	GetMemberResponseSchema,
	ListMembersByCampaignResponseSchema,
	ListMembersByUserResponseSchema,
	RemoveMemberRequestSchema,
	RemoveMemberResponseSchema,
} from "@planner/schemas/member";
import { handleError } from "../errors";
import { privateProcedure } from "../orpc";
import {
	protoToCampaignInvitation,
	protoToMember,
	userRoleToProtoRole,
} from "./util/proto/member";

const acceptCampaignInvitation = privateProcedure
	.route({
		method: "POST",
		path: "/member/accept",
		summary: "Accept invitation to a campaign",
	})
	.input(AcceptCampaignInvitationRequestSchema)
	.output(AcceptCampaignInvitationResponseSchema)
	.handler(async ({ input, context }) => {
		const { campaignId, inviteeEmail } = input;
		const api = context.api;

		try {
			const res = await api.member.acceptCampaignInvitation({
				campaignId,
				inviteeEmail,
			});
			if (res.member === undefined) {
				throw new ORPCError("NOT_FOUND", { message: "could not find user" });
			}
			if (res.invitation === undefined) {
				throw new ORPCError("NOT_FOUND", {
					message: "could not find invitation",
				});
			}

			return {
				invitation: protoToCampaignInvitation(res.invitation),
				member: protoToMember(res.member),
			};
		} catch (err) {
			handleError(err, "failed to accept campaign invitation");
		}
	});

const declineCampaignInvitation = privateProcedure
	.route({
		method: "POST",
		path: "/member/decline",
		summary: "Decline invitation to a campaign",
	})
	.input(DeclineCampaignInvitationRequestSchema)
	.output(DeclineCampaignInvitationResponseSchema)
	.handler(async ({ input, context }) => {
		const { campaignId, inviteeEmail } = input;
		const api = context.api;

		try {
			const inv = await api.member.declineCampaignInvitation({
				campaignId,
				inviteeEmail,
			});
			if (inv.invitation === undefined) {
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "failed to decline campaign invitation",
				});
			}
			return protoToCampaignInvitation(inv.invitation);
		} catch (err) {
			handleError(err, "Failed to decline campaign invitation");
		}
	});
const createMember = privateProcedure
	.route({
		method: "POST",
		path: "/member",
		summary: "Add a member to a campaign",
	})
	.input(CreateMemberRequestSchema)
	.output(CreateMemberResponseSchema)
	.handler(async ({ input, context }) => {
		const { campaignId, userId, role } = input;
		const api = context.api;
		try {
			const res = await api.member.createMember({
				campaignId,
				role: userRoleToProtoRole(role),
				userId,
			});
			if (res.member === undefined) {
				throw new ORPCError("NOT_FOUND", { message: "could not find member" });
			}
			return { member: protoToMember(res.member) };
		} catch (err) {
			handleError(err, "failed to create member");
		}
	});

const getMember = privateProcedure
	.route({
		method: "GET",
		path: "/member",
		summary: "Get a campaign member",
	})
	.input(GetMemberRequestSchema)
	.output(GetMemberResponseSchema)
	.handler(async ({ input, context }) => {
		const { campaignId, userId } = input;
		const api = context.api;
		try {
			const res = await api.member.getMember({ campaignId, userId });
			if (res.member === undefined) {
				throw new ORPCError("NOT_FOUND", { message: "could not find member" });
			}
			return { member: protoToMember(res.member) };
		} catch (err) {
			handleError(err, "failed to get member");
		}
	});

const listMembersByCampaign = privateProcedure
	.route({
		method: "GET",
		path: "/member/listByCampaign",
		summary: "List all members of a campaign",
	})
	.output(ListMembersByCampaignResponseSchema)
	.handler(async ({ context }) => {
		const { campaignId } = context;
		const api = context.api;
		if (campaignId === undefined || campaignId === null) return { members: [] };
		try {
			const res = await api.member.listMembersByCampaign({ campaignId });
			return { members: res.members.map(protoToMember) };
		} catch (err) {
			handleError(err, "failed to list members");
		}
	});

const listMembersByUser = privateProcedure
	.route({
		method: "GET",
		path: "/member/listByUser",
		summary: "List all members of a user",
	})
	.output(ListMembersByUserResponseSchema)
	.handler(async ({ context }) => {
		const { userId } = context;
		const api = context.api;
		try {
			const res = await api.member.listMembersByUser({ userId });
			return { members: res.members.map(protoToMember) };
		} catch (err) {
			handleError(err, "failed to list members");
		}
	});

const removeMember = privateProcedure
	.route({
		method: "DELETE",
		path: "/member",
		summary: "Remove a member from a campaign",
	})
	.input(RemoveMemberRequestSchema)
	.output(RemoveMemberResponseSchema)
	.handler(async ({ input, context }) => {
		const { campaignId, userId } = input;
		const api = context.api;
		try {
			await api.member.removeMember({ campaignId, userId });
			return {};
		} catch (err) {
			handleError(err, "failed to remove member");
		}
	});

export const memberRouter = {
	acceptCampaignInvitation,
	createMember,
	declineCampaignInvitation,
	getMember,
	listMembersByCampaign,
	listMembersByUser,
	removeMember,
};
