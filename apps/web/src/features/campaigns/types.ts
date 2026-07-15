import { UserRole } from "@planner/enums/user";
import z from "zod";
import { BaseEntitySchema, UserSchema } from "@/shared/types";

// ─── Core Entities ────────────────────────────────────────────────────────────

export const CampaignSchema = BaseEntitySchema.extend({
	deletedAt: z.date().nullable().optional(),
	description: z.string().nullable().optional(),
	tags: z.array(z.string()),
	title: z.string(),
	userId: z.uuid(),
});

export type Campaign = z.infer<typeof CampaignSchema>;

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const GetAuthRequestSchema = z.object({
	userId: z.uuid(),
});

export const GetAuthResponseSchema = z.object({
	campaign: CampaignSchema.nullable(),
	colonyId: z.uuid().nullable(),
	role: z.enum(UserRole).nullable(),
	user: UserSchema,
});

export type GetAuthRequest = z.infer<typeof GetAuthRequestSchema>;
export type GetAuthResponse = z.infer<typeof GetAuthResponseSchema>;

// ─── Campaigns ────────────────────────────────────────────────────────────────

export const GetActiveCampaignRequestSchema = z.undefined();

export const GetActiveCampaignResponseSchema = z
	.object({
		campaign: CampaignSchema,
		colonyId: z.uuid().nullable(),
		role: z.enum(UserRole),
	})
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

export const UpdateCampaignRequestSchema = z.object({
	description: z.string().optional(),
	id: z.uuid(),
	tags: z.array(z.string()).optional(),
	title: z.string().min(1).optional(),
});

export type UpdateCampaignRequest = z.infer<typeof UpdateCampaignRequestSchema>;

export const UpdateCampaignResponseSchema = z.object({
	campaign: CampaignSchema,
});

export type UpdateCampaignResponse = z.infer<
	typeof UpdateCampaignResponseSchema
>;

export const DeleteCampaignRequestSchema = z.object({
	id: z.uuid(),
});

export type DeleteCampaignRequest = z.infer<typeof DeleteCampaignRequestSchema>;

export const DeleteCampaignResponseSchema = z.object({
	campaign: CampaignSchema,
});
