import { timestampDate } from "@bufbuild/protobuf/wkt";
import { ORPCError } from "@orpc/client";
import {
	CharacterStatusEnum,
	HealthConditionEnum,
	RelationToPartyEnum,
} from "@planner/enums/character";
import { NonPlayerCharacterSchema } from "@/features/npcs/types";
import {
	CharacterStatus,
	HealthCondition,
	type Npc,
	RelationToParty,
} from "@/gen/proto/planner/v1/non_player_character_pb";

export function protoToCharacterStatus(status: CharacterStatus) {
	switch (status) {
		case CharacterStatus.ALIVE:
			return "ALIVE";
		case CharacterStatus.DEAD:
			return "DEAD";
		case CharacterStatus.MISSING:
			return "MISSING";
		case CharacterStatus.UNKNOWN:
			return "UNKNOWN";
		default:
			throw new Error(`unknown character status: ${status}`);
	}
}

export function characterStatusToProto(
	status: CharacterStatusEnum,
): CharacterStatus {
	switch (status) {
		case CharacterStatusEnum.ALIVE:
			return CharacterStatus.ALIVE;
		case CharacterStatusEnum.DEAD:
			return CharacterStatus.DEAD;
		case CharacterStatusEnum.MISSING:
			return CharacterStatus.MISSING;
		case CharacterStatusEnum.UNKNOWN:
			return CharacterStatus.UNKNOWN;
		default:
			throw new Error(`unknown character status: ${status}`);
	}
}

export function protoToHealthCondition(
	condition: HealthCondition,
): HealthConditionEnum {
	switch (condition) {
		case HealthCondition.HEALTHY:
			return HealthConditionEnum.HEALTHY;
		case HealthCondition.INJURED:
			return HealthConditionEnum.INJURED;
		case HealthCondition.SICK:
			return HealthConditionEnum.SICK;
		case HealthCondition.UNKNOWN:
			return HealthConditionEnum.UNKNOWN;
		case HealthCondition.DEAD:
			return HealthConditionEnum.DEAD;
		default:
			throw new Error(`unknown health condition: ${condition}`);
	}
}

export function healthConditionToProto(
	condition: HealthConditionEnum,
): HealthCondition {
	switch (condition) {
		case HealthConditionEnum.HEALTHY:
			return HealthCondition.HEALTHY;
		case HealthConditionEnum.INJURED:
			return HealthCondition.INJURED;
		case HealthConditionEnum.SICK:
			return HealthCondition.SICK;
		case HealthConditionEnum.UNKNOWN:
			return HealthCondition.UNKNOWN;
		case HealthConditionEnum.DEAD:
			return HealthCondition.DEAD;
		default:
			throw new Error(`unknown health condition: ${condition}`);
	}
}

export function protoToRelationToParty(
	relation: RelationToParty,
): RelationToPartyEnum {
	switch (relation) {
		case RelationToParty.ALLY:
			return RelationToPartyEnum.ALLY;
		case RelationToParty.ENEMY:
			return RelationToPartyEnum.ENEMY;
		case RelationToParty.NEUTRAL:
			return RelationToPartyEnum.NEUTRAL;
		case RelationToParty.UNKNOWN:
			return RelationToPartyEnum.UNKNOWN;
		case RelationToParty.SUSPICIOUS:
			return RelationToPartyEnum.SUSPICIOUS;
		default:
			throw new Error(`unknown relation to party: ${relation}`);
	}
}

export function relationToPartyToProto(
	relation: RelationToPartyEnum,
): RelationToParty {
	switch (relation) {
		case RelationToPartyEnum.ALLY:
			return RelationToParty.ALLY;
		case RelationToPartyEnum.ENEMY:
			return RelationToParty.ENEMY;
		case RelationToPartyEnum.NEUTRAL:
			return RelationToParty.NEUTRAL;
		case RelationToPartyEnum.UNKNOWN:
			return RelationToParty.UNKNOWN;
		case RelationToPartyEnum.SUSPICIOUS:
			return RelationToParty.SUSPICIOUS;
		default:
			throw new Error(`unknown relation to party: ${relation}`);
	}
}

export function protoToNpc(proto: Npc) {
	if (!proto.createdAt) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Npc is missing createdAt",
		});
	}
	if (!proto.updatedAt) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Npc is missing updatedAt",
		});
	}

	return NonPlayerCharacterSchema.parse({
		age: proto.age ?? null,
		aliases: proto.aliases,
		appearance: proto.appearance ?? null,
		avatar: proto.avatar ?? null,
		backstory: proto.backstory ?? null,
		campaignId: proto.campaignId,
		characterClass: proto.characterClass ?? null,
		createdAt: timestampDate(proto.createdAt),
		currentLocationId: proto.currentLocationId ?? null,
		dmNotes: proto.dmNotes ?? null,
		foundryActorId: proto.foundryActorId ?? null,
		healthCondition: protoToHealthCondition(proto.healthCondition),
		id: proto.id,
		isKnownToParty: proto.isKnownToParty,
		knownName: proto.knownName ?? null,
		labels: proto.labels,
		lastFoundrySyncAt: proto.lastFoundrySyncAt
			? timestampDate(proto.lastFoundrySyncAt)
			: null,
		level: proto.level ?? null,
		name: proto.name,
		originLocationId: proto.originLocationId ?? null,
		personality: proto.personality ?? null,
		playerNotes: proto.playerNotes ?? null,
		race: proto.race ?? null,
		relationToPartyStatus: protoToRelationToParty(proto.relationToPartyStatus),
		role: proto.role ?? null,
		sessionEncounteredId: proto.sessionEncounteredId ?? null,
		colonyId: proto.colonyId ?? null,
		workforceId: proto.workforceId ?? null,
		status: protoToCharacterStatus(proto.status),
		updatedAt: timestampDate(proto.updatedAt),
	});
}
