import { Status } from "@planner/enums/session";
import { relations } from "drizzle-orm";
import {
	foreignKey,
	index,
	pgEnum,
	pgTable,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { enumToPgEnum } from "@/lib/enums";
import { campaignsTable } from "./campaigns";
import { charactersTable } from "./characters";

export const sessionStatusEnum = pgEnum("session_status", enumToPgEnum(Status));

export const sessionsTable = pgTable(
	"session",
	{
		announcedAt: timestamp("announced_at", { mode: "date" }),
		campaignId: uuid("campaign_id").notNull(),
		createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
		description: varchar("description"),
		id: uuid("id").primaryKey().defaultRandom(),
		pollId: varchar("poll_id"),
		startsAt: timestamp("starts_at", { mode: "date" }),
		status: sessionStatusEnum("status").notNull(),
		title: varchar("title").notNull(),
		updatedAt: timestamp("updated_at", { mode: "date" })
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
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
