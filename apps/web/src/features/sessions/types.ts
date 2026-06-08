import { Status } from "@planner/enums/session";
import z from "zod";
import { BaseEntitySchema } from "@/shared/types";

// ─── Session ──────────────────────────────────────────────────────────────────

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

// ─── Session Series ───────────────────────────────────────────────────────────

export const SessionSeriesSchema = BaseEntitySchema.extend({
	campaignId: z.uuid(),
	description: z.string().optional(),
	rrule: z.string(),
	seriesEndDate: z.coerce.date().optional(),
	seriesStartDate: z.coerce.date(),
	startTime: z.string(),
	timezone: z.string(),
	title: z.string(),
});

export const CreateSessionSeriesRequestSchema = z.object({
	campaignId: z.uuid(),
	description: z.string().optional(),
	rrule: z.string(),
	seriesEndDate: z.date().optional(),
	seriesStartDate: z.date(),
	startTime: z.string(),
	timezone: z.string().min(1),
	title: z.string(),
});
export const CreateSessionSeriesResponseSchema = z.object({
	series: SessionSeriesSchema,
});

export const GetSessionSeriesRequestSchema = z.object({ id: z.uuid() });
export const GetSessionSeriesResponseSchema = z.object({
	series: SessionSeriesSchema,
});

export const ListSessionSeriesByCampaignRequestSchema = z.object({
	campaignId: z.uuid(),
});
export const ListSessionSeriesByCampaignResponseSchema = z.object({
	series: z.array(SessionSeriesSchema),
});

export const UpdateSessionSeriesRequestSchema = z.object({
	description: z.string().optional(),
	id: z.uuid(),
	rrule: z.string().optional(),
	seriesEndDate: z.date().optional(),
	startTime: z.string().optional(),
	timezone: z.string().min(1).optional(),
	title: z.string().optional(),
});
export const UpdateSessionSeriesResponseSchema = z.object({
	series: SessionSeriesSchema,
});

export const RemoveSessionSeriesRequestSchema = z.object({ id: z.uuid() });
export const RemoveSessionSeriesResponseSchema = z.object({});

export const AddSeriesExceptionRequestSchema = z.object({
	excludedDate: z.date(),
	seriesId: z.uuid(),
});
export const AddSeriesExceptionResponseSchema = z.object({});

export const RemoveSeriesExceptionRequestSchema = z.object({
	excludedDate: z.date(),
	seriesId: z.uuid(),
});
export const RemoveSeriesExceptionResponseSchema = z.object({});

export type SessionSeries = z.infer<typeof SessionSeriesSchema>;
