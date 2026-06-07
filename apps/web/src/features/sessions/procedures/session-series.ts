import { timestampFromDate } from "@bufbuild/protobuf/wkt";
import { ORPCError } from "@orpc/server";
import {
	AddSeriesExceptionRequestSchema,
	AddSeriesExceptionResponseSchema,
	CreateSessionSeriesRequestSchema,
	CreateSessionSeriesResponseSchema,
	GetSessionSeriesRequestSchema,
	GetSessionSeriesResponseSchema,
	ListSessionSeriesByCampaignRequestSchema,
	ListSessionSeriesByCampaignResponseSchema,
	RemoveSeriesExceptionRequestSchema,
	RemoveSeriesExceptionResponseSchema,
	RemoveSessionSeriesRequestSchema,
	RemoveSessionSeriesResponseSchema,
	UpdateSessionSeriesRequestSchema,
	UpdateSessionSeriesResponseSchema,
} from "@/features/sessions/types";
import { handleError } from "@/server/errors";
import { campaignProcedure, dmProcedure } from "@/server/middleware";
import { protoToSessionSeries } from "./proto/session-series";

const createSessionSeries = dmProcedure
	.route({
		method: "POST",
		path: "/session-series/create",
		summary: "Create a recurring session series",
	})
	.input(CreateSessionSeriesRequestSchema)
	.output(CreateSessionSeriesResponseSchema)
	.handler(async ({ input, context }) => {
		const api = context.api;
		if (input.campaignId !== context.campaignId) {
			throw new ORPCError("FORBIDDEN", { message: "campaign mismatch" });
		}
		const now = new Date();
		const startOfToday = new Date(
			Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
		);
		if (input.seriesStartDate < startOfToday) {
			throw new ORPCError("BAD_REQUEST", {
				message: "series start date cannot be before today",
			});
		}
		if (input.seriesEndDate) {
			if (input.seriesEndDate < startOfToday) {
				throw new ORPCError("BAD_REQUEST", {
					message: "series end date cannot be in the past",
				});
			}
			if (input.seriesEndDate < input.seriesStartDate) {
				throw new ORPCError("BAD_REQUEST", {
					message: "series end date cannot be before series start date",
				});
			}
		}
		try {
			const res = await api.sessionSeries.createSessionSeries({
				campaignId: input.campaignId,
				description: input.description,
				rrule: input.rrule,
				seriesEndDate: input.seriesEndDate
					? timestampFromDate(input.seriesEndDate)
					: undefined,
				seriesStartDate: timestampFromDate(input.seriesStartDate),
				startTime: input.startTime,
				timezone: input.timezone,
				title: input.title,
			});
			if (!res.series) {
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "failed to create session series",
				});
			}
			return { series: protoToSessionSeries(res.series) };
		} catch (err) {
			handleError(
				err,
				"failed to create session series",
				{ campaignId: input.campaignId },
				context.logger,
			);
		}
	});

const getSessionSeries = campaignProcedure
	.route({
		method: "POST",
		path: "/session-series/get",
		summary: "Get a session series by id",
	})
	.input(GetSessionSeriesRequestSchema)
	.output(GetSessionSeriesResponseSchema)
	.handler(async ({ input, context }) => {
		const api = context.api;
		try {
			const res = await api.sessionSeries.getSessionSeries({
				campaignId: context.campaignId,
				id: input.id,
			});
			if (!res.series) {
				throw new ORPCError("NOT_FOUND", {
					message: "session series not found",
				});
			}
			const series = protoToSessionSeries(res.series);
			return { series };
		} catch (err) {
			handleError(
				err,
				"failed to get session series",
				{ id: input.id },
				context.logger,
			);
		}
	});

const listSessionSeriesByCampaign = campaignProcedure
	.route({
		method: "POST",
		path: "/session-series/list",
		summary: "List session series for a campaign",
	})
	.input(ListSessionSeriesByCampaignRequestSchema)
	.output(ListSessionSeriesByCampaignResponseSchema)
	.handler(async ({ input, context }) => {
		const api = context.api;
		if (input.campaignId !== context.campaignId) {
			throw new ORPCError("FORBIDDEN", { message: "campaign mismatch" });
		}
		try {
			const res = await api.sessionSeries.listSessionSeriesByCampaign({
				campaignId: input.campaignId,
			});
			return { series: res.series.map(protoToSessionSeries) };
		} catch (err) {
			handleError(
				err,
				"failed to list session series",
				{ campaignId: input.campaignId },
				context.logger,
			);
		}
	});

const updateSessionSeries = dmProcedure
	.route({
		method: "POST",
		path: "/session-series/update",
		summary: "Update a session series",
	})
	.input(UpdateSessionSeriesRequestSchema)
	.output(UpdateSessionSeriesResponseSchema)
	.handler(async ({ input, context }) => {
		const api = context.api;
		if (input.seriesEndDate) {
			const now = new Date();
			const startOfToday = new Date(
				Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
			);
			if (input.seriesEndDate < startOfToday) {
				throw new ORPCError("BAD_REQUEST", {
					message: "series end date cannot be in the past",
				});
			}
		}
		try {
			const res = await api.sessionSeries.updateSessionSeries({
				campaignId: context.campaignId,
				description: input.description,
				id: input.id,
				rrule: input.rrule,
				seriesEndDate: input.seriesEndDate
					? timestampFromDate(input.seriesEndDate)
					: undefined,
				startTime: input.startTime,
				timezone: input.timezone,
				title: input.title,
			});
			if (!res.series) {
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "failed to update session series",
				});
			}
			return { series: protoToSessionSeries(res.series) };
		} catch (err) {
			handleError(
				err,
				"failed to update session series",
				{ id: input.id },
				context.logger,
			);
		}
	});

const removeSessionSeries = dmProcedure
	.route({
		method: "POST",
		path: "/session-series/remove",
		summary: "Remove a session series",
	})
	.input(RemoveSessionSeriesRequestSchema)
	.output(RemoveSessionSeriesResponseSchema)
	.handler(async ({ input, context }) => {
		const api = context.api;
		try {
			await api.sessionSeries.removeSessionSeries({
				campaignId: context.campaignId,
				id: input.id,
			});
			return {};
		} catch (err) {
			handleError(
				err,
				"failed to remove session series",
				{ id: input.id },
				context.logger,
			);
		}
	});

const addSeriesException = dmProcedure
	.route({
		method: "POST",
		path: "/session-series/add-exception",
		summary: "Cancel one occurrence in a series",
	})
	.input(AddSeriesExceptionRequestSchema)
	.output(AddSeriesExceptionResponseSchema)
	.handler(async ({ input, context }) => {
		const api = context.api;
		try {
			await api.sessionSeries.addSeriesException({
				campaignId: context.campaignId,
				excludedDate: timestampFromDate(input.excludedDate),
				seriesId: input.seriesId,
			});
			return {};
		} catch (err) {
			handleError(
				err,
				"failed to add series exception",
				{ seriesId: input.seriesId },
				context.logger,
			);
		}
	});

const removeSeriesException = dmProcedure
	.route({
		method: "POST",
		path: "/session-series/remove-exception",
		summary: "Restore a cancelled series occurrence",
	})
	.input(RemoveSeriesExceptionRequestSchema)
	.output(RemoveSeriesExceptionResponseSchema)
	.handler(async ({ input, context }) => {
		const api = context.api;
		try {
			await api.sessionSeries.removeSeriesException({
				campaignId: context.campaignId,
				excludedDate: timestampFromDate(input.excludedDate),
				seriesId: input.seriesId,
			});
			return {};
		} catch (err) {
			handleError(
				err,
				"failed to remove series exception",
				{ seriesId: input.seriesId },
				context.logger,
			);
		}
	});

export const sessionSeriesRouter = {
	addSeriesException,
	createSessionSeries,
	getSessionSeries,
	listSessionSeriesByCampaign,
	removeSeriesException,
	removeSessionSeries,
	updateSessionSeries,
};
