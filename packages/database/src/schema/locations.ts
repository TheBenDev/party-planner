import { relations } from "drizzle-orm";
import {
	foreignKey,
	index,
	pgTable,
	real,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { charactersTable } from "./characters";
import { nonPlayerCharactersTable } from "./nonPlayerCharacters";
import { regionsTable } from "./regions";

export const locationsTable = pgTable(
	"location",
	{
		createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
		deletedAt: timestamp("deleted_at", { mode: "date" }),
		description: varchar("description"),
		dmNotes: varchar("dm_notes"),
		id: uuid("id").primaryKey().defaultRandom(),
		mapX: real("map_x"),
		mapY: real("map_y"),

		name: varchar("name").notNull(),
		notes: varchar("notes"),

		regionId: uuid("region_id").notNull(),
		updatedAt: timestamp("updated_at", { mode: "date" })
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		foreignKey({
			columns: [table.regionId],
			foreignColumns: [regionsTable.id],
			name: "fk_location_region_id",
		}).onDelete("cascade"),
		index("idx_location_region_id").on(table.regionId),
	],
);

export const locationsRelations = relations(
	locationsTable,
	({ many, one }) => ({
		npcOrigins: many(nonPlayerCharactersTable),
		playerOrigins: many(charactersTable),
		region: one(regionsTable, {
			fields: [locationsTable.regionId],
			references: [regionsTable.id],
		}),
	}),
);
