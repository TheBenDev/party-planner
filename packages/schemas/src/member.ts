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
  token: z.string()
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
  token: z.string()
});
export const DeclineCampaignInvitationResponseSchema = CampaignInvitationSchema;

export const ListCampaignInvitationsResponseSchema = z.object({
	invitations: z.array(CampaignInvitationSchema),
});

export const RevokeCampaignInvitationRequestSchema = z.object({
	id: z.uuid(),
});
export const RevokeCampaignInvitationResponseSchema = z.object({
	invitation: CampaignInvitationSchema,
});

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

export const GetCampaignInvitationByTokenRequestSchema = z.object({
	token: z.string(),
});
export const GetCampaignInvitationByTokenResponseSchema = z.object({
	campaignTitle: z.string(),
	invitation: CampaignInvitationSchema,
	sentBy: z.string().optional(),
});

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
export type GetCampaignInvitationByTokenResponse = z.infer<typeof GetCampaignInvitationByTokenResponseSchema>
