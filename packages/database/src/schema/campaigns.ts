import { relations } from "drizzle-orm";
import {
	foreignKey,
	index,
	pgTable,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { campaignUsersTable } from "./campaignUsers";
import { locationsTable } from "./locations";
import { nonPlayerCharactersTable } from "./nonPlayerCharacters";
import { questsTable } from "./quests";
import { sessionsTable } from "./sessions";
import { usersTable } from "./users";

export const campaignsTable = pgTable(
	"campaigns",
	{
		createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
		deletedAt: timestamp("deleted_at", { mode: "date" }),
		description: varchar("description"),
		id: uuid("id").primaryKey().defaultRandom(),
		tags: varchar("tags").array(),
		title: varchar("title").notNull(),
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
			name: "fk_campaign_user_id",
		}).onDelete("cascade"),
		index("idx_campaign_user_id").on(table.userId),
	],
);

export const campaignsRelations = relations(
	campaignsTable,
	({ one, many }) => ({
		locations: many(locationsTable),
		npcs: many(nonPlayerCharactersTable),
		owner: one(usersTable, {
			fields: [campaignsTable.userId],
			references: [usersTable.id],
		}),
		quests: many(questsTable),
		sessions: many(sessionsTable),
		users: many(campaignUsersTable),
	}),
);
