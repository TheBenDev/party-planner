import { timestampDate } from "@bufbuild/protobuf/wkt";
import { ORPCError } from "@orpc/client";
import { Status } from "@planner/enums/session";
import {
	type Poll,
	PollSchema,
	type Session,
	SessionsSchema,
} from "@planner/schemas/sessions";
import {
	type Poll as PollProto,
	type Session as SessionProto,
	SessionStatus,
} from "@/gen/proto/planner/v1/session_pb";

export function protoToSessionStatus(status: SessionStatus): Status {
	switch (status) {
		case SessionStatus.CONFIRMED:
			return Status.CONFIRMED;
		case SessionStatus.DRAFT:
			return Status.DRAFT;
		case SessionStatus.POLLING:
			return Status.POLLING;
		default:
			throw new Error(`unknown session status: ${status}`);
	}
}

export function sessionStatusToProto(status: Status): SessionStatus {
	switch (status) {
		case Status.CONFIRMED:
			return SessionStatus.CONFIRMED;
		case Status.DRAFT:
			return SessionStatus.DRAFT;
		case Status.POLLING:
			return SessionStatus.POLLING;
		default:
			throw new Error(`unknown proto session status: ${status}`);
	}
}

export function protoToPoll(proto: PollProto): Poll {
	return PollSchema.parse(proto);
}

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
		announcedAt: proto.announcedAt ? timestampDate(proto.announcedAt) : undefined,
		campaignId: proto.campaignId,
		createdAt: timestampDate(proto.createdAt),
		description: proto.description,
		id: proto.id,
		pollId: proto.pollId,
		startsAt: proto.startsAt ? timestampDate(proto.startsAt) : undefined,
		status: protoToSessionStatus(proto.status),
		title: proto.title,
		updatedAt: timestampDate(proto.updatedAt),
	});
}
