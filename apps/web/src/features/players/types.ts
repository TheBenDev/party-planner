import { StatusEnum } from "@planner/enums/common";
import { UserRole } from "@planner/enums/user";
import z from "zod";
import { BaseEntitySchema } from "@/shared/types";

// ─── Core Entities ────────────────────────────────────────────────────────────

export const CampaignUserSchema = z.object({
	campaignId: z.uuid(),
	createdAt: z.date(),
	role: z.enum(UserRole),
	updatedAt: z.date(),
	userId: z.uuid(),
});

export const CampaignUserWithUserSchema = CampaignUserSchema.extend({
	email: z.email(),
	firstName: z.string().nullable(),
	lastName: z.string().nullable(),
});

export const CampaignInvitationSchema = BaseEntitySchema.extend({
	acceptedAt: z.date().nullable(),
	campaignId: z.uuid(),
	expiresAt: z.date(),
	inviteeEmail: z.email(),
	inviterId: z.uuid(),
	role: z.enum(UserRole),
	status: z.enum(StatusEnum),
});

export type CampaignUser = z.infer<typeof CampaignUserSchema>;
export type CampaignUserWithUser = z.infer<typeof CampaignUserWithUserSchema>;
export type CampaignInvitation = z.infer<typeof CampaignInvitationSchema>;

// ─── Invitations ──────────────────────────────────────────────────────────────

export const AcceptCampaignInvitationRequestSchema = z.object({
	token: z.string().trim().min(1),
});

export const AcceptCampaignInvitationResponseSchema = z.object({
	invitation: CampaignInvitationSchema,
	member: CampaignUserSchema,
});

export const CreateCampaignInvitationRequestSchema = z.object({
	inviteeEmail: z.email(),
	role: z.enum(UserRole),
});

export const CreateCampaignInvitationResponseSchema = z.object({
	invitation: CampaignInvitationSchema,
});

export const DeclineCampaignInvitationRequestSchema = z.object({
	token: z.string(),
});

export const DeclineCampaignInvitationResponseSchema = CampaignInvitationSchema;

export const GetCampaignInvitationByTokenRequestSchema = z.object({
	token: z.string(),
});

export const GetCampaignInvitationByTokenResponseSchema = z.object({
	campaignTitle: z.string(),
	invitation: CampaignInvitationSchema,
	sentBy: z.string().optional(),
});

export type GetCampaignInvitationByTokenResponse = z.infer<
	typeof GetCampaignInvitationByTokenResponseSchema
>;

export const ListCampaignInvitationsByCampaignResponseSchema = z.object({
	invitations: z.array(CampaignInvitationSchema),
});

export const RevokeCampaignInvitationRequestSchema = z.object({
	id: z.uuid(),
});

export const RevokeCampaignInvitationResponseSchema = z.object({
	invitation: CampaignInvitationSchema,
});

// ─── Members ──────────────────────────────────────────────────────────────────

export const CreateMemberRequestSchema = z.object({
	campaignId: z.uuid(),
	role: z.enum(UserRole),
	userId: z.uuid(),
});

export const CreateMemberResponseSchema = z.object({
	member: CampaignUserSchema,
});

export const GetMemberRequestSchema = z.object({
	campaignId: z.uuid(),
	userId: z.uuid(),
});

export const GetMemberResponseSchema = z.object({
	member: CampaignUserSchema,
});

export const ListMembersByCampaignResponseSchema = z.object({
	members: z.array(CampaignUserWithUserSchema),
});

export const ListMembersByUserResponseSchema = z.object({
	members: z.array(CampaignUserWithUserSchema),
});

export const RemoveMemberRequestSchema = z.object({
	campaignId: z.uuid(),
	userId: z.uuid(),
});

export const RemoveMemberResponseSchema = z.object({});
