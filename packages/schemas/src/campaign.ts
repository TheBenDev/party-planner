import { UserRole } from "@planner/enums/user";
import z from "zod";
import { BaseEntitySchema } from "./common";

export const CampaignSchema = BaseEntitySchema.extend({
	deletedAt: z.date().nullable().optional(),
	description: z.string().nullable().optional(),
	tags: z.array(z.string()).nullable().optional(),
	title: z.string(),
	userId: z.uuid(),
});

export const GetActiveCampaignRequestSchema = z.undefined();
export const GetActiveCampaignResponseSchema = CampaignSchema.nullable();

export const GetInvitationRequestSchema = z.object({
	invitationId: z.uuid(),
});

export const GetInvitationResponseSchema = z.object({
	campaignId: z.uuid(),
	inviteeEmail: z.email(),
	inviterId: z.uuid(),
	role: z.enum(UserRole),
});

export const CreateCampaignRequestSchema = z.object({
	description: z.string().optional(),
	tags: z.array(z.string()),
	title: z.string(),
});

export const CreateCamapaingResponseSchema = z.object({ id: z.uuid() });

export type CreateCampaignRequest = z.infer<typeof CreateCampaignRequestSchema>;
export type GetActiveCampaignResponse = z.infer<
	typeof GetActiveCampaignResponseSchema
>;
export type Campaign = z.infer<typeof CampaignSchema>;
