import { WorkerTypeEnum } from "@planner/enums/colony";
import z from "zod";
import { BaseEntitySchema } from "@/shared/types";

export const ColonySchema = BaseEntitySchema.extend({
	buildingMaterials: z.number().int().min(0),
	campaignId: z.uuid(),
	colonistCount: z.number().int().min(0),
	food: z.number().int().min(0),
	gold: z.number().int().min(0),
	morale: z.number().int().min(0).max(100),
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
	buildingMaterials: z.number().int().min(0).optional(),
	colonistCount: z.number().int().min(0).optional(),
	food: z.number().int().min(0).optional(),
	gold: z.number().int().min(0).optional(),
	id: z.uuid(),
	morale: z.number().int().min(0).max(100).optional(),
});

export const UpdateColonyResponseSchema = z.object({ colony: ColonySchema });

export const RemoveColonyRequestSchema = z.object({ id: z.uuid() });

export const RemoveColonyResponseSchema = z.object({});

export const ListColonyWorkforceRequestSchema = z.object({
	colonyId: z.uuid(),
});

export const ListColonyWorkforceResponseSchema = z.object({
	workforces: z.array(ColonyWorkforceSchema),
});

export const UpsertColonyWorkforcesRequestSchema = z.object({
	colonyId: z.uuid(),
	workforces: z
		.object({
			count: z.number().int().min(0),
			type: z.enum(WorkerTypeEnum),
		})
		.array(),
});

export const UpsertColonyWorkforcesResponseSchema = z.object({
	workforces: ColonyWorkforceSchema.array(),
});

export type Colony = z.infer<typeof ColonySchema>;
export type ColonyWorkforce = z.infer<typeof ColonyWorkforceSchema>;
export type CreateColonyRequest = z.infer<typeof CreateColonyRequestSchema>;
export type UpdateColonyRequest = z.infer<typeof UpdateColonyRequestSchema>;
export type RemoveColonyRequest = z.infer<typeof RemoveColonyRequestSchema>;
export type UpsertColonyWorkforcesRequest = z.infer<
	typeof UpsertColonyWorkforcesRequestSchema
>;
