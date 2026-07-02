import {
	CharacterStatusEnum,
	HealthConditionEnum,
	RelationToPartyEnum,
} from "@planner/enums/character";

export const characterStatusBadgeColor: Record<CharacterStatusEnum, string> = {
	[CharacterStatusEnum.ALIVE]:
		"bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
	[CharacterStatusEnum.DEAD]: "bg-red-500/15 text-red-400 border-red-500/30",
	[CharacterStatusEnum.MISSING]:
		"bg-amber-500/15 text-amber-400 border-amber-500/30",
	[CharacterStatusEnum.UNKNOWN]:
		"bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

export const healthConditionBadgeColor: Record<HealthConditionEnum, string> = {
	[HealthConditionEnum.HEALTHY]:
		"bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
	[HealthConditionEnum.INJURED]:
		"bg-orange-500/15 text-orange-400 border-orange-500/30",
	[HealthConditionEnum.SICK]: "bg-red-500/15 text-red-400 border-red-500/30",
	[HealthConditionEnum.DEAD]: "bg-red-500/15 text-red-400 border-red-500/30",
	[HealthConditionEnum.UNKNOWN]:
		"bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

export const relationToPartyBadgeColor: Record<RelationToPartyEnum, string> = {
	[RelationToPartyEnum.ALLY]: "bg-blue-500/15 text-blue-400 border-blue-500/30",
	[RelationToPartyEnum.ENEMY]: "bg-red-500/15 text-red-400 border-red-500/30",
	[RelationToPartyEnum.SUSPICIOUS]:
		"bg-orange-500/15 text-orange-400 border-orange-500/30",
	[RelationToPartyEnum.NEUTRAL]:
		"bg-amber-500/15 text-amber-400 border-amber-500/30",
	[RelationToPartyEnum.UNKNOWN]:
		"bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};
