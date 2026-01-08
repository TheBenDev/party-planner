import { schema } from "@planner/database";
import { ListByEnum } from "@planner/enums/character";
import {
	GetCharacterRequestSchema,
	ListCharactersRequestSchema,
} from "@planner/schemas/character";
import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { j, privateProcedure } from "../jsandy";

const { charactersTable } = schema;

export const characterRouter = j.router({
	getCharacter: privateProcedure
		.input(GetCharacterRequestSchema)
		.query(async ({ c, input }) => {
			const { id } = input;
			const db = c.get("db");

			const characterRow = await db
				.select()
				.from(charactersTable)
				.where(eq(charactersTable.id, id))
				.limit(1);

			if (characterRow.length === 0) {
				throw new HTTPException(404, { message: "Character not found" });
			}

			return c.json(characterRow[0]);
		}),
	listCharacters: privateProcedure
		.input(ListCharactersRequestSchema)
		.query(async ({ c, input }) => {
			const { by, id } = input;
			const db = c.get("db");

			const listOptions = {
				[ListByEnum.CAMPAIGN]: eq(charactersTable.campaignId, id),
				[ListByEnum.PLAYER]: eq(charactersTable.userId, id),
			};

			const charactersRow = await db
				.select()
				.from(charactersTable)
				.where(listOptions[by]);

			return c.json(charactersRow);
		}),
});
