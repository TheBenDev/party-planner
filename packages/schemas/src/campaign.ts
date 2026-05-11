import z from "zod";
import { BaseEntitySchema } from "./common";

// ─── Core Entities ────────────────────────────────────────────────────────────

export const CampaignSchema = BaseEntitySchema.extend({
	deletedAt: z.date().nullable().optional(),
	description: z.string().nullable().optional(),
	tags: z.array(z.string()),
	title: z.string(),
	userId: z.uuid(),
});

export type Campaign = z.infer<typeof CampaignSchema>;

// ─── Campaigns ───────────────────────────────────────────────────────

export const GetActiveCampaignRequestSchema = z.undefined();

export const GetActiveCampaignResponseSchema = z
	.object({ campaign: CampaignSchema })
	.nullable();

export type GetActiveCampaignResponse = z.infer<
	typeof GetActiveCampaignResponseSchema
>;

export const CreateCampaignRequestSchema = z.object({
	description: z.string().optional(),
	tags: z.array(z.string()),
	title: z.string(),
});

export type CreateCampaignRequest = z.infer<typeof CreateCampaignRequestSchema>;

export const CreateCampaignResponseSchema = z.object({
	campaign: CampaignSchema,
});
