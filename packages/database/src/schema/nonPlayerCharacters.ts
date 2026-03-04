// biome-ignore-all assist/source/useSortedKeys: organized keys differently
import {
	CharacterStatusEnum,
	RelationToPartyEnum,
} from "@planner/enums/character";
import { relations } from "drizzle-orm";
import {
	boolean,
	foreignKey,
	index,
	pgEnum,
	pgTable,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { campaignsTable } from "./campaigns";
import { locationsTable } from "./locations";
import { questsTable } from "./quests";
import { sessionsTable } from "./sessions";

export const characterStatusEnum = pgEnum(
	"character_status_enum",
	CharacterStatusEnum,
);
export const relationToPartyEnum = pgEnum(
	"relation_to_party_enum",
	RelationToPartyEnum,
);

export const nonPlayerCharactersTable = pgTable(
	"non_player_character",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { mode: "date" })
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),

		age: varchar("age"),
		aliases: varchar("aliases").array(),
		appearance: varchar("appearance"),
		avatar: varchar("avatar"),
		backstory: varchar("backstory"),
		name: varchar("name").notNull(),
		race: varchar("race"),
		playerNotes: varchar("player_notes"),
		personality: varchar("personality"),
		relationToPartyStatus: relationToPartyEnum("relation_to_party_status")
			.notNull()
			.default(RelationToPartyEnum.UNKNOWN),
		status: characterStatusEnum("status")
			.notNull()
			.default(CharacterStatusEnum.UNKNOWN),

		isKnownToParty: boolean("is_known_to_party").notNull().default(false),
		knownName: varchar("known_name"),
		dmNotes: varchar("dm_notes"),

		foundryActorId: varchar("foundry_actor_id"),
		lastFoundrySyncAt: timestamp("last_foundry_sync_at"),

		campaignId: uuid("campaign_id").notNull(),
		currentLocationId: uuid("current_location_id"),
		originLocationId: uuid("origin_location_id"),
		sessionEncounteredId: uuid("session_encountered_id"),
	},
	(table) => [
		foreignKey({
			columns: [table.originLocationId],
			foreignColumns: [locationsTable.id],
			name: "fk_npc_origin_location_id",
		}).onDelete("set null"),
		index("idx_npc_origin_location_id").on(table.originLocationId),
		foreignKey({
			columns: [table.campaignId],
			foreignColumns: [campaignsTable.id],
			name: "fk_npc_campaign_id",
		}).onDelete("cascade"),
		index("idx_npc_campaign_id").on(table.campaignId),
		foreignKey({
			columns: [table.currentLocationId],
			foreignColumns: [locationsTable.id],
			name: "fk_npc_current_location_id",
		}).onDelete("set null"),
		index("idx_npc_current_location_id").on(table.currentLocationId),
		foreignKey({
			columns: [table.sessionEncounteredId],
			foreignColumns: [sessionsTable.id],
			name: "fk_npc_session_encountered_id",
		}).onDelete("set null"),
		index("idx_npc_session_encountered_id").on(table.sessionEncounteredId),
	],
);

export const nonPlayerCharactersRelations = relations(
	nonPlayerCharactersTable,
	({ one, many }) => ({
		campaign: one(campaignsTable, {
			fields: [nonPlayerCharactersTable.campaignId],
			references: [campaignsTable.id],
		}),
		origin: one(locationsTable, {
			fields: [nonPlayerCharactersTable.originLocationId],
			references: [locationsTable.id],
			relationName: "npc_origin_location",
		}),
		currentlyAt: one(locationsTable, {
			fields: [nonPlayerCharactersTable.currentLocationId],
			references: [locationsTable.id],
			relationName: "npc_current_location",
		}),
		firstSession: one(sessionsTable, {
			fields: [nonPlayerCharactersTable.sessionEncounteredId],
			references: [sessionsTable.id],
		}),
		quests: many(questsTable),
	}),
);
