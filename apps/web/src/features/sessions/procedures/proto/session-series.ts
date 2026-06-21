import { timestampDate } from "@bufbuild/protobuf/wkt";
import { ORPCError } from "@orpc/client";
import {
	type DiscordEventInfo,
	DiscordEventInfoSchema,
	type Poll,
	PollSchema,
	type SessionSeries,
	SessionSeriesSchema,
	type SessionSeriesWithDetails,
	SessionSeriesWithDetailsSchema,
} from "@/features/sessions/types";
import type { Poll as PollProto } from "@/gen/proto/planner/v1/session_pb";
import type {
	DiscordEventInfo as DiscordEventInfoProto,
	SessionSeries as SessionSeriesProto,
	SessionSeriesWithDetails as SessionSeriesWithDetailsProto,
} from "@/gen/proto/planner/v1/session_series_pb";
import { protoToSession } from "./session";

export function protoToDiscordEventInfo(proto: DiscordEventInfoProto): DiscordEventInfo {
	if (!proto.startTime) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "DiscordEventInfo missing startTime",
		});
	}
	return DiscordEventInfoSchema.parse({
		endTime: proto.endTime ? timestampDate(proto.endTime) : undefined,
		eventId: proto.eventId,
		guildId: proto.guildId,
		name: proto.name,
		startTime: timestampDate(proto.startTime),
		status: proto.status,
	});
}

export function protoToPoll(proto: PollProto): Poll {
	return PollSchema.parse(proto);
}

export function protoToSessionSeriesWithDetails(
	proto: SessionSeriesWithDetailsProto,
): SessionSeriesWithDetails {
	if (!proto.series) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "SessionSeriesWithDetails missing series",
		});
	}
	return SessionSeriesWithDetailsSchema.parse({
		exceptions: proto.exceptions.map((ts) => timestampDate(ts)),
		series: protoToSessionSeries(proto.series),
		sessions: proto.sessions.map(protoToSession),
	});
}

export function protoToSessionSeries(proto: SessionSeriesProto): SessionSeries {
	if (!proto.createdAt) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "SessionSeries missing createdAt",
		});
	}
	if (!proto.updatedAt) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "SessionSeries missing updatedAt",
		});
	}
	if (!proto.seriesStartDate) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "SessionSeries missing seriesStartDate",
		});
	}
	return SessionSeriesSchema.parse({
		campaignId: proto.campaignId,
		createdAt: timestampDate(proto.createdAt),
		description: proto.description,
		discordEventId: proto.discordEventId ?? undefined,
		googleCalendarEventId: proto.googleCalendarEventId ?? undefined,
		durationMinutes: proto.durationMinutes,
		id: proto.id,
		rrule: proto.rrule,
		seriesEndDate: proto.seriesEndDate
			? timestampDate(proto.seriesEndDate)
			: undefined,
		seriesStartDate: timestampDate(proto.seriesStartDate),
		startTime: proto.startTime,
		timezone: proto.timezone,
		title: proto.title,
		updatedAt: timestampDate(proto.updatedAt),
	});
}
