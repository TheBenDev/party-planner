import { Status } from "@planner/enums/quest";
import z from "zod";
import { BaseEntitySchema } from "./common";

export const QuestSchema = BaseEntitySchema.extend({
	campaignId: z.uuid(),
	completedAt: z.date().nullable().optional(),
	deletedAt: z.date().nullable().optional(),
	description: z.string().nullable().optional(),
	questGiverId: z.uuid().nullable().optional(),
	reward: z.any(),
	status: z.enum(Status),
	title: z.string(),
});

export const CreateQuestRequestSchema = z.object({
	campaignId: z.uuid(),
	description: z.string().optional(),
	questGiverId: z.uuid().optional(),
	// TODO: FLESH THIS OUT BETTER
	reward: z.any().optional(),
	status: z.enum(Status),
	title: z.string(),
});

export const CreateQuestResponseSchema = z.object({ quest: QuestSchema });
export const GetQuestRequestSchema = z.object({ id: z.uuid() });
export const GetQuestResponseSchema = z.object({ quest: QuestSchema });
export const ListQuestsByCampaignRequestSchema = z.object({
	campaignId: z.uuid(),
});
export const ListQuestsByCampaignResponseSchema = z.object({
	quests: z.array(QuestSchema),
});

export type CreateQuestRequest = z.infer<typeof CreateQuestRequestSchema>;
export type Quest = z.infer<typeof QuestSchema>;
