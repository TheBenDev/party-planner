// biome-ignore-all assist/source/useSortedKeys: organized keys differently
import { relations } from "drizzle-orm";
import {
	foreignKey,
	index,
	integer,
	pgTable,
	smallint,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { campaignsTable } from "./campaigns";
import { colonyWorkforceTable } from "./colonyWorkforce";
import { nonPlayerCharactersTable } from "./nonPlayerCharacters";
import { regionsTable } from "./regions";

export const colonyTable = pgTable(
	"colony",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { mode: "date" })
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),

		colonistCount: integer("colonist_count").notNull().default(0),
		food: integer("food").notNull().default(0),
		buildingMaterials: integer("building_materials").notNull().default(0),
		gold: integer("gold").notNull().default(0),
		morale: smallint("morale").notNull().default(100),

		campaignId: uuid("campaign_id").notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.campaignId],
			foreignColumns: [campaignsTable.id],
			name: "fk_colony_campaign_id",
		}).onDelete("cascade"),
		index("idx_colony_campaign_id").on(table.campaignId),
	],
);

export const colonyRelations = relations(colonyTable, ({ one, many }) => ({
	campaign: one(campaignsTable, {
		fields: [colonyTable.campaignId],
		references: [campaignsTable.id],
	}),
	region: one(regionsTable),
	workforce: many(colonyWorkforceTable),
	namedColonists: many(nonPlayerCharactersTable),
}));
