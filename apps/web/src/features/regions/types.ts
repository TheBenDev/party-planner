import { z } from "zod";
import { BaseEntitySchema } from "@/shared/types";

export const RegionSchema = BaseEntitySchema.extend({
	campaignId: z.uuid(),
	deletedAt: z.coerce.date().nullable().optional(),
	mapImageUrl: z.string().nullable().optional(),
	name: z.string(),
});

export const LocationsSchema = BaseEntitySchema.extend({
	deletedAt: z.coerce.date().nullable().optional(),
	description: z.string().nullable().optional(),
	dmNotes: z.string().nullable().optional(),
	mapX: z.number().nullable().optional(),
	mapY: z.number().nullable().optional(),
	name: z.string(),
	notes: z.string().nullable().optional(),
	regionId: z.uuid(),
});

export const RegionWithDetailsSchema = z.object({
	locations: z.array(LocationsSchema),
	region: RegionSchema,
});

export type Region = z.infer<typeof RegionSchema>;
export type RegionWithDetails = z.infer<typeof RegionWithDetailsSchema>;

export const CreateRegionRequestSchema = z.object({
	mapImageUrl: z.string().optional(),
	name: z.string(),
});

export const CreateRegionResponseSchema = z.object({
	region: RegionSchema,
});

export const GetRegionRequestSchema = z.object({
	id: z.uuid(),
});

export const GetRegionResponseSchema = z.object({
	data: RegionWithDetailsSchema,
});

export const ListRegionsByCampaignRequestSchema = z.object({
	campaignId: z.uuid(),
});

export const ListRegionsByCampaignResponseSchema = z.object({
	regions: z.array(RegionWithDetailsSchema),
});

export const UpdateRegionRequestSchema = z.object({
	id: z.uuid(),
	mapImageUrl: z.string().optional(),
	name: z.string().optional(),
});

export const UpdateRegionResponseSchema = z.object({
	region: RegionSchema,
});

export const RemoveRegionRequestSchema = z.object({
	id: z.uuid(),
});

export const RemoveRegionResponseSchema = z.object({});

export type CreateRegionRequest = z.infer<typeof CreateRegionRequestSchema>;
export type UpdateRegionRequest = z.infer<typeof UpdateRegionRequestSchema>;
export type RemoveRegionRequest = z.infer<typeof RemoveRegionRequestSchema>;
export type ListRegionsResponse = z.infer<
	typeof ListRegionsByCampaignResponseSchema
>;

export type Locations = z.infer<typeof LocationsSchema>;

export const CreateLocationRequestSchema = z.object({
	description: z.string().optional(),
	dmNotes: z.string().optional(),
	mapX: z.number().optional(),
	mapY: z.number().optional(),
	name: z.string(),
	notes: z.string().optional(),
	regionId: z.uuid(),
});

export const CreateLocationResponseSchema = z.object({
	location: LocationsSchema,
});

export const UpdateLocationRequestSchema = z.object({
	description: z.string().optional(),
	dmNotes: z.string().optional(),
	id: z.uuid(),
	mapX: z.number().optional(),
	mapY: z.number().optional(),
	name: z.string().optional(),
	notes: z.string().optional(),
});

export const UpdateLocationResponseSchema = z.object({
	location: LocationsSchema,
});

export const GetLocationRequestSchema = z.object({
	id: z.uuid(),
});

export const GetLocationResponseSchema = z.object({
	location: LocationsSchema,
});

export const RemoveLocationRequestSchema = z.object({
	id: z.uuid(),
});

export const RemoveLocationResponseSchema = z.object({});

export type CreateLocationRequest = z.infer<typeof CreateLocationRequestSchema>;
export type UpdateLocationRequest = z.infer<typeof UpdateLocationRequestSchema>;
export type RemoveLocationRequest = z.infer<typeof RemoveLocationRequestSchema>;

export const RegionEditSchema = z.object({
	mapImageUrl: z.string().optional(),
	name: z.string().min(1),
});

export type RegionEditForm = z.infer<typeof RegionEditSchema>;
