import { schema } from "@planner/database";
import {
	GetLocationRequestSchema,
	ListLocationsRequestSchema,
} from "@planner/schemas/locations";
import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { j, privateProcedure } from "../jsandy";

const { locationsTable } = schema;

export const locationRouter = j.router({
	getlocation: privateProcedure
		.input(GetLocationRequestSchema)
		.query(async ({ c, input }) => {
			const { id } = input;
			const db = c.get("db");

			const locationRow = await db
				.select()
				.from(locationsTable)
				.where(eq(locationsTable.id, id))
				.limit(1);

			if (locationRow.length === 0) {
				throw new HTTPException(404, { message: "location not found" });
			}

			return c.json(locationRow[0]);
		}),
	listlocations: privateProcedure
		.input(ListLocationsRequestSchema)
		.query(async ({ c, input }) => {
			const { campaignId } = input;
			const db = c.get("db");

			const locationsRow = await db
				.select()
				.from(locationsTable)
				.where(eq(locationsTable.campaignId, campaignId));

			return c.json(locationsRow);
		}),
});
