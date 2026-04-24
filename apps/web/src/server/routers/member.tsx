import { ORPCError } from "@orpc/client";
import {
	AcceptCampaignInvitationRequestSchema,
	AcceptCampaignInvitationResponseSchema,
	CreateCampaignInvitationRequestSchema,
	CreateCampaignInvitationResponseSchema,
	CreateMemberRequestSchema,
	CreateMemberResponseSchema,
	DeclineCampaignInvitationRequestSchema,
	DeclineCampaignInvitationResponseSchema,
	GetMemberRequestSchema,
	GetMemberResponseSchema,
	ListCampaignInvitationsResponseSchema,
	ListMembersByCampaignResponseSchema,
	ListMembersByUserResponseSchema,
	RemoveMemberRequestSchema,
	RemoveMemberResponseSchema,
	RevokeCampaignInvitationRequestSchema,
	RevokeCampaignInvitationResponseSchema,
} from "@planner/schemas/member";
import DndInviteEmail from "@/components/email-invite-template";
import { env } from "@/env";
import { handleError } from "../errors";
import { privateProcedure } from "../orpc";
import { generateToken } from "./util/helpers";
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
			handleError(
				err,
				"failed to accept campaign invitation",
				{ campaignId },
				context.logger,
			);
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
			handleError(
				err,
				"Failed to decline campaign invitation",
				{ campaignId },
				context.logger,
			);
		}
	});

const createInvitation = privateProcedure
	.route({
		method: "POST",
		path: "/member/createInvitation",
		summary: "List initations of pending invitations to a campaign",
	})
	.input(CreateCampaignInvitationRequestSchema)
	.output(CreateCampaignInvitationResponseSchema)
	.handler(async ({ context, input }) => {
		const { inviteeEmail, role } = input;
		const { campaignId, userId, clerkUserId, api, resend } = context;

		if (campaignId === null) {
			throw new ORPCError("CONFLICT", {
				message:
					"failed to create invitation. Could not find active campaign id.",
			});
		}

		try {
			const [campaignRes, inviterRes] = await Promise.all([
				api.campaign.getCampaign({ id: campaignId }),
				api.user.getUser({ externalId: clerkUserId }),
			]);

			if (!(campaignRes.campaign && inviterRes.user)) {
				throw new ORPCError("NOT_FOUND", {
					message: "user and campaign not found",
				});
			}

			const { text, hash } = generateToken();

			const res = await api.member.createCampaignInvitation({
				campaignId,
				inviteeEmail,
				inviterId: userId,
				role: userRoleToProtoRole(role),
				token: hash,
			});

			if (!res.invitation) {
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "failed to create invitation",
				});
			}

			const { error } = await resend.emails.send({
				from: env.VITE_APP_FROM_EMAIL,
				react: (
					<DndInviteEmail
						acceptLink={`${env.VITE_APP_URL}/accept?token=${text}`}
						campaignName={campaignRes.campaign.title}
						dmName={`${inviterRes.user.firstName} ${inviterRes.user.lastName}`}
					/>
				),
				subject: "Invitation to Dungeons and Dragons Campaign",
				to: [inviteeEmail],
			});

			if (error) {
				context.logger?.error({ resendError: error }, "resend email failed");
				try {
					await api.member.revokeCampaignInvitation({ id: res.invitation.id });
				} catch (revokeErr) {
					context.logger?.error(
						{ invitationId: res.invitation.id, revokeErr },
						"failed to revoke invitation after email failure",
					);
				}
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "invitation email failed to send",
				});
			}

			return { invitation: protoToCampaignInvitation(res.invitation) };
		} catch (err) {
			handleError(
				err,
				"failed to create invitation",
				{ campaignId },
				context.logger,
			);
		}
	});
const listInvitations = privateProcedure
	.route({
		method: "POST",
		path: "/member/listInvitations",
		summary: "List invitations of pending invitations to a campaign",
	})
	.output(ListCampaignInvitationsResponseSchema)
	.handler(async ({ context }) => {
		const campaignId = context.campaignId;
		const api = context.api;
		if (campaignId === null) return { invitations: [] };
		try {
			const res = await api.member.listCampaignInvitations({ campaignId });
			const invitations = res.invitations.map(protoToCampaignInvitation);
			return { invitations };
		} catch (err) {
			handleError(
				err,
				"failed to list invitations",
				{ campaignId },
				context.logger,
			);
		}
	});

const revokeInvitation = privateProcedure
	.route({
		method: "POST",
		path: "/member/revokeInvitation",
		summary: "Revoke the invitation to a campaign",
	})
	.input(RevokeCampaignInvitationRequestSchema)
	.output(RevokeCampaignInvitationResponseSchema)
	.handler(async ({ context, input }) => {
		const { id } = input;
		const campaignId = context.campaignId;
		const api = context.api;
		if (campaignId === null) {
			throw new ORPCError("CONFLICT", {
				message:
					"failed to revoke invitation. Could not find active campaign id.",
			});
		}
		try {
			const res = await api.member.revokeCampaignInvitation({ campaignId, id });
			if (res.invitation === undefined) {
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "failed to revoke invitation",
				});
			}
			const invitation = protoToCampaignInvitation(res.invitation);
			return { invitation };
		} catch (err) {
			handleError(
				err,
				"failed to revoke invitations",
				{ campaignId, invitationId: id },
				context.logger,
			);
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
			handleError(err, "failed to create member", input, context.logger);
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
			handleError(err, "failed to get member", input, context.logger);
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
			handleError(
				err,
				"failed to list members",
				{ campaignId },
				context.logger,
			);
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
			handleError(err, "failed to list members", { userId }, context.logger);
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
			handleError(err, "failed to remove member", input, context.logger);
		}
	});

export const memberRouter = {
	acceptCampaignInvitation,
	createInvitation,
	createMember,
	declineCampaignInvitation,
	getMember,
	listInvitations,
	listMembersByCampaign,
	listMembersByUser,
	removeMember,
	revokeInvitation,
};
