import { relations } from "drizzle-orm";
import {
	foreignKey,
	index,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { integrationSourceEnum } from "./campaignIntegrations";
import { usersTable } from "./users";

export const userIntegrationsTable = pgTable(
	"user_integrations",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: uuid("user_id").notNull(),
		source: integrationSourceEnum("source").notNull(),
		metadata: text("metadata"),
		createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { mode: "date" })
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
	},
	(t) => [
		foreignKey({
			columns: [t.userId],
			foreignColumns: [usersTable.id],
			name: "fk_user_integrations_user_id",
		}).onDelete("cascade"),
		index("idx_user_integrations_user_id").on(t.userId),
		uniqueIndex("unique_user_source").on(t.userId, t.source),
	],
);

export const userIntegrationsRelations = relations(
	userIntegrationsTable,
	({ one }) => ({
		user: one(usersTable, {
			fields: [userIntegrationsTable.userId],
			references: [usersTable.id],
		}),
	}),
);
