import z from "zod";
import { BaseEntitySchema } from "./common";

export const LocationsSchema = BaseEntitySchema.extend({
	campaignId: z.uuid().nullable().optional(),
	deletedAt: z.date().nullable().optional(),
	description: z.string().nullable().optional(),
	dmNotes: z.string().nullable().optional(),
	name: z.string(),
	notes: z.string().nullable().optional(),
});

export const GetLocationRequestSchema = z.object({ id: z.uuid() });
export const GetLocationResponseSchema = z.object({
	location: LocationsSchema,
});

export const ListLocationsRequestSchema = z.object({
	campaignId: z.uuid(),
});

export const ListLocationsResponseSchema = z.object({
	locations: z.array(LocationsSchema),
});

export type ListLocationsResponse = z.infer<typeof ListLocationsResponseSchema>;
export type Locations = z.infer<typeof LocationsSchema>;
