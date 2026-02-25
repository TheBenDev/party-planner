import { relations } from "drizzle-orm";
import {
	foreignKey,
	index,
	jsonb,
	pgTable,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { campaignsTable } from "./campaigns";
import { locationsTable } from "./locations";
import { questsTable } from "./quests";

export const nonPlayerCharactersTable = pgTable(
	"non_player_character",
	{
		avatar: varchar("avatar"),
		bio: varchar("bio"),
		campaignId: uuid("campaign_id"),
		characterSheet: jsonb("character_sheet"),
		createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
		deletedAt: timestamp("deleted_at", { mode: "date" }),
		dmNotes: varchar("dm_notes"),
		firstName: varchar("first_name").notNull(),
		id: uuid("id").primaryKey().defaultRandom(),
		lastName: varchar("last_name"),
		notes: varchar("notes"),
		originId: uuid("origin_id"),
		updatedAt: timestamp("updated_at", { mode: "date" })
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		foreignKey({
			columns: [table.originId],
			foreignColumns: [locationsTable.id],
			name: "fk_npc_location_id",
		}).onDelete("set null"),
		index("idx_npc_location_id").on(table.originId),
		foreignKey({
			columns: [table.campaignId],
			foreignColumns: [campaignsTable.id],
			name: "fk_npc_campaign_id",
		}).onDelete("set null"),
		index("idx_npc_campaign_id").on(table.campaignId),
	],
);

export const nonPlayerCharactersRelations = relations(
	nonPlayerCharactersTable,
	({ one, many }) => ({
		campaign: one(campaignsTable, {
			fields: [nonPlayerCharactersTable.campaignId],
			references: [campaignsTable.id],
		}),
		origin: one(locationsTable, {
			fields: [nonPlayerCharactersTable.originId],
			references: [locationsTable.id],
		}),
		quests: many(questsTable),
	}),
);
