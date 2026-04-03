import { timestampDate } from "@bufbuild/protobuf/wkt";
import { ORPCError } from "@orpc/client";
import { type Session, SessionsSchema } from "@planner/schemas/sessions";
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

	return SessionsSchema.parse({
		campaignId: proto.campaignId,
		createdAt: timestampDate(proto.createdAt),
		description: proto.description,
		id: proto.id,
		startsAt: proto.startsAt ? timestampDate(proto.startsAt) : undefined,
		title: proto.title,
		updatedAt: timestampDate(proto.updatedAt),
	});
}
