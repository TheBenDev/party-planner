import { ORPCError } from "@orpc/server";
import { schema } from "@planner/database";
import {
	GetNonPlayerCharacterByIdRequestSchema,
	GetNonPlayerCharacterByIdResponseSchema,
	ListNonPlayerCharactersByCampaignIdRequestSchema,
	ListNonPlayerCharactersByCampaignIdResponseSchema,
} from "@planner/schemas/nonPlayerCharacters";
import { eq } from "drizzle-orm";
import { privateProcedure } from "../orpc";

const { nonPlayerCharactersTable } = schema;

const getNonPlayerCharacterById = privateProcedure
	.route({
		method: "GET",
		path: "/npc",
		summary: "Get a non-player character by id",
	})
	.input(GetNonPlayerCharacterByIdRequestSchema)
	.output(GetNonPlayerCharacterByIdResponseSchema)
	.handler(async ({ input, context }) => {
		const { id } = input;
		const db = context.db;

		const nonPlayerCharacterRow = await db
			.select()
			.from(nonPlayerCharactersTable)
			.where(eq(nonPlayerCharactersTable.id, id))
			.limit(1);

		if (nonPlayerCharacterRow.length === 0) {
			throw new ORPCError("NOT_FOUND", {
				message: "nonPlayerCharacter not found",
			});
		}

		return nonPlayerCharacterRow[0];
	});

const listNonPlayerCharactersByCampaignId = privateProcedure
	.route({
		method: "GET",
		path: "/npcs",
		summary: "List non-player characters by campaign",
	})
	.input(ListNonPlayerCharactersByCampaignIdRequestSchema)
	.output(ListNonPlayerCharactersByCampaignIdResponseSchema)
	.handler(async ({ input, context }) => {
		const { campaignId } = input;
		const db = context.db;

		const nonPlayerCharactersRow = await db
			.select()
			.from(nonPlayerCharactersTable)
			.where(eq(nonPlayerCharactersTable.campaignId, campaignId));

		return nonPlayerCharactersRow;
	});

export const nonPlayerCharacterRouter = {
	getNonPlayerCharacterById,
	listNonPlayerCharactersByCampaignId,
};
