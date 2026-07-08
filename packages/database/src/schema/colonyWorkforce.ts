// biome-ignore-all assist/source/useSortedKeys: organized keys differently
import { WorkerTypeEnum } from "@planner/enums/colony";
import { relations } from "drizzle-orm";
import {
	foreignKey,
	index,
	integer,
	pgEnum,
	pgTable,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { enumToPgEnum } from "@/lib/enums";
import { colonyTable } from "./colony";
import { nonPlayerCharactersTable } from "./nonPlayerCharacters";

export const workerTypeEnum = pgEnum(
	"worker_type",
	enumToPgEnum(WorkerTypeEnum),
);

export const colonyWorkforceTable = pgTable(
	"colony_workforce",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { mode: "date" })
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),

		workerType: workerTypeEnum("worker_type").notNull(),
		count: integer("count").notNull().default(0),

		colonyId: uuid("colony_id").notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.colonyId],
			foreignColumns: [colonyTable.id],
			name: "fk_colony_workforce_colony_id",
		}).onDelete("cascade"),
		index("idx_colony_workforce_colony_id").on(table.colonyId),
		uniqueIndex("uq_colony_workforce_colony_worker_type").on(
			table.colonyId,
			table.workerType,
		),
	],
);

export const colonyWorkforceRelations = relations(
	colonyWorkforceTable,
	({ one, many }) => ({
		colony: one(colonyTable, {
			fields: [colonyWorkforceTable.colonyId],
			references: [colonyTable.id],
		}),
		namedWorkers: many(nonPlayerCharactersTable),
	}),
);
