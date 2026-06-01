import z from "zod";
import { BaseEntitySchema } from "./common";

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
