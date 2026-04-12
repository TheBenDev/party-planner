import { UserRole } from "@planner/enums/user";
import z from "zod";
import { CampaignInvitationSchema } from "./campaign";

export const CampaignUserSchema = z.object({
	campaignId: z.uuid(),
	createdAt: z.date(),
	role: z.enum(UserRole),
	updatedAt: z.date(),
	userId: z.uuid(),
});

export const AcceptCampaignInvitationRequestSchema = z.object({
	campaignId: z.uuid(),
	inviteeEmail: z.email(),
});

export const AcceptCampaignInvitationResponseSchema = z.object({
	invitation: CampaignInvitationSchema,
	member: CampaignUserSchema,
});

export const DeclineCampaignInvitationRequestSchema = z.object({
	campaignId: z.uuid(),
	inviteeEmail: z.email(),
});
export const DeclineCampaignInvitationResponseSchema = CampaignInvitationSchema;

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

export const GetMemberResponseSchema = z.object({ member: CampaignUserSchema });

export const ListMembersByCampaignResponseSchema = z.object({
	members: z.array(CampaignUserSchema),
});

export const ListMembersByUserResponseSchema = z.object({
	members: z.array(CampaignUserSchema),
});

export const RemoveMemberRequestSchema = z.object({
	campaignId: z.uuid(),
	userId: z.uuid(),
});

export const RemoveMemberResponseSchema = z.object({});

export type CampaignUser = z.infer<typeof CampaignUserSchema>;
export type CampaignInvitation = z.infer<typeof CampaignInvitationSchema>;
