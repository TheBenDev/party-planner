import { WorkerTypeEnum } from "@planner/enums/colony";
import z from "zod";
import { BaseEntitySchema } from "@/shared/types";

export const ColonySchema = BaseEntitySchema.extend({
	buildingMaterials: z.number().int(),
	campaignId: z.uuid(),
	colonistCount: z.number().int(),
	food: z.number().int(),
	gold: z.number().int(),
	morale: z.number().int(),
});

export const ColonyWorkforceSchema = BaseEntitySchema.extend({
	colonyId: z.uuid(),
	count: z.number().int(),
	workerType: z.enum(WorkerTypeEnum),
});

export const CreateColonyRequestSchema = z.object({
	buildingMaterials: z.number().int().optional(),
	colonistCount: z.number().int().optional(),
	food: z.number().int().optional(),
	gold: z.number().int().optional(),
	morale: z.number().int().optional(),
});

export const CreateColonyResponseSchema = z.object({ colony: ColonySchema });

export const GetColonyByCampaignResponseSchema = z.object({
	colony: ColonySchema,
});

export const UpdateColonyRequestSchema = z.object({
	buildingMaterials: z.number().int().optional(),
	colonistCount: z.number().int().optional(),
	food: z.number().int().optional(),
	gold: z.number().int().optional(),
	id: z.uuid(),
	morale: z.number().int().optional(),
});

export const UpdateColonyResponseSchema = z.object({ colony: ColonySchema });

export const RemoveColonyRequestSchema = z.object({ id: z.uuid() });

export const RemoveColonyResponseSchema = z.object({});

export const ListColonyWorkforceRequestSchema = z.object({ colonyId: z.uuid() });

export const ListColonyWorkforceResponseSchema = z.object({
	workforce: z.array(ColonyWorkforceSchema),
});

export const UpsertColonyWorkforceRequestSchema = z.object({
	colonyId: z.uuid(),
	count: z.number().int(),
	workerType: z.enum(WorkerTypeEnum),
});

export const UpsertColonyWorkforceResponseSchema = z.object({
	workforce: ColonyWorkforceSchema,
});

export type Colony = z.infer<typeof ColonySchema>;
export type ColonyWorkforce = z.infer<typeof ColonyWorkforceSchema>;
export type CreateColonyRequest = z.infer<typeof CreateColonyRequestSchema>;
export type UpdateColonyRequest = z.infer<typeof UpdateColonyRequestSchema>;
export type RemoveColonyRequest = z.infer<typeof RemoveColonyRequestSchema>;
export type UpsertColonyWorkforceRequest = z.infer<
	typeof UpsertColonyWorkforceRequestSchema
>;
