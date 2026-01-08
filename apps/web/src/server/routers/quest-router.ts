import { schema } from "@planner/database";
import {
	GetQuestRequestSchema,
	ListQuestsRequestSchema,
} from "@planner/schemas/quests";
import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { j, privateProcedure } from "../jsandy";

const { questsTable } = schema;

export const questRouter = j.router({
	getquest: privateProcedure
		.input(GetQuestRequestSchema)
		.query(async ({ c, input }) => {
			const { id } = input;
			const db = c.get("db");

			const questRow = await db
				.select()
				.from(questsTable)
				.where(eq(questsTable.id, id))
				.limit(1);

			if (questRow.length === 0) {
				throw new HTTPException(404, { message: "quest not found" });
			}

			return c.json(questRow[0]);
		}),
	listquests: privateProcedure
		.input(ListQuestsRequestSchema)
		.query(async ({ c, input }) => {
			const { campaignId } = input;
			const db = c.get("db");

			const questsRow = await db
				.select()
				.from(questsTable)
				.where(eq(questsTable.campaignId, campaignId));

			return c.json(questsRow);
		}),
});
