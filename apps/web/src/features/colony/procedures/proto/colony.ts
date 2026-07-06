import { timestampDate } from "@bufbuild/protobuf/wkt";
import { ORPCError } from "@orpc/client";
import { WorkerTypeEnum } from "@planner/enums/colony";
import {
	type Colony,
	ColonySchema,
	type ColonyWorkforce,
	ColonyWorkforceSchema,
} from "@/features/colony/types";
import type { Colony as ColonyProto } from "@/gen/proto/planner/v1/colony_pb";
import type { ColonyWorkforce as ColonyWorkforceProto } from "@/gen/proto/planner/v1/colony_workforce_pb";
import { WorkerType } from "@/gen/proto/planner/v1/colony_workforce_pb";

export function protoToColony(proto: ColonyProto): Colony {
	if (!proto.createdAt) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Colony is missing createdAt",
		});
	}
	if (!proto.updatedAt) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Colony is missing updatedAt",
		});
	}
	return ColonySchema.parse({
		buildingMaterials: proto.buildingMaterials,
		campaignId: proto.campaignId,
		colonistCount: proto.colonistCount,
		createdAt: timestampDate(proto.createdAt),
		food: proto.food,
		gold: proto.gold,
		id: proto.id,
		morale: proto.morale,
		updatedAt: timestampDate(proto.updatedAt),
	});
}

export function protoToWorkerType(workerType: WorkerType): WorkerTypeEnum {
	switch (workerType) {
		case WorkerType.FARMER:
			return WorkerTypeEnum.FARMER;
		case WorkerType.HEALER:
			return WorkerTypeEnum.HEALER;
		case WorkerType.BLACKSMITH:
			return WorkerTypeEnum.BLACKSMITH;
		case WorkerType.SOLDIER:
			return WorkerTypeEnum.SOLDIER;
		case WorkerType.MINER:
			return WorkerTypeEnum.MINER;
		case WorkerType.BUILDER:
			return WorkerTypeEnum.BUILDER;
		case WorkerType.SCHOLAR:
			return WorkerTypeEnum.SCHOLAR;
		case WorkerType.MAGE:
			return WorkerTypeEnum.MAGE;
		default:
			throw new Error(`unknown worker type: ${workerType}`);
	}
}

export function workerTypeToProto(workerType: WorkerTypeEnum): WorkerType {
	switch (workerType) {
		case WorkerTypeEnum.FARMER:
			return WorkerType.FARMER;
		case WorkerTypeEnum.HEALER:
			return WorkerType.HEALER;
		case WorkerTypeEnum.BLACKSMITH:
			return WorkerType.BLACKSMITH;
		case WorkerTypeEnum.SOLDIER:
			return WorkerType.SOLDIER;
		case WorkerTypeEnum.MINER:
			return WorkerType.MINER;
		case WorkerTypeEnum.BUILDER:
			return WorkerType.BUILDER;
		case WorkerTypeEnum.SCHOLAR:
			return WorkerType.SCHOLAR;
		case WorkerTypeEnum.MAGE:
			return WorkerType.MAGE;
		default:
			throw new Error(`unknown worker type: ${workerType}`);
	}
}

export function protoToColonyWorkforce(
	proto: ColonyWorkforceProto,
): ColonyWorkforce {
	if (!proto.createdAt) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "ColonyWorkforce is missing createdAt",
		});
	}
	if (!proto.updatedAt) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "ColonyWorkforce is missing updatedAt",
		});
	}
	return ColonyWorkforceSchema.parse({
		colonyId: proto.colonyId,
		count: proto.count,
		createdAt: timestampDate(proto.createdAt),
		id: proto.id,
		updatedAt: timestampDate(proto.updatedAt),
		workerType: protoToWorkerType(proto.workerType),
	});
}
