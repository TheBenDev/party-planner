import { relations } from "drizzle-orm";
import {
	foreignKey,
	index,
	integer,
	pgTable,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { campaignsTable } from "./campaigns";
import { colonyTable } from "./colony";

export const patronsTable = pgTable(
	"patron",
	{
		campaignId: uuid("campaign_id").notNull(),
		colonyId: uuid("colony_id").notNull(),
		createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
		favor: integer("favor").notNull().default(0),
		id: uuid("id").primaryKey().defaultRandom(),
		name: varchar("name").notNull(),
		updatedAt: timestamp("updated_at", { mode: "date" })
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		foreignKey({
			columns: [table.colonyId],
			foreignColumns: [colonyTable.id],
			name: "fk_colony_id",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.campaignId],
			foreignColumns: [campaignsTable.id],
			name: "fk_campaign_id",
		}).onDelete("cascade"),
		index("idx_patron_campaign_id").on(table.campaignId),
	],
);

export const patronsRelations = relations(patronsTable, ({ one }) => ({
	campaign: one(campaignsTable, {
		fields: [patronsTable.campaignId],
		references: [campaignsTable.id],
	}),
	colony: one(colonyTable, {
		fields: [patronsTable.colonyId],
		references: [colonyTable.id],
	}),
}));
