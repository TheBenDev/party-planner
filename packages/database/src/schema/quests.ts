import { Status } from "@planner/enums/quest";
import { relations } from "drizzle-orm";
import {
	foreignKey,
	index,
	jsonb,
	pgEnum,
	pgTable,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { enumToPgEnum } from "../utils/enums";
import { campaignsTable } from "./campaigns";
import { nonPlayerCharactersTable } from "./nonPlayerCharacters";

export const questStatusEnum = pgEnum("quest_status", enumToPgEnum(Status));

export const questsTable = pgTable(
	"quest",
	{
		campaignId: uuid("campaign_id").notNull(),
		completedAt: timestamp("completed_at", { mode: "date" }),
		createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
		deletedAt: timestamp("deleted_at", { mode: "date" }),
		description: varchar("description"),
		id: uuid("id").primaryKey().defaultRandom(),
		questGiverId: uuid("quest_giver_id"),
		reward: jsonb("reward"),
		status: questStatusEnum("status").notNull(),
		title: varchar("title").notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.questGiverId],
			foreignColumns: [nonPlayerCharactersTable.id],
			name: "fk_quest_quest_giver_id",
		}).onDelete("set null"),
		foreignKey({
			columns: [table.campaignId],
			foreignColumns: [campaignsTable.id],
			name: "fk_quest_campaign_id",
		}).onDelete("cascade"),
		index("idx_quest_giver_id").on(table.questGiverId),
		index("idx_quest_campaign_id").on(table.campaignId),
	],
);

export const questsRelations = relations(questsTable, ({ one }) => ({
	campaign: one(campaignsTable, {
		fields: [questsTable.campaignId],
		references: [campaignsTable.id],
	}),
	questGiver: one(nonPlayerCharactersTable, {
		fields: [questsTable.questGiverId],
		references: [nonPlayerCharactersTable.id],
	}),
}));
