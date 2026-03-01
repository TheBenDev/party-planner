import { schema } from "@planner/database";
import {
	GetNonPlayerCharacterRequestSchema,
	ListNonPlayerCharactersRequestSchema,
	ListNonPlayerCharactersResponseSchema,
	NonPlayerCharactersSchema,
} from "@planner/schemas/nonPlayerCharacters";
import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { j, privateProcedure } from "../jsandy";

const { nonPlayerCharactersTable } = schema;

export const nonPlayerCharacterRouter = j.router({
	getNonPlayerCharacter: privateProcedure
		.input(GetNonPlayerCharacterRequestSchema)
		.query(async ({ c, input }) => {
			const { id } = input;
			const db = c.get("db");

			const nonPlayerCharacterRow = await db
				.select()
				.from(nonPlayerCharactersTable)
				.where(eq(nonPlayerCharactersTable.id, id))
				.limit(1);

			if (nonPlayerCharacterRow.length === 0) {
				throw new HTTPException(404, {
					message: "nonPlayerCharacter not found",
				});
			}

			return c.json(nonPlayerCharacterRow[0]);
		}),
	listNonPlayerCharacters: privateProcedure
		.input(ListNonPlayerCharactersRequestSchema)
		.query(async ({ c, input }) => {
			const { campaignId } = input;
			const db = c.get("db");

			const nonPlayerCharactersRow = await db
				.select()
				.from(nonPlayerCharactersTable)
				.where(eq(nonPlayerCharactersTable.campaignId, campaignId));
			const npcs = ListNonPlayerCharactersResponseSchema.parse(
				nonPlayerCharactersRow,
			);
			return c.json(npcs);
		}),
});
