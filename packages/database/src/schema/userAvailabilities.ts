import { relations, sql } from "drizzle-orm";
import {
	check,
	foreignKey,
	index,
	integer,
	pgTable,
	time,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { campaignsTable } from "./campaigns";
import { usersTable } from "./users";

export const userAvailabilitiesTable = pgTable(
	"user_availabilities",
	{
		campaignId: uuid("campaign_id"),
		createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
		dayOfWeek: integer("day_of_week").notNull(),
		effectiveFrom: timestamp("effective_from", { mode: "date" })
			.notNull()
			.defaultNow(),
		effectiveUntil: timestamp("effective_until", { mode: "date" }),
		endTime: time("end_time").notNull().default("23:59:59"),
		id: uuid("id").primaryKey().defaultRandom(),
		interval: integer("interval").notNull().default(1),
		startTime: time("start_time").notNull(),
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
			name: "fk_user_availability_user_id",
		}).onDelete("cascade"),
		foreignKey({
			columns: [t.campaignId],
			foreignColumns: [campaignsTable.id],
			name: "fk_user_availability_campaign_id",
		}).onDelete("cascade"),
		index("idx_user_availability_user_id").on(t.userId),
		index("idx_user_availability_campaign_id").on(t.campaignId),
		index("idx_user_availability_lookup").on(
			t.userId,
			t.campaignId,
			t.dayOfWeek,
		),
		check(
			"day_of_week_valid",
			sql`${t.dayOfWeek} >= 0 AND ${t.dayOfWeek} <= 6`,
		),
		check("interval_valid", sql`${t.interval} > 0 AND ${t.interval} <= 2`),
		check(
			"effective_until_valid",
			sql`${t.effectiveUntil} = null OR ${t.effectiveUntil} > ${t.effectiveFrom}`,
		),
	],
);

export const userAvailabilityRulesRelations = relations(
	userAvailabilitiesTable,
	({ one }) => ({
		campaign: one(campaignsTable, {
			fields: [userAvailabilitiesTable.campaignId],
			references: [campaignsTable.id],
		}),
		user: one(usersTable, {
			fields: [userAvailabilitiesTable.userId],
			references: [usersTable.id],
		}),
	}),
);
