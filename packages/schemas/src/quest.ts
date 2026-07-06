import { QuestStatusEnum, QuestTypeEnum } from "@planner/enums/quest";
import z from "zod";
import { BaseEntitySchema } from "./common";

export const QuestRewardColonySchema = z.object({
	buildingMaterials: z.number().int().min(0).optional(),
	colonistCount: z.number().int().min(0).optional(),
	food: z.number().int().min(0).optional(),
	gold: z.number().int().min(0).optional(),
	morale: z.number().int().min(0).max(100).optional(),
});

export const QuestRewardLootItemSchema = z.object({
	description: z.string().optional(),
	name: z.string(),
	quantity: z.number().int().min(1).optional(),
});

export const QuestRewardSchema = z.object({
	colony: QuestRewardColonySchema.optional(),
	loot: z.array(QuestRewardLootItemSchema).optional(),
});

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

export type QuestRewardColony = z.infer<typeof QuestRewardColonySchema>;
export type QuestRewardLootItem = z.infer<typeof QuestRewardLootItemSchema>;
export type QuestReward = z.infer<typeof QuestRewardSchema>;
export type Quest = z.infer<typeof QuestSchema>;
export type CreateQuestRequest = z.infer<typeof CreateQuestRequestSchema>;
export type UpdateQuestRequest = z.infer<typeof UpdateQuestRequestSchema>;
export type RemoveQuestRequest = z.infer<typeof RemoveQuestRequestSchema>;
