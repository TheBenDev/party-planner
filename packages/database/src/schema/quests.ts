import { QuestStatusEnum, QuestTypeEnum } from "@planner/enums/quest";
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
import { enumToPgEnum } from "../lib/enums";
import { campaignsTable } from "./campaigns";
import { nonPlayerCharactersTable } from "./nonPlayerCharacters";
import { patronsTable } from "./patron";

export const questStatusEnum = pgEnum("quest_status", enumToPgEnum(QuestStatusEnum));
export const questTypeEnum = pgEnum("quest_type", enumToPgEnum(QuestTypeEnum))
export const questsTable = pgTable(
	"quest",
	{
		campaignId: uuid("campaign_id").notNull(),
		completedAt: timestamp("completed_at", { mode: "date" }),
		createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
		deletedAt: timestamp("deleted_at", { mode: "date" }),
		description: varchar("description"),
		id: uuid("id").primaryKey().defaultRandom(),
		npcId: uuid("npc_id"),
		patronId: uuid("patron_id"),
		reward: jsonb("reward"),
		status: questStatusEnum("status").notNull(),
    title: varchar("title").notNull(),
		type: questTypeEnum("type").default(QuestTypeEnum.COLONY),
		updatedAt: timestamp("updated_at", { mode: "date" })
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		foreignKey({
			columns: [table.npcId],
			foreignColumns: [nonPlayerCharactersTable.id],
			name: "fk_quest_npc_id",
		}).onDelete("set null"),
		foreignKey({
			columns: [table.patronId],
			foreignColumns: [patronsTable.id],
			name: "fk_quest_patron_id",
		}).onDelete("set null"),
		foreignKey({
			columns: [table.campaignId],
			foreignColumns: [campaignsTable.id],
			name: "fk_quest_campaign_id",
		}).onDelete("cascade"),
		index("idx_quest_npc_id").on(table.npcId),
		index("idx_quest_patron_id").on(table.patronId),
		index("idx_quest_campaign_id").on(table.campaignId),
	],
);

export const questsRelations = relations(questsTable, ({ one }) => ({
	campaign: one(campaignsTable, {
		fields: [questsTable.campaignId],
		references: [campaignsTable.id],
	}),
	npc: one(nonPlayerCharactersTable, {
		fields: [questsTable.npcId],
		references: [nonPlayerCharactersTable.id],
	}),
	patron: one(patronsTable, {
		fields: [questsTable.patronId],
		references: [patronsTable.id],
	}),
}));
