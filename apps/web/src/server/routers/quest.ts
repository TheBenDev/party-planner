import { ORPCError } from "@orpc/server";
import { schema } from "@planner/database";
import {
	GetQuestByIdRequestSchema,
	GetQuestByIdResponseSchema,
	ListQuestsByCampaignIdRequestSchema,
	ListQuestsByCampaignIdResponseSchema,
} from "@planner/schemas/quests";
import { eq } from "drizzle-orm";
import { privateProcedure } from "../orpc";

const { questsTable } = schema;

const getQuestById = privateProcedure
	.route({
		method: "GET",
		path: "/quest",
		summary: "Get a quest by id",
	})
	.input(GetQuestByIdRequestSchema)
	.output(GetQuestByIdResponseSchema)
	.handler(async ({ input, context }) => {
		const { id } = input;
		const db = context.db;

		const questRow = await db
			.select()
			.from(questsTable)
			.where(eq(questsTable.id, id))
			.limit(1);

		if (questRow.length === 0) {
			throw new ORPCError("NOT_FOUND", { message: "quest not found" });
		}

		return questRow[0];
	});

const listQuestsByCampaignId = privateProcedure
	.route({
		method: "GET",
		path: "/quests",
		summary: "List quests by campaign",
	})
	.input(ListQuestsByCampaignIdRequestSchema)
	.output(ListQuestsByCampaignIdResponseSchema)
	.handler(async ({ input, context }) => {
		const { campaignId } = input;
		const db = context.db;

		const questsRow = await db
			.select()
			.from(questsTable)
			.where(eq(questsTable.campaignId, campaignId));

		return questsRow;
	});

export const questRouter = {
	getQuestById,
	listQuestsByCampaignId,
};
