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

export const GetQuestByIdResponseSchema = QuestsSchema;
export const GetQuestByIdRequestSchema = z.object({ id: z.uuid() });

export const ListQuestsByCampaignIdRequestSchema = z.object({
	campaignId: z.uuid(),
});
export const ListQuestsByCampaignIdResponseSchema = z.array(QuestsSchema);

export type ListQuestsByCampaignIdResponse = z.infer<
	typeof ListQuestsByCampaignIdResponseSchema
>;
export type Quests = z.infer<typeof QuestsSchema>;
