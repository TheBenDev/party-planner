import { ORPCError } from "@orpc/server";
import { schema } from "@planner/database";
import { ListByEnum } from "@planner/enums/character";
import {
	GetCharacterRequestSchema,
	GetCharacterResponseSchema,
	ListCharactersRequestSchema,
	ListCharactersResponseSchema,
} from "@planner/schemas/character";
import { eq } from "drizzle-orm";
import { privateProcedure } from "../orpc";

const { charactersTable } = schema;

const getCharacter = privateProcedure
	.route({
		method: "GET",
		path: "/character",
		summary: "Get a character by id",
	})
	.input(GetCharacterRequestSchema)
	.output(GetCharacterResponseSchema)
	.handler(async ({ input, context }) => {
		const { id } = input;
		const db = context.db;

		const characterRow = await db
			.select()
			.from(charactersTable)
			.where(eq(charactersTable.id, id))
			.limit(1);

		if (characterRow.length === 0) {
			throw new ORPCError("NOT_FOUND", { message: "Character not found" });
		}

		return { character: characterRow[0] };
	});

const listCharacters = privateProcedure
	.route({
		method: "GET",
		path: "/characters",
		summary: "List characters by campaign or player",
	})
	.input(ListCharactersRequestSchema)
	.output(ListCharactersResponseSchema)
	.handler(async ({ input, context }) => {
		const { by, id } = input;
		const db = context.db;

		const listOptions = {
			[ListByEnum.CAMPAIGN]: eq(charactersTable.campaignId, id),
			[ListByEnum.PLAYER]: eq(charactersTable.userId, id),
		};

		const charactersRow = await db
			.select()
			.from(charactersTable)
			.where(listOptions[by]);

		return { characters: charactersRow };
	});

export const characterRouter = {
	getCharacter,
	listCharacters,
};
