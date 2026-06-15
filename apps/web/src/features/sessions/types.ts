import { Status } from "@planner/enums/session";
import z from "zod";
import { BaseEntitySchema } from "@/shared/types";

// ─── Session ──────────────────────────────────────────────────────────────────

export const SessionsSchema = BaseEntitySchema.extend({
	announcedAt: z.date().nullable().optional(),
	campaignId: z.uuid(),
	description: z.string().nullable().optional(),
	discordEventId: z.string().nullable().optional(),
	durationMinutes: z.number().int().min(15).optional(),
	originalStartsAt: z.date().nullable().optional(),
	pollId: z.string().nullable().optional(),
	recap: z.string().nullable().optional(),
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
	durationMinutes: z.number().int().min(15).default(180),
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

export const ListOneOffSessionsByCampaignRequestSchema = z.object({
	campaignId: z.uuid(),
});
export const ListOneOffSessionsByCampaignResponseSchema = z.object({
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
	recap: z.string().optional(),
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
	durationMinutes: z.number().int().min(15).default(180),
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
	durationMinutes: z.number().int().min(15).default(180),
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

export const SessionSeriesWithDetailsSchema = z.object({
	exceptions: z.array(z.date()),
	series: SessionSeriesSchema,
	sessions: z.array(SessionsSchema),
});

export const ListSessionSeriesByCampaignRequestSchema = z.object({
	campaignId: z.uuid(),
});
export const ListSessionSeriesByCampaignResponseSchema = z.object({
	series: z.array(SessionSeriesWithDetailsSchema),
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

export const ExcludeSessionFromSeriesRequestSchema = z.object({
	excludedDate: z.date(),
	seriesId: z.uuid(),
	sessionId: z.uuid(),
});
export const ExcludeSessionFromSeriesResponseSchema = z.object({});

export const RemoveSeriesExceptionRequestSchema = z.object({
	excludedDate: z.date(),
	seriesId: z.uuid(),
});
export const RemoveSeriesExceptionResponseSchema = z.object({});

export type SessionSeries = z.infer<typeof SessionSeriesSchema>;
export type SessionSeriesWithDetails = z.infer<
	typeof SessionSeriesWithDetailsSchema
>;

// ─── session-edit route ─────────────────────────────────────────────────────────────

export const SessionEditSchema = z.object({
	description: z.string().optional(),
	recap: z.string().optional(),
	startsAt: z.date().optional(),
	title: z.string().min(1),
});

export type SessionEditForm = z.infer<typeof SessionEditSchema>;

// --- create session dialog ------------------------------------------------------------

export type CreateOneOffInput = {
	title: string;
	description?: string;
	status: Status;
	startsAt?: Date;
	durationMinutes: number;
};

export type CreateSeriesInput = {
	title: string;
	description?: string;
	durationMinutes: number;
	rrule: string;
	startTime: string;
	timezone: string;
	seriesStartDate: Date;
	seriesEndDate?: Date;
};

export const oneOffSchema = z.object({
	description: z.string().optional(),
	durationMinutes: z
		.number({ error: "Duration must be a number" })
		.int("Duration must be a whole number")
		.min(15, "Duration must be at least 15 minutes"),
	startsAt: z.date().optional(),
	title: z.string().min(1, "Title is required"),
});

export const seriesSchema = z.object({
	description: z.string().optional(),
	durationMinutes: z
		.number({ error: "Duration must be a number" })
		.int("Duration must be a whole number")
		.min(15, "Duration must be at least 15 minutes"),
	rrule: z.string().min(1, "Recurrence pattern is required"),
	seriesEndDate: z.string().optional(),
	seriesStartDate: z.string().min(1, "First session date is required"),
	startTime: z.string().min(1, "Start time is required"),
	title: z.string().min(1, "Title is required"),
});

export type OneOffFormValues = z.infer<typeof oneOffSchema>;
export type SeriesFormValues = z.infer<typeof seriesSchema>;
