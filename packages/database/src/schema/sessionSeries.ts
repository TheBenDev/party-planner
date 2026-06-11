import { relations } from "drizzle-orm";
import {
	foreignKey,
	index,
	integer,
	pgTable,
	time,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { campaignsTable } from "./campaigns";
import { sessionExceptionsTable } from "./sessionExceptions";
import { sessionsTable } from "./sessions";

export const sessionSeriesTable = pgTable(
	"session_series",
	{
		campaignId: uuid("campaign_id").notNull(),
		createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
		description: varchar("description"),
		durationMinutes: integer("duration_minutes").notNull().default(180),
		id: uuid("id").primaryKey().defaultRandom(),
		rrule: varchar("rrule").notNull(),
		seriesEndDate: timestamp("series_end_date", { mode: "date" }),
		seriesStartDate: timestamp("series_start_date", { mode: "date" }).notNull(),
		startTime: time("start_time").notNull(),
		timezone: varchar("timezone").notNull().default("UTC"),
		title: varchar("title").notNull(),
		updatedAt: timestamp("updated_at", { mode: "date" })
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
	},
	(t) => [
		foreignKey({
			columns: [t.campaignId],
			foreignColumns: [campaignsTable.id],
			name: "fk_session_series_campaign_id",
		}).onDelete("cascade"),
		index("idx_session_series_campaign_id").on(t.campaignId),
	],
);

export const sessionSeriesRelations = relations(
	sessionSeriesTable,
	({ one, many }) => ({
		campaign: one(campaignsTable, {
			fields: [sessionSeriesTable.campaignId],
			references: [campaignsTable.id],
		}),
		exceptions: many(sessionExceptionsTable),
		sessions: many(sessionsTable),
	}),
);
