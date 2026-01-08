import { relations } from "drizzle-orm";
import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { campaignsTable } from "./campaigns";
import { charactersTable } from "./characters";
import { nonPlayerCharactersTable } from "./nonPlayerCharacters";

export const locationsTable = pgTable("location", {
	campaignId: uuid("campaign_id"),
	createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { mode: "date" }),
	description: varchar("description"),
	dmNotes: varchar("dm_notes"),
	id: uuid("id").primaryKey().defaultRandom(),
	name: varchar("name").notNull(),
	notes: varchar("notes"),
});

export const locationsRelations = relations(
	locationsTable,
	({ many, one }) => ({
		campaign: one(campaignsTable, {
			fields: [locationsTable.campaignId],
			references: [campaignsTable.id],
		}),
		npcOrigins: many(nonPlayerCharactersTable),
		playerOrigins: many(charactersTable),
	}),
);
