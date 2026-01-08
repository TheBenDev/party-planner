import { relations } from "drizzle-orm";
import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { campaignUsersTable } from "./campaignUsers";
import { charactersTable } from "./characters";

export const usersTable = pgTable("users", {
	avatar: varchar("avatar"),
	createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { mode: "date" }),
	email: varchar("email").notNull().unique(),
	externalId: varchar("external_id").unique().notNull(),
	firstName: varchar("first_name").notNull(),
	id: uuid("id").primaryKey().defaultRandom(),
	lastName: varchar("last_name").notNull(),
	updatedAt: timestamp("updated_at", { mode: "date" })
		.defaultNow()
		.notNull()
		.$onUpdate(() => new Date()),
});

export const usersRelations = relations(usersTable, ({ many }) => ({
	campaigns: many(campaignUsersTable),
	characters: many(charactersTable),
}));
