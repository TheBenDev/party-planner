import { ORPCError } from "@orpc/server";
import { schema } from "@planner/database";
import { StatusEnum } from "@planner/enums/common";
import {
	AcceptMemberInvitationRequestSchema,
	InviteMemberToCampaignRequest,
} from "@planner/schemas/member";
import { and, eq } from "drizzle-orm";
import { privateProcedure } from "../orpc";

const { campaignInvitationsTable, campaignUsersTable, usersTable } = schema;

const acceptCampaignInvitation = privateProcedure
	.route({
		method: "POST",
		path: "/member/accept",
		summary: "Accept a campaign invitation",
	})
	.input(AcceptMemberInvitationRequestSchema)
	.handler(async ({ input, context }) => {
		const { campaignId, inviteeEmail, inviterId, role } = input;
		const db = context.db;
		const userId = context.userId;

		await db.transaction(async (tx) => {
			const invitationRow = await tx
				.select()
				.from(campaignInvitationsTable)
				.leftJoin(
					campaignUsersTable,
					and(
						eq(campaignUsersTable.userId, inviterId),
						eq(campaignUsersTable.campaignId, campaignId),
					),
				)
				.leftJoin(usersTable, eq(usersTable.id, userId))
				.where(
					and(
						eq(campaignInvitationsTable.inviteeEmail, inviteeEmail),
						eq(campaignInvitationsTable.campaignId, campaignId),
					),
				);

			if (invitationRow.length === 0) {
				throw new ORPCError("NOT_FOUND", {
					message: "Campaign Invitation not found",
				});
			}

			const invitation = invitationRow[0];

			if (invitation.users?.email !== inviteeEmail) {
				throw new ORPCError("FORBIDDEN", {
					message: "Email does not match invitation",
				});
			}

			if (invitation.campaign_users === null) {
				throw new ORPCError("FORBIDDEN", {
					message:
						"Invitation is invalid - inviter is not a member of this campaign",
				});
			}

			if (invitation.campaign_invitations.status === StatusEnum.ACCEPTED) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Invitation has already been accepted",
				});
			}

			const currentTime = new Date();
			if (
				invitation.campaign_invitations.expiresAt &&
				new Date(invitation.campaign_invitations.expiresAt) < currentTime
			) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Invitation has expired",
				});
			}

			await Promise.all([
				tx
					.update(campaignInvitationsTable)
					.set({ acceptedAt: currentTime, status: StatusEnum.ACCEPTED })
					.where(
						and(
							eq(campaignInvitationsTable.inviteeEmail, inviteeEmail),
							eq(campaignInvitationsTable.campaignId, campaignId),
						),
					),
				tx.insert(campaignUsersTable).values({
					campaignId,
					role,
					userId,
				}),
			]);
		});
	});

const inviteMemberToCampaign = privateProcedure
	.route({
		method: "POST",
		path: "/member/invite",
		summary: "Invite a member to a campaign",
	})
	.input(InviteMemberToCampaignRequest)
	.handler(async ({ input, context }) => {
		const { campaignId, inviteeEmail, role } = input;
		const db = context.db;
		const inviterId = context.userId;

		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + 7);

		await db.transaction(async (tx) => {
			const [inviteeRow, inviterRow, invitationRow] = await Promise.all([
				tx
					.select()
					.from(usersTable)
					.leftJoin(
						campaignUsersTable,
						and(
							eq(usersTable.id, campaignUsersTable.userId),
							eq(campaignUsersTable.campaignId, campaignId),
						),
					)
					.where(eq(usersTable.email, inviteeEmail))
					.limit(1),
				tx
					.select()
					.from(campaignUsersTable)
					.where(
						and(
							eq(campaignUsersTable.userId, inviterId),
							eq(campaignUsersTable.campaignId, campaignId),
						),
					)
					.limit(1),
				tx
					.select()
					.from(campaignInvitationsTable)
					.where(
						and(
							eq(campaignInvitationsTable.inviteeEmail, inviteeEmail),
							eq(campaignInvitationsTable.campaignId, campaignId),
							eq(campaignInvitationsTable.status, StatusEnum.PENDING),
						),
					)
					.limit(1),
			]);

			if (inviterRow.length === 0) {
				throw new ORPCError("FORBIDDEN", {
					message: "Must be a member of the campaign to invite someone",
				});
			}

			if (inviteeRow.length > 0 && inviteeRow[0].campaign_users !== null) {
				throw new ORPCError("CONFLICT", {
					message: "User is already a member of the campaign",
				});
			}

			if (invitationRow.length > 0) {
				if (new Date(invitationRow[0].expiresAt) < new Date()) {
					await tx
						.update(campaignInvitationsTable)
						.set({ expiresAt })
						.where(
							and(
								eq(campaignInvitationsTable.inviteeEmail, inviteeEmail),
								eq(campaignInvitationsTable.campaignId, campaignId),
							),
						);
					return;
				}
				throw new ORPCError("CONFLICT", {
					message: "User is already invited to the campaign",
				});
			}

			await tx.insert(campaignInvitationsTable).values({
				campaignId,
				expiresAt,
				inviteeEmail,
				inviterId,
				role,
			});
		});
	});

export const memberRouter = {
	acceptCampaignInvitation,
	inviteMemberToCampaign,
};
