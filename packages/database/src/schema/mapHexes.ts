// biome-ignore-all assist/source/useSortedKeys: organized keys differently
import { relations } from "drizzle-orm";
import {
	foreignKey,
	index,
	integer,
	pgTable,
	text,
	unique,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { campaignsTable } from "./campaigns";

export const mapHexesTable = pgTable(
	"map_hexes",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		campaignId: uuid("campaign_id").notNull(),
		q: integer("q").notNull(),
		r: integer("r").notNull(),
		terrain: varchar("terrain", { length: 50 }).notNull(),
		label: text("label"),
	},
	(table) => [
		foreignKey({
			columns: [table.campaignId],
			foreignColumns: [campaignsTable.id],
			name: "fk_map_hexes_campaign_id",
		}).onDelete("cascade"),
		index("idx_map_hexes_campaign_id").on(table.campaignId),
		unique("uq_map_hexes_campaign_q_r").on(table.campaignId, table.q, table.r),
	],
);

export const mapHexesRelations = relations(mapHexesTable, ({ one }) => ({
	campaign: one(campaignsTable, {
		fields: [mapHexesTable.campaignId],
		references: [campaignsTable.id],
	}),
}));
