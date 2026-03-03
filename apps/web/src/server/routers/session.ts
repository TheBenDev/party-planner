import { schema } from "@planner/database";
import {
	GetSessionByIdRequestSchema,
	GetSessionByIdResponseSchema,
	ListSessionsByCampaignIdRequestSchema,
	ListSessionsByCampaignIdResponseSchema,
} from "@planner/schemas/sessions";
import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { privateProcedure } from "../orpc";

const { sessionsTable } = schema;

const getSessionById = privateProcedure
	.route({
		method: "GET",
		path: "/session",
		summary: "Get a session by id",
	})
	.input(GetSessionByIdRequestSchema)
	.output(GetSessionByIdResponseSchema)
	.handler(async ({ input, context }) => {
		const { id } = input;
		const db = context.db;

		const sessionRow = await db
			.select()
			.from(sessionsTable)
			.where(eq(sessionsTable.id, id))
			.limit(1);

		if (sessionRow.length === 0) {
			throw new HTTPException(404, { message: "session not found" });
		}

		return sessionRow[0];
	});

const listSessionsByCampaignId = privateProcedure
	.route({
		method: "GET",
		path: "/sessions",
		summary: "List sessions by campaign",
	})
	.input(ListSessionsByCampaignIdRequestSchema)
	.output(ListSessionsByCampaignIdResponseSchema)
	.handler(async ({ input, context }) => {
		const { campaignId } = input;
		const db = context.db;

		const sessionsRow = await db
			.select()
			.from(sessionsTable)
			.where(eq(sessionsTable.campaignId, campaignId));

		return sessionsRow;
	});

export const sessionRouter = {
	getSessionById,
	listSessionsByCampaignId,
};
