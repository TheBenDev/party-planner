import { ORPCError } from "@orpc/server";
import { schema } from "@planner/database";
import { UserRole } from "@planner/enums/user";
import {
	CreateCamapaingResponseSchema,
	CreateCampaignRequestSchema,
	GetActiveCampaignResponseSchema,
	GetInvitationRequestSchema,
	GetInvitationResponseSchema,
} from "@planner/schemas/campaigns";
import { eq } from "drizzle-orm";
import { privateProcedure } from "../orpc";

const { campaignsTable, campaignUsersTable, campaignInvitationsTable } = schema;

const createCampaign = privateProcedure
	.route({
		method: "POST",
		path: "/campaign",
		summary: "Creates a campaign",
	})
	.input(CreateCampaignRequestSchema)
	.output(CreateCamapaingResponseSchema)
	.handler(async ({ input, context }) => {
		const { tags, title, description } = input;
		const db = context.db;
		const userId = context.userId;

		const values = {
			description,
			tags,
			title,
			userId,
		};

		const createdCampaign = await db.transaction(async (tx) => {
			const createdCampaignRow = await tx
				.insert(campaignsTable)
				.values(values)
				.returning();

			if (createdCampaignRow.length === 0) {
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "failed to create campaign",
				});
			}

			const createdMembershipRow = await tx
				.insert(campaignUsersTable)
				.values({
					campaignId: createdCampaignRow[0].id,
					role: UserRole.DUNGEON_MASTER,
					userId,
				})
				.returning();

			if (createdMembershipRow.length === 0) {
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "failed to create campaign membership",
				});
			}

			return createdCampaignRow[0];
		});

		return { id: createdCampaign.id };
	});

const getActiveCampaign = privateProcedure
	.route({
		method: "GET",
		path: "/campaign",
		summary: "Get a web user's active campaign",
	})
	.output(GetActiveCampaignResponseSchema)
	.handler(async ({ context }) => {
		const campaignId = context.campaignId;
		const db = context.db;
		if (!campaignId)
			throw new ORPCError("BAD_REQUEST", {
				message: "User must have an active campaign.",
			});
		const campaignRow = await db
			.select()
			.from(campaignsTable)
			.where(eq(campaignsTable.id, campaignId))
			.limit(1);

		if (campaignRow.length === 0) {
			throw new ORPCError("NOT_FOUND", { message: "campaign not found" });
		}
		return campaignRow[0];
	});

const getInvitationById = privateProcedure
	.route({
		method: "GET",
		path: "/campaign",
		summary: "Get an invitation to a campaign by id",
	})
	.input(GetInvitationRequestSchema)
	.output(GetInvitationResponseSchema)
	.handler(async ({ input, context }) => {
		const { invitationId } = input;
		const db = context.db;
		const invitationRow = await db
			.select({
				campaignId: campaignInvitationsTable.campaignId,
				inviteeEmail: campaignInvitationsTable.inviteeEmail,
				inviterId: campaignInvitationsTable.inviterId,
				role: campaignInvitationsTable.role,
			})
			.from(campaignInvitationsTable)
			.where(eq(campaignInvitationsTable.id, invitationId));

		if (invitationRow.length === 0) {
			throw new ORPCError("NOT_FOUND", { message: "Invitation not found" });
		}

		return invitationRow[0];
	});

export const campaignRouter = {
	createCampaign,
	getActiveCampaign,
	getInvitationById,
};
