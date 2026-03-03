import { ORPCError } from "@orpc/server";
import { schema } from "@planner/database";
import {
	GetLocationRequestSchema,
	ListLocationsRequestSchema,
} from "@planner/schemas/locations";
import { eq } from "drizzle-orm";
import { privateProcedure } from "../orpc";

const { locationsTable } = schema;

const getLocationById = privateProcedure
	.route({
		method: "GET",
		path: "/location",
		summary: "Get a location by id",
	})
	.input(GetLocationRequestSchema)
	.handler(async ({ input, context }) => {
		const { id } = input;
		const db = context.db;

		const locationRow = await db
			.select()
			.from(locationsTable)
			.where(eq(locationsTable.id, id))
			.limit(1);

		if (locationRow.length === 0) {
			throw new ORPCError("NOT_FOUND", { message: "location not found" });
		}

		return locationRow[0];
	});

const listLocationsByCampaignId = privateProcedure
	.route({
		method: "GET",
		path: "/locations",
		summary: "List locations by campaign",
	})
	.input(ListLocationsRequestSchema)
	.handler(async ({ input, context }) => {
		const { campaignId } = input;
		const db = context.db;

		const locationsRow = await db
			.select()
			.from(locationsTable)
			.where(eq(locationsTable.campaignId, campaignId));

		return locationsRow;
	});

export const locationRouter = {
	getLocationById,
	listLocationsByCampaignId,
};
