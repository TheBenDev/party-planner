import { timestampDate } from "@bufbuild/protobuf/wkt";
import { ORPCError } from "@orpc/client";
import {
	CharacterStatusEnum,
	RelationToPartyEnum,
} from "@planner/enums/character";
import { NonPlayerCharactersSchema } from "@planner/schemas/nonPlayerCharacters";
import {
	CharacterStatus,
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

export function protoToRelationToParty(
	relation: RelationToParty,
): RelationToPartyEnum {
	switch (relation) {
		case RelationToParty.ALLY:
			return RelationToPartyEnum.ALLY;
		case RelationToParty.ENEMY:
			return RelationToPartyEnum.HOSTILE;
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
		case RelationToPartyEnum.HOSTILE:
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

	return NonPlayerCharactersSchema.parse({
		age: proto.age ?? null,
		aliases: proto.aliases,
		appearance: proto.appearance ?? null,
		avatar: proto.avatar ?? null,
		backstory: proto.backstory ?? null,
		campaignId: proto.campaignId,
		createdAt: timestampDate(proto.createdAt),
		currentLocationId: proto.currentLocationId ?? null,
		dmNotes: proto.dmNotes ?? null,
		foundryActorId: proto.foundryActorId ?? null,
		id: proto.id,
		isKnownToParty: proto.isKnownToParty,
		knownName: proto.knownName ?? null,
		lastFoundrySyncAt: proto.lastFoundrySyncAt
			? timestampDate(proto.lastFoundrySyncAt)
			: null,
		name: proto.name,
		originLocationId: proto.originLocationId ?? null,
		personality: proto.personality ?? null,
		playerNotes: proto.playerNotes ?? null,
		race: proto.race ?? null,
		relationToPartyStatus: protoToRelationToParty(proto.relationToPartyStatus),
		sessionEncounteredId: proto.sessionEncounteredId ?? null,
		status: protoToCharacterStatus(proto.status),
		updatedAt: timestampDate(proto.updatedAt),
	});
}
