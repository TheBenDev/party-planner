import { Status } from "@planner/enums/quest";
import z from "zod";
import { BaseEntitySchema } from "./common";

export const QuestsSchema = BaseEntitySchema.extend({
	campaignId: z.uuid(),
	completedAt: z.date().nullable().optional(),
	deletedAt: z.date().nullable().optional(),
	description: z.string().nullable().optional(),
	questGiverId: z.uuid().nullable().optional(),
	reward: z.any(),
	status: z.enum(Status),
	title: z.string(),
});

export const GetQuestRequestSchema = z.object({ id: z.uuid() });
export const GetQuestResponseSchema = QuestsSchema;

export const ListQuestsRequestSchema = z.object({
	campaignId: z.uuid(),
});
export const ListQuestsResponseSchema = z.array(QuestsSchema);

export type ListQuestsResponse = z.infer<typeof ListQuestsResponseSchema>;
export type Quests = z.infer<typeof QuestsSchema>;
