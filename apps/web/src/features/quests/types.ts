import { QuestStatusEnum, QuestTypeEnum } from "@planner/enums/quest";
import { QuestRewardSchema } from "@planner/schemas/quests";
import z from "zod";
import { BaseEntitySchema } from "@/shared/types";

export const QuestSchema = BaseEntitySchema.extend({
	campaignId: z.uuid(),
	completedAt: z.date().nullable().optional(),
	deletedAt: z.date().nullable().optional(),
	description: z.string().nullable().optional(),
	questGiverId: z.uuid().nullable().optional(),
	reward: QuestRewardSchema.nullable().optional(),
	status: z.enum(QuestStatusEnum),
	title: z.string(),
	type: z.enum(QuestTypeEnum).optional(),
});

export const CreateQuestRequestSchema = z.object({
	campaignId: z.uuid(),
	description: z.string().optional(),
	questGiverId: z.uuid().optional(),
	reward: QuestRewardSchema.optional(),
	status: z.enum(QuestStatusEnum),
	title: z.string(),
	type: z.enum(QuestTypeEnum).optional(),
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
	reward: QuestRewardSchema.optional(),
	status: z.enum(QuestStatusEnum).optional(),
	title: z.string().optional(),
	type: z.enum(QuestTypeEnum).optional(),
});

export const UpdateQuestResponseSchema = z.object({ quest: QuestSchema });

export const RemoveQuestRequestSchema = z.object({ id: z.uuid() });
export const RemoveQuestResponseSchema = z.object({});

export const CompleteQuestRequestSchema = z.object({ id: z.uuid() });
export const CompleteQuestResponseSchema = z.object({ quest: QuestSchema });

export type UpdateQuestRequest = z.infer<typeof UpdateQuestRequestSchema>;
export type RemoveQuestRequest = z.infer<typeof RemoveQuestRequestSchema>;
export type CreateQuestRequest = z.infer<typeof CreateQuestRequestSchema>;
export type CompleteQuestRequest = z.infer<typeof CompleteQuestRequestSchema>;
export type Quest = z.infer<typeof QuestSchema>;
