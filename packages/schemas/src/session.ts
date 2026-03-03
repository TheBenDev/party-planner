import z from "zod";
import { BaseEntitySchema } from "./common";

export const SessionsSchema = BaseEntitySchema.extend({
	campaignId: z.uuid(),
	deletedAt: z.date().nullable().optional(),
	description: z.string().nullable().optional(),
	dmNotes: z.string().nullable().optional(),
	notes: z.string().nullable().optional(),
	startsAt: z.date().nullable().optional(),
	title: z.string(),
});

export const GetSessionByIdRequestSchema = z.object({ id: z.uuid() });
export const GetSessionByIdResponseSchema = SessionsSchema;

export const ListSessionsByCampaignIdRequestSchema = z.object({
	campaignId: z.uuid(),
});

export const ListSessionsByCampaignIdResponseSchema = z.array(SessionsSchema);

export type ListSessionsByCampaignIdResponse = z.infer<
	typeof ListSessionsByCampaignIdResponseSchema
>;
export type Sessions = z.infer<typeof SessionsSchema>;
