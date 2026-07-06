import { timestampDate } from "@bufbuild/protobuf/wkt";
import { ORPCError } from "@orpc/client";
import { QuestStatusEnum, QuestTypeEnum } from "@planner/enums/quest";
import { type Quest, QuestSchema } from "@/features/quests/types";
import type { Quest as QuestProto } from "@/gen/proto/planner/v1/quest_pb";
import { QuestStatus, QuestType } from "@/gen/proto/planner/v1/quest_pb";

export function protoToQuestStatus(status: QuestStatus): QuestStatusEnum {
	switch (status) {
		case QuestStatus.ACTIVE:
			return QuestStatusEnum.ACTIVE;
		case QuestStatus.COMPLETED:
			return QuestStatusEnum.COMPLETED;
		case QuestStatus.FAILED:
			return QuestStatusEnum.FAILED;
		default:
			throw new Error(`unknown quest status: ${status}`);
	}
}

export function questStatusToProto(status: QuestStatusEnum): QuestStatus {
	switch (status) {
		case QuestStatusEnum.ACTIVE:
			return QuestStatus.ACTIVE;
		case QuestStatusEnum.COMPLETED:
			return QuestStatus.COMPLETED;
		case QuestStatusEnum.FAILED:
			return QuestStatus.FAILED;
		default:
			throw new Error(`unknown quest status: ${status}`);
	}
}

export function protoToQuestType(type: QuestType): QuestTypeEnum {
	switch (type) {
		case QuestType.MAINLAND:
			return QuestTypeEnum.MAINLAND;
		case QuestType.COLONY:
			return QuestTypeEnum.COLONY;
		default:
			throw new Error(`unknown quest type: ${type}`);
	}
}

export function questTypeToProto(type: QuestTypeEnum): QuestType {
	switch (type) {
		case QuestTypeEnum.MAINLAND:
			return QuestType.MAINLAND;
		case QuestTypeEnum.COLONY:
			return QuestType.COLONY;
		default:
			throw new Error(`unknown quest type: ${type}`);
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
		type: proto.type ? protoToQuestType(proto.type) : undefined,
		updatedAt: timestampDate(proto.updatedAt),
	});
}
