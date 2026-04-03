import z from "zod";
import { BaseEntitySchema } from "./common";

export const SessionsSchema = BaseEntitySchema.extend({
	campaignId: z.uuid(),
	description: z.string().nullable().optional(),
	startsAt: z.date().nullable().optional(),
	title: z.string(),
});

export const CreateSessionRequestSchema = z.object({
	campaignId: z.uuid(),
	description: z.string().optional(),
	startsAt: z.date().optional(),
	title: z.string(),
});

export const CreateSessionResponseSchema = z.object({
	session: SessionsSchema,
});
export const GetSessionRequestSchema = z.object({ id: z.uuid() });
export const GetSessionResponseSchema = z.object({
	session: SessionsSchema,
});
export const ListSessionsRequestSchema = z.object({
	campaignId: z.uuid(),
});
export const ListSessionsResponseSchema = z.object({
	sessions: z.array(SessionsSchema),
});

export type Session = z.infer<typeof SessionsSchema>;
export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>;
