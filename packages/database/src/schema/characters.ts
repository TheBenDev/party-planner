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
import { usersTable } from "./users";

export const charactersTable = pgTable(
	"player_character",
	{
		avatar: varchar("avatar"),
		campaignId: uuid("campaign_id"),
		characterSheet: jsonb("character_sheet"),
		createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
		deletedAt: timestamp("deleted_at", { mode: "date" }),
		firstName: varchar("first_name").notNull(),
		id: uuid("id").primaryKey().defaultRandom(),
		lastName: varchar("last_name").notNull(),
		originId: uuid("origin_id"),
		updatedAt: timestamp("updated_at", { mode: "date" })
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
		userId: uuid("user_id").notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.userId],
			foreignColumns: [usersTable.id],
			name: "fk_character_user_id",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.campaignId],
			foreignColumns: [campaignsTable.id],
			name: "fk_character_campaign_id",
		}).onDelete("set null"),
		foreignKey({
			columns: [table.originId],
			foreignColumns: [locationsTable.id],
			name: "fk_character_location_id",
		}).onDelete("set null"),
		index("idx_character_location_id").on(table.originId),
		index("idx_character_user_id").on(table.userId),
		index("idx_character_campaign_id").on(table.campaignId),
	],
);

export const charactersRelations = relations(charactersTable, ({ one }) => ({
	campaign: one(campaignsTable, {
		fields: [charactersTable.campaignId],
		references: [campaignsTable.id],
	}),
	origin: one(locationsTable, {
		fields: [charactersTable.originId],
		references: [locationsTable.id],
	}),
	user: one(usersTable, {
		fields: [charactersTable.userId],
		references: [usersTable.id],
	}),
}));
