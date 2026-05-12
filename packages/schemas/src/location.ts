import z from "zod";
import { BaseEntitySchema } from "./common";

// ─── Core Entities ────────────────────────────────────────────────────────────

export const LocationsSchema = BaseEntitySchema.extend({
	campaignId: z.uuid().nullable().optional(),
	deletedAt: z.coerce.date().nullable().optional(),
	description: z.string().nullable().optional(),
	dmNotes: z.string().nullable().optional(),
	name: z.string(),
	notes: z.string().nullable().optional(),
});

export type Locations = z.infer<typeof LocationsSchema>;

// ─── Create Location ──────────────────────────────────────────────────────────

export const CreateLocationRequestSchema = z.object({
	campaignId: z.uuid(),
	description: z.string().optional(),
	dmNotes: z.string().optional(),
	name: z.string(),
	notes: z.string().optional(),
});

export const CreateLocationResponseSchema = z.object({
	location: LocationsSchema,
});

// ─── Update Location ──────────────────────────────────────────────────────────

export const UpdateLocationRequestSchema = z.object({
	description: z.string().optional(),
	dmNotes: z.string().optional(),
	id: z.uuid(),
	name: z.string().optional(),
	notes: z.string().optional(),
});

export const UpdateLocationResponseSchema = z.object({
	location: LocationsSchema,
});

// ─── Get Location ─────────────────────────────────────────────────────────────

export const GetLocationRequestSchema = z.object({
	id: z.uuid(),
});

export const GetLocationResponseSchema = z.object({
	location: LocationsSchema,
});

// ─── List Locations ───────────────────────────────────────────────────────────

export const ListLocationsRequestSchema = z.object({
	campaignId: z.uuid(),
});

export const ListLocationsResponseSchema = z.object({
	locations: z.array(LocationsSchema),
});

export type ListLocationsResponse = z.infer<typeof ListLocationsResponseSchema>;

// ─── Remove Location ──────────────────────────────────────────────────────────

export const RemoveLocationRequestSchema = z.object({
	id: z.uuid(),
});

export const RemoveLocationResponseSchema = z.object({});
