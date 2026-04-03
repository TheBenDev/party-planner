import { timestampDate } from "@bufbuild/protobuf/wkt";
import { ORPCError } from "@orpc/client";
import { Status } from "@planner/enums/quest";
import { type Quest, QuestSchema } from "@planner/schemas/quests";
import type { Quest as QuestProto } from "@/gen/proto/planner/v1/quest_pb";
import { QuestStatus } from "@/gen/proto/planner/v1/quest_pb";

export function protoToQuestStatus(status: QuestStatus): Status {
	switch (status) {
		case QuestStatus.ACTIVE:
			return Status.ACTIVE;
		case QuestStatus.COMPLETED:
			return Status.COMPLETED;
		case QuestStatus.FAILED:
			return Status.FAILED;
		default:
			throw new Error(`unknown quest status: ${status}`);
	}
}

export function questStatusToProto(status: Status): QuestStatus {
	switch (status) {
		case Status.ACTIVE:
			return QuestStatus.ACTIVE;
		case Status.COMPLETED:
			return QuestStatus.COMPLETED;
		case Status.FAILED:
			return QuestStatus.FAILED;
		default:
			throw new Error(`unknown quest status: ${status}`);
	}
}

export function protoToQuest(proto: QuestProto): Quest {
	if (!proto.createdAt) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Quest is missing createdAt",
		});
	}
	if (!proto.updatedAt) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Quest is missing updatedAt",
		});
	}

	return QuestSchema.parse({
		campaignId: proto.campaignId,
		completedAt: proto.completedAt
			? timestampDate(proto.completedAt)
			: undefined,
		createdAt: timestampDate(proto.createdAt),
		deletedAt: proto.deletedAt ? timestampDate(proto.deletedAt) : undefined,
		description: proto.description,
		id: proto.id,
		questGiverId: proto.questGiverId,
		reward: proto.reward,
		status: protoToQuestStatus(proto.status),
		title: proto.title,
		updatedAt: timestampDate(proto.updatedAt),
	});
}
