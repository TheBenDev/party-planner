import { timestampDate } from "@bufbuild/protobuf/wkt";
import { ORPCError } from "@orpc/client";
import {
	type SessionSeries,
	SessionSeriesSchema,
} from "@/features/sessions/types";
import type { SessionSeries as SessionSeriesProto } from "@/gen/proto/planner/v1/session_series_pb";

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
