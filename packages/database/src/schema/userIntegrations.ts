import { relations } from "drizzle-orm";
import {
	foreignKey,
	index,
	pgEnum,
	pgTable,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { enumToPgEnum } from "../utils/enums";
import { campaignUsersTable } from "./campaignUsers";
import { usersTable } from "./users";

enum IntegrationSourceEnum {
	DISCORD = "DISCORD",
}
const integrationSourceEnum = pgEnum(
	"integration_source",
	enumToPgEnum(IntegrationSourceEnum),
);

export const userIntegrationsTable = pgTable(
	"user_integrations",
	{
		campaignId: uuid("campaign_id").notNull(),
		createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
		externalId: varchar("external_id").notNull().unique(),
		id: uuid("id").primaryKey().defaultRandom(),
		source: integrationSourceEnum("source").notNull(),
		updatedAt: timestamp("updated_at", { mode: "date" })
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
		userId: uuid("user_id").notNull(),
	},
	(t) => [
		foreignKey({
			columns: [t.userId],
			foreignColumns: [usersTable.id],
			name: "fk_integrations_user_id",
		}).onDelete("cascade"),
		foreignKey({
			columns: [t.userId, t.campaignId],
			foreignColumns: [
				campaignUsersTable.userId,
				campaignUsersTable.campaignId,
			],
			name: "fk_integrations_org_user",
		}).onDelete("cascade"),
		index("idx_user_integrations_user_id").on(t.userId),
		index("idx_user_integrations_campaign_id").on(t.campaignId),
		index("idx_user_integrations_external_id").on(t.externalId),
		uniqueIndex("unique_user_campaign_source").on(
			t.campaignId,
			t.source,
			t.userId,
		),
	],
);

export const userIntegrationsRelations = relations(
	userIntegrationsTable,
	({ one }) => ({
		campaignUser: one(campaignUsersTable, {
			fields: [userIntegrationsTable.userId, userIntegrationsTable.campaignId],
			references: [campaignUsersTable.userId, campaignUsersTable.campaignId],
		}),
		user: one(usersTable, {
			fields: [userIntegrationsTable.userId],
			references: [usersTable.id],
		}),
	}),
);
