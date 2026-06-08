import { Status } from "@planner/enums/quest";
import z from "zod";
import { BaseEntitySchema } from "@/shared/types";

export const QuestSchema = BaseEntitySchema.extend({
	campaignId: z.uuid(),
	completedAt: z.date().nullable().optional(),
	deletedAt: z.date().nullable().optional(),
	description: z.string().nullable().optional(),
	questGiverId: z.uuid().nullable().optional(),
	// TODO MAKE REWARD SCHEMA
	reward: z.unknown(),
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

export const UpdateQuestRequestSchema = z.object({
	description: z.string().optional(),
	id: z.uuid(),
	status: z.enum(Status).optional(),
	title: z.string().optional(),
});

export const UpdateQuestResponseSchema = z.object({ quest: QuestSchema });

export const RemoveQuestRequestSchema = z.object({ id: z.uuid() });

export const RemoveQuestResponseSchema = z.object({});

export type UpdateQuestRequest = z.infer<typeof UpdateQuestRequestSchema>;
export type RemoveQuestRequest = z.infer<typeof RemoveQuestRequestSchema>;
export type CreateQuestRequest = z.infer<typeof CreateQuestRequestSchema>;
export type Quest = z.infer<typeof QuestSchema>;
