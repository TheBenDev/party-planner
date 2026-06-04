import { Status } from "@planner/enums/session";
import z from "zod";
import { BaseEntitySchema } from "./common";

export const SessionsSchema = BaseEntitySchema.extend({
	announcedAt: z.date().nullable().optional(),
	campaignId: z.uuid(),
	description: z.string().nullable().optional(),
	discordEventId: z.string().nullable().optional(),
	originalStartsAt: z.date().nullable().optional(),
	pollId: z.string().nullable().optional(),
	seriesId: z.uuid().nullable().optional(),
	startsAt: z.date().nullable().optional(),
	status: z.enum(Status),
	title: z.string(),
});

export const PollAnswersSchema = z.array(
	z.object({
		text: z.string(),
		voteCount: z.int().min(0),
	}),
);

export const PollSchema = z.object({
	answers: PollAnswersSchema,
	isFinalized: z.boolean(),
	question: z.string(),
});

export const AnnounceSessionRequestSchema = z.object({
	campaignId: z.uuid(),
	sessionId: z.uuid(),
});
export const AnnounceSessionResponseSchema = z.object({});

export const CreateSessionRequestSchema = z.object({
	campaignId: z.uuid(),
	description: z.string().optional(),
	originalStartsAt: z.date().optional(),
	seriesId: z.uuid().optional(),
	startsAt: z.date().optional(),
	status: z.enum(Status),
	title: z.string(),
});

export const CreateSessionResponseSchema = z.object({
	session: SessionsSchema,
});
export const GetSessionRequestSchema = z.object({ id: z.uuid() });
export const GetSessionResponseSchema = z.object({
	session: SessionsSchema,
});

export const GetPollRequestSchema = z.object({
	campaignId: z.uuid(),
	sessionId: z.uuid(),
});

export const GetPollResponseSchema = z.object({ poll: PollSchema.nullable() });

export const ListSessionsByCampaignRequestSchema = z.object({
	campaignId: z.uuid(),
});
export const ListSessionsByCampaignResponseSchema = z.object({
	sessions: z.array(SessionsSchema),
});

export const PollSessionRequestSchema = z.object({
	campaignId: z.uuid(),
	options: z.array(z.date()),
	sessionId: z.uuid(),
});
export const PollSessionResponseSchema = z.object({});

export const RemoveSessionRequestSchema = z.object({ id: z.uuid() });
export const RemoveSessionResponseSchema = z.object({});

export const UpdateSessionRequestSchema = z.object({
	description: z.string().optional(),
	id: z.uuid(),
	startsAt: z.date().optional(),
	status: z.enum(Status),
	title: z.string().optional(),
});
export const UpdateSessionResponseSchema = z.object({
	session: SessionsSchema,
});

export type Session = z.infer<typeof SessionsSchema>;
export type Poll = z.infer<typeof PollSchema>;
export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>;
