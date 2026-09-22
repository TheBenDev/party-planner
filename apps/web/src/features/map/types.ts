import z from "zod";

export const MapHexSchema = z.object({
	id: z.uuid(),
	campaignId: z.uuid(),
	q: z.number().int(),
	r: z.number().int(),
	terrain: z.string(),
	label: z.string().optional(),
});

export type MapHex = z.infer<typeof MapHexSchema>;

export const GetCampaignMapResponseSchema = z.object({
	hexes: z.array(MapHexSchema),
});

export const UpsertMapHexRequestSchema = z.object({
	q: z.number().int(),
	r: z.number().int(),
	terrain: z.string(),
	label: z.string().optional(),
});

export const UpsertMapHexResponseSchema = z.object({
	hex: MapHexSchema,
});

export const ClearMapHexRequestSchema = z.object({
	q: z.number().int(),
	r: z.number().int(),
});

export const ClearMapHexResponseSchema = z.object({});
