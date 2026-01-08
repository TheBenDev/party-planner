import { schema } from "@planner/database";
import { StatusEnum } from "@planner/enums/common";
import {
	AcceptMemberInvitationRequestSchema,
	InviteMemberToCampaignRequest,
} from "@planner/schemas/member";
import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { j, privateProcedure } from "../jsandy";

const { campaignInvitationsTable, campaignUsersTable, usersTable } = schema;

export const memberRouter = j.router({
	acceptCampaignInvitation: privateProcedure
		.input(AcceptMemberInvitationRequestSchema)
		.mutation(async ({ c, input }) => {
			const { campaignId, inviteeEmail, inviterId, role } = input;

			const db = c.get("db");
			const userId = c.get("userId");

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
					throw new HTTPException(404, {
						message: "Campaign Invitation not found",
					});
				}

				const invitation = invitationRow[0];

				if (invitation.users?.email !== inviteeEmail) {
					throw new HTTPException(403, {
						message: "Email does not match invitation",
					});
				}

				if (invitation.campaign_users === null) {
					throw new HTTPException(403, {
						message:
							"Invitation is invalid - inviter is not a member of this campaign",
					});
				}

				if (invitation.campaign_invitations.status === StatusEnum.ACCEPTED) {
					throw new HTTPException(400, {
						message: "Invitation has already been accepted",
					});
				}

				const currentTime = new Date();
				if (
					invitation.campaign_invitations.expiresAt &&
					new Date(invitation.campaign_invitations.expiresAt) < currentTime
				) {
					throw new HTTPException(400, {
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
		}),
	inviteMemberToCampaign: privateProcedure
		.input(InviteMemberToCampaignRequest)
		.mutation(async ({ c, input }) => {
			const { campaignId, inviteeEmail, role } = input;
			const db = c.get("db");
			const inviterId = c.get("userId");

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
					throw new HTTPException(403, {
						message: "Must be a member of the campaign to invite someone",
					});
				}

				if (inviteeRow.length > 0 && inviteeRow[0].campaign_users !== null) {
					throw new HTTPException(409, {
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
					throw new HTTPException(409, {
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
		}),
});
