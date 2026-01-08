import { schema } from "@planner/database";
import {
	GetSessionRequestSchema,
	ListSessionsRequestSchema,
} from "@planner/schemas/sessions";
import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { j, privateProcedure } from "../jsandy";

const { sessionsTable } = schema;

export const sessionRouter = j.router({
	getSession: privateProcedure
		.input(GetSessionRequestSchema)
		.query(async ({ c, input }) => {
			const { id } = input;
			const db = c.get("db");

			const sessionRow = await db
				.select()
				.from(sessionsTable)
				.where(eq(sessionsTable.id, id))
				.limit(1);

			if (sessionRow.length === 0) {
				throw new HTTPException(404, {
					message: "session not found",
				});
			}

			return c.json(sessionRow[0]);
		}),
	listSessions: privateProcedure
		.input(ListSessionsRequestSchema)
		.query(async ({ c, input }) => {
			const { campaignId } = input;
			const db = c.get("db");

			const sessionsRow = await db
				.select()
				.from(sessionsTable)
				.where(eq(sessionsTable.campaignId, campaignId));

			return c.json(sessionsRow);
		}),
});
