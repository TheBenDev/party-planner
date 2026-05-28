import { relations } from "drizzle-orm";
import {
	foreignKey,
	index,
	pgTable,
	timestamp,
	unique,
	uuid,
} from "drizzle-orm/pg-core";
import { sessionSeriesTable } from "./sessionSeries";

export const sessionExceptionsTable = pgTable(
	"session_exceptions",
	{
		createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
		excludedDate: timestamp("excluded_date", { mode: "date" }).notNull(),
		id: uuid("id").primaryKey().defaultRandom(),
		seriesId: uuid("series_id").notNull(),
	},
	(t) => [
		foreignKey({
			columns: [t.seriesId],
			foreignColumns: [sessionSeriesTable.id],
			name: "fk_session_exception_series_id",
		}).onDelete("cascade"),
		unique("uq_session_exception_series_date").on(t.seriesId, t.excludedDate),
		index("idx_session_exception_series_id").on(t.seriesId),
	],
);

export const sessionExceptionsRelations = relations(
	sessionExceptionsTable,
	({ one }) => ({
		series: one(sessionSeriesTable, {
			fields: [sessionExceptionsTable.seriesId],
			references: [sessionSeriesTable.id],
		}),
	}),
);
