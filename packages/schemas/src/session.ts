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

export const GetSessionRequestSchema = z.object({ id: z.uuid() });
export const GetSessionResponseSchema = SessionsSchema;

export const ListSessionsRequestSchema = z.object({
	campaignId: z.uuid(),
});

export const ListSessionsResponseSchema = z.array(SessionsSchema);

export type ListSessionsResponse = z.infer<typeof ListSessionsResponseSchema>;
export type Sessions = z.infer<typeof SessionsSchema>;
