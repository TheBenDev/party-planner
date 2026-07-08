import { relations } from "drizzle-orm";
import {
	foreignKey,
	index,
	pgTable,
	timestamp,
	unique,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { campaignsTable } from "./campaigns";
import { colonyTable } from "./colony";
import { locationsTable } from "./locations";

export const regionsTable = pgTable(
	"regions",
	{
		campaignId: uuid("campaign_id").notNull(),
		colonyId: uuid("colony_id"),
		createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
		deletedAt: timestamp("deleted_at", { mode: "date" }),
		id: uuid("id").primaryKey().defaultRandom(),
		mapImageUrl: varchar("map_image_url"),

		name: varchar("name").notNull(),
		updatedAt: timestamp("updated_at", { mode: "date" })
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		foreignKey({
			columns: [table.campaignId],
			foreignColumns: [campaignsTable.id],
			name: "fk_region_campaign_id",
		}).onDelete("cascade"),
		index("idx_region_campaign_id").on(table.campaignId),
		foreignKey({
			columns: [table.colonyId],
			foreignColumns: [colonyTable.id],
			name: "fk_region_colony_id",
		}).onDelete("cascade"),
		index("idx_region_colony_id").on(table.colonyId),
		unique("uq_region_colony_id").on(table.colonyId),
	],
);

export const regionsRelations = relations(regionsTable, ({ one, many }) => ({
	campaign: one(campaignsTable, {
		fields: [regionsTable.campaignId],
		references: [campaignsTable.id],
	}),
	colony: one(colonyTable, {
		fields: [regionsTable.colonyId],
		references: [colonyTable.id],
	}),
	locations: many(locationsTable),
}));
