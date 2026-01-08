import { UserRole } from "@planner/enums/user";
import { relations } from "drizzle-orm";
import {
	foreignKey,
	pgEnum,
	pgTable,
	primaryKey,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { enumToPgEnum } from "../utils/enums";
import { campaignsTable } from "./campaigns";
import { usersTable } from "./users";

export const userRoleEnum = pgEnum("user_role", enumToPgEnum(UserRole));

export const campaignUsersTable = pgTable(
	"campaign_users",
	{
		campaignId: uuid("campaign_id").notNull(),
		createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
		role: userRoleEnum("role").notNull(),
		updatedAt: timestamp("updated_at", { mode: "date" })
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
		userId: uuid("user_id").notNull(),
	},
	(t) => [
		primaryKey({ columns: [t.userId, t.campaignId] }),
		foreignKey({
			columns: [t.campaignId],
			foreignColumns: [campaignsTable.id],
			name: "fk_campaign_user_campaign_id",
		}).onDelete("cascade"),
		foreignKey({
			columns: [t.userId],
			foreignColumns: [usersTable.id],
			name: "fk_campaign_user_user_id",
		}).onDelete("cascade"),
		uniqueIndex("unique_campaign_user").on(t.userId, t.campaignId),
	],
);

export const campaignUsersRelations = relations(
	campaignUsersTable,
	({ one }) => ({
		campaign: one(campaignsTable, {
			fields: [campaignUsersTable.campaignId],
			references: [campaignsTable.id],
		}),
		user: one(usersTable, {
			fields: [campaignUsersTable.userId],
			references: [usersTable.id],
		}),
	}),
);
