import { IntegrationSource } from "@planner/enums/integration";
import type {
	IntegrationMetadata,
	IntegrationSettings,
} from "@planner/schemas/integration";
import { relations } from "drizzle-orm";
import {
	foreignKey,
	index,
	jsonb,
	pgEnum,
	pgTable,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { enumToPgEnum } from "../utils/enums";
import { campaignsTable } from "./campaigns";

export const integrationSourceEnum = pgEnum(
	"integration_source",
	enumToPgEnum(IntegrationSource),
);

export const campaignIntegrationsTable = pgTable(
	"campaign_integrations",
	{
		campaignId: uuid("campaign_id").notNull(),
		createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
		externalId: varchar("external_id").notNull(),
		id: uuid("integration_id").primaryKey().defaultRandom(),
		metadata: jsonb("metadata").$type<IntegrationMetadata>(),
		settings: jsonb("settings").$type<IntegrationSettings>(),
		source: integrationSourceEnum("source").notNull(),
		updatedAt: timestamp("updated_at", { mode: "date" })
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
	},
	(t) => [
		foreignKey({
			columns: [t.campaignId],
			foreignColumns: [campaignsTable.id],
			name: "fk_integration_campaign_id",
		}).onDelete("cascade"),
		index("idx_integrations_campaign_id").on(t.campaignId),
		index("idx_integrations_source").on(t.source),
		uniqueIndex("unique_campaign_source").on(t.campaignId, t.source),
	],
);

export const integrationsRelations = relations(
	campaignIntegrationsTable,
	({ one }) => ({
		campaign: one(campaignsTable, {
			fields: [campaignIntegrationsTable.campaignId],
			references: [campaignsTable.id],
		}),
	}),
);
