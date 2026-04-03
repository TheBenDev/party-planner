import { StatusEnum } from "@planner/enums/common";
import { UserRole } from "@planner/enums/user";
import z from "zod";
import { BaseEntitySchema } from "./common";

//TODO: SPLIT SCHEMAS THAT AREN'T SPECIFIC TO Campaign

export const CampaignInvitationSchema = BaseEntitySchema.extend({
	acceptedAt: z.date().nullable(),
	campaignId: z.uuid(),
	expiresAt: z.date(),
	inviteeEmail: z.email(),
	inviterId: z.uuid(),
	role: z.enum(UserRole),
	status: z.enum(StatusEnum),
});

export const CampaignSchema = BaseEntitySchema.extend({
	deletedAt: z.date().nullable().optional(),
	description: z.string().nullable().optional(),
	tags: z.array(z.string()),
	title: z.string(),
	userId: z.uuid(),
});

export const GetActiveCampaignRequestSchema = z.undefined();
export const GetActiveCampaignResponseSchema = z
	.object({ campaign: CampaignSchema })
	.nullable();

export const GetInvitationRequestSchema = z.object({
	invitationId: z.uuid(),
});
export const GetInvitationResponseSchema = z.object({
	invitation: CampaignInvitationSchema,
});

export const CreateCampaignInvitationRequestSchema = z.object({
	campaignId: z.uuid(),
	expiresAt: z.date(),
	inviteeEmail: z.email(),
	inviterId: z.uuid(),
	role: z.enum(UserRole),
});

export const CreateCampaignInvitationResponseSchema = z.object({
	invitation: CampaignInvitationSchema,
});

export const UpdateCampaignInvitationRequestSchema = z.object({
	id: z.uuid(),
	status: z.enum(StatusEnum),
});
export const UpdateCampaignInvitationResponseSchema = z.object({
	invitation: CampaignInvitationSchema,
});

export const CreateCampaignRequestSchema = z.object({
	description: z.string().optional(),
	tags: z.array(z.string()),
	title: z.string(),
});
export const CreateCamapaignResponseSchema = z.object({
	campaign: CampaignSchema,
});

export type CreateCampaignRequest = z.infer<typeof CreateCampaignRequestSchema>;
export type GetActiveCampaignResponse = z.infer<
	typeof GetActiveCampaignResponseSchema
>;
export type Campaign = z.infer<typeof CampaignSchema>;
