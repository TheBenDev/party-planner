import { UserRole } from "@planner/enums/user";
import z from "zod";

export const CampaignUserSchema = z.object({
	campaignId: z.uuid(),
	createdAt: z.date(),
	role: z.enum(UserRole),
	updatedAt: z.date(),
	userId: z.uuid(),
});

export const AcceptMemberInvitationRequestSchema = z.object({
	campaignId: z.uuid(),
	inviteeEmail: z.email(),
	inviterId: z.uuid(),
	role: z.enum(UserRole),
});

export const AcceptMemberInvitationResponseSchema = z.void();

export const InviteMemberToCampaignRequest = z.object({
	campaignId: z.uuid(),
	inviteeEmail: z.email(),
	role: z.enum(UserRole),
});
