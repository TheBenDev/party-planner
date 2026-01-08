import { relations } from "drizzle-orm";
import {
	foreignKey,
	index,
	pgTable,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { campaignsTable } from "./campaigns";
import { charactersTable } from "./characters";

export const sessionsTable = pgTable(
	"session",
	{
		campaignId: uuid("campaign_id").notNull(),
		createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
		deletedAt: timestamp("deleted_at", { mode: "date" }),
		description: varchar("description"),
		dmNotes: varchar("dm_notes"),
		id: uuid("id").primaryKey().defaultRandom(),
		notes: varchar("notes"),
		startsAt: timestamp("starts_at", { mode: "date" }),
		title: varchar("title").notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.campaignId],
			foreignColumns: [campaignsTable.id],
			name: "fk_session_campaign_id",
		}).onDelete("cascade"),
		index("idx_session_campaign_id").on(table.campaignId),
	],
);

export const sessionsRelations = relations(sessionsTable, ({ one, many }) => ({
	campaign: one(campaignsTable, {
		fields: [sessionsTable.campaignId],
		references: [campaignsTable.id],
	}),
	players: many(charactersTable),
}));
