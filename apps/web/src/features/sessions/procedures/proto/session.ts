import { timestampDate } from "@bufbuild/protobuf/wkt";
import { ORPCError } from "@orpc/client";
import {
	type Session,
	SessionsSchema,
} from "@/features/sessions/types";
import type { Session as SessionProto } from "@/gen/proto/planner/v1/session_pb";

export function protoToSession(proto: SessionProto): Session {
	if (!proto.createdAt) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Session is missing createdAt",
		});
	}
	if (!proto.updatedAt) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Session is missing updatedAt",
		});
	}
	if (!proto.startsAt) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Session is missing startsAt",
		});
	}

	return SessionsSchema.parse({
		campaignId: proto.campaignId,
		createdAt: timestampDate(proto.createdAt),
		description: proto.description,
		durationMinutes: proto.durationMinutes > 0 ? proto.durationMinutes : undefined,
		id: proto.id,
		recap: proto.recap,
		seriesId: proto.seriesId,
		startsAt: timestampDate(proto.startsAt),
		title: proto.title,
		updatedAt: timestampDate(proto.updatedAt),
	});
}
