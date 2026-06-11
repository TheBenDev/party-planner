import { Status } from "@planner/enums/session";
import { relations } from "drizzle-orm";
import {
	foreignKey,
	index,
	integer,
	pgEnum,
	pgTable,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { enumToPgEnum } from "@/lib/enums";
import { campaignsTable } from "./campaigns";
import { charactersTable } from "./characters";
import { sessionSeriesTable } from "./sessionSeries";

export const sessionStatusEnum = pgEnum("session_status", enumToPgEnum(Status));

export const sessionsTable = pgTable(
	"session",
	{
		announcedAt: timestamp("announced_at", { mode: "date" }),
		campaignId: uuid("campaign_id").notNull(),
		createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
		description: varchar("description"),
		discordEventId: varchar("discord_event_id"),
		durationMinutes: integer("duration_minutes").notNull().default(180),
		id: uuid("id").primaryKey().defaultRandom(),
		originalStartsAt: timestamp("original_starts_at", { mode: "date" }),
		pollId: varchar("poll_id"),
		recap: varchar("recap"),
		seriesId: uuid("series_id"),
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
		foreignKey({
			columns: [table.seriesId],
			foreignColumns: [sessionSeriesTable.id],
			name: "fk_session_series_id",
		}).onDelete("set null"),
		index("idx_session_series_id").on(table.seriesId),
	],
);

export const sessionsRelations = relations(sessionsTable, ({ one, many }) => ({
	campaign: one(campaignsTable, {
		fields: [sessionsTable.campaignId],
		references: [campaignsTable.id],
	}),
	players: many(charactersTable),
	series: one(sessionSeriesTable, {
		fields: [sessionsTable.seriesId],
		references: [sessionSeriesTable.id],
	}),
}));
