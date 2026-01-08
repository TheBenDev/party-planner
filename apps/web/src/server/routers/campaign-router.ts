import { schema } from "@planner/database";
import { UserRole } from "@planner/enums/user";
import {
	CreateCampaignRequestSchema,
	GetInvitationRequestSchema,
	GetInvitationResponseSchema,
} from "@planner/schemas/campaigns";
import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { j, privateProcedure } from "../jsandy";

const { campaignsTable, campaignUsersTable, campaignInvitationsTable } = schema;
export const campaignRouter = j.router({
	createCampaign: privateProcedure
		.input(CreateCampaignRequestSchema)
		.mutation(async ({ c, input }) => {
			const { tags, title, description } = input;
			const db = c.get("db");
			const userId = c.get("userId");

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
					throw new HTTPException(500, {
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
					throw new HTTPException(500, {
						message: "failed to create campaign membership",
					});
				}

				return createdCampaignRow[0];
			});

			return c.json({ id: createdCampaign.id });
		}),
	getActiveCampaign: privateProcedure.query(async ({ c }) => {
		const campaignId = c.get("campaignId");
		const db = c.get("db");
		if (!campaignId) return c.json(null);
		const campaignRow = await db
			.select()
			.from(campaignsTable)
			.where(eq(campaignsTable.id, campaignId))
			.limit(1);

		if (campaignRow.length === 0) {
			throw new HTTPException(404, { message: "campaign not found" });
		}

		return c.superjson({ campaign: campaignRow[0] });
	}),
	getInvitation: privateProcedure
		.input(GetInvitationRequestSchema)
		.query(async ({ c, input }) => {
			const { invitationId } = input;
			const db = c.get("db");
			const invitationRow = await db
				.select()
				.from(campaignInvitationsTable)
				.where(eq(campaignInvitationsTable.id, invitationId));

			if (invitationRow.length === 0) {
				throw new HTTPException(404, { message: "Invitation not found" });
			}
			const invitation = GetInvitationResponseSchema.parse(invitationRow[0]);

			return c.json(invitation);
		}),
});
