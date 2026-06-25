import { timestampDate, timestampFromDate } from "@bufbuild/protobuf/wkt";
import { ORPCError } from "@orpc/server";
import {
	CheckCalendarConflictsRequestSchema,
	CheckCalendarConflictsResponseSchema,
	ConnectGoogleCalendarRequestSchema,
	ConnectGoogleCalendarResponseSchema,
	DisconnectGoogleCalendarRequestSchema,
	DisconnectGoogleCalendarResponseSchema,
	GetGoogleCalendarStatusRequestSchema,
	GetGoogleCalendarStatusResponseSchema,
	SyncSessionToCalendarRequestSchema,
	SyncSessionToCalendarResponseSchema,
} from "@/features/integrations/types";
import { handleError } from "@/server/errors";
import { campaignProcedure, privateProcedure } from "@/server/middleware";

const connectGoogleCalendarDef = privateProcedure
	.route({
		method: "POST",
		path: "/userIntegration/connectGoogleCalendar",
		summary: "Connect Google Calendar",
	})
	.input(ConnectGoogleCalendarRequestSchema)
	.output(ConnectGoogleCalendarResponseSchema);

export const connectGoogleCalendarHandler: Parameters<
	typeof connectGoogleCalendarDef.handler
>[0] = async ({ input, context }) => {
	try {
		await context.api.userIntegration.connectGoogleCalendar({
			code: input.code,
			userId: context.userId,
		});
		return { connected: true };
	} catch (err) {
		handleError(err, "failed to connect Google Calendar", {}, context.logger);
	}
};

const disconnectGoogleCalendarDef = privateProcedure
	.route({
		method: "POST",
		path: "/userIntegration/disconnectGoogleCalendar",
		summary: "Disconnect Google Calendar",
	})
	.input(DisconnectGoogleCalendarRequestSchema)
	.output(DisconnectGoogleCalendarResponseSchema);

export const disconnectGoogleCalendarHandler: Parameters<
	typeof disconnectGoogleCalendarDef.handler
>[0] = async ({ context }) => {
	try {
		await context.api.userIntegration.disconnectGoogleCalendar({
			userId: context.userId,
		});
		return {};
	} catch (err) {
		handleError(
			err,
			"failed to disconnect Google Calendar",
			{},
			context.logger,
		);
	}
};

const getGoogleCalendarStatusDef = privateProcedure
	.route({
		method: "POST",
		path: "/userIntegration/getGoogleCalendarStatus",
		summary: "Get Google Calendar connection status",
	})
	.input(GetGoogleCalendarStatusRequestSchema)
	.output(GetGoogleCalendarStatusResponseSchema);

export const getGoogleCalendarStatusHandler: Parameters<
	typeof getGoogleCalendarStatusDef.handler
>[0] = async ({ context }) => {
	try {
		const res = await context.api.userIntegration.getGoogleCalendarStatus({
			userId: context.userId,
		});
		return { connected: res.connected };
	} catch (err) {
		handleError(
			err,
			"failed to get Google Calendar status",
			{},
			context.logger,
		);
	}
};

const checkCalendarConflictsDef = campaignProcedure
	.route({
		method: "POST",
		path: "/userIntegration/checkCalendarConflicts",
		summary: "Check Google Calendar conflicts for campaign members",
	})
	.input(CheckCalendarConflictsRequestSchema)
	.output(CheckCalendarConflictsResponseSchema);

export const checkCalendarConflictsHandler: Parameters<
	typeof checkCalendarConflictsDef.handler
>[0] = async ({ input, context }) => {
	if (input.campaignId !== context.campaignId) {
		throw new ORPCError("FORBIDDEN", { message: "campaign mismatch" });
	}

	try {
		const res = await context.api.userIntegration.checkCalendarConflicts({
			campaignId: input.campaignId,
			durationMinutes: input.durationMinutes,
			startsAt: timestampFromDate(new Date(input.startsAt)),
		});
		return {
			conflicts: res.conflicts.map((c) => ({
				calendarEventWindows: c.calendarEventWindows.map((w) => ({
					end: w.end ? timestampDate(w.end).toISOString() : "",
					start: w.start ? timestampDate(w.start).toISOString() : "",
				})),
				userId: c.userId,
			})),
		};
	} catch (err) {
		handleError(
			err,
			"failed to check calendar conflicts",
			{ campaignId: input.campaignId },
			context.logger,
		);
	}
};

const syncSessionToCalendarDef = privateProcedure
	.route({
		method: "POST",
		path: "/userIntegration/syncSessionToCalendar",
		summary: "Sync a session to the user's Google Calendar",
	})
	.input(SyncSessionToCalendarRequestSchema)
	.output(SyncSessionToCalendarResponseSchema);

export const syncSessionToCalendarHandler: Parameters<
	typeof syncSessionToCalendarDef.handler
>[0] = async ({ input, context }) => {
	try {
		const res = await context.api.userIntegration.syncSessionToCalendar({
			description: input.description ?? "",
			durationMinutes: input.durationMinutes,
			startsAt: timestampFromDate(new Date(input.startsAt)),
			title: input.title,
			userId: context.userId,
		});
		return { synced: res.synced };
	} catch (err) {
		handleError(
			err,
			"failed to sync session to calendar",
			{},
			context.logger,
		);
	}
};

export const userIntegrationRouter = {
	checkCalendarConflicts: checkCalendarConflictsDef.handler(
		checkCalendarConflictsHandler,
	),
	connectGoogleCalendar: connectGoogleCalendarDef.handler(
		connectGoogleCalendarHandler,
	),
	disconnectGoogleCalendar: disconnectGoogleCalendarDef.handler(
		disconnectGoogleCalendarHandler,
	),
	getGoogleCalendarStatus: getGoogleCalendarStatusDef.handler(
		getGoogleCalendarStatusHandler,
	),
	syncSessionToCalendar: syncSessionToCalendarDef.handler(
		syncSessionToCalendarHandler,
	),
};
