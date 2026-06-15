import { relations } from "drizzle-orm";
import {
	foreignKey,
	index,
	integer,
	pgTable,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { campaignsTable } from "./campaigns";
import { charactersTable } from "./characters";
import { sessionSeriesTable } from "./sessionSeries";

export const sessionsTable = pgTable(
	"session",
	{
		campaignId: uuid("campaign_id").notNull(),
		createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
		description: varchar("description"),
		durationMinutes: integer("duration_minutes").notNull().default(180),
		id: uuid("id").primaryKey().defaultRandom(),
		recap: varchar("recap"),
		scheduledAt: timestamp("scheduled_at", { mode: "date" }),
		seriesId: uuid("series_id"),
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
		index("idx_session_scheduled_at").on(table.scheduledAt),
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
