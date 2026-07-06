import {
	CharacterStatusEnum,
	HealthConditionEnum,
	RelationToPartyEnum,
} from "@planner/enums/character";
import z from "zod";
import { BaseEntitySchema } from "@/shared/types";

// ─── Core Entities ────────────────────────────────────────────────────────────

export const NonPlayerCharacterSchema = BaseEntitySchema.extend({
	age: z.string().nullable().optional(),
	aliases: z.array(z.string()).nullable().optional(),
	appearance: z.string().nullable().optional(),
	avatar: z.string().nullable().optional(),
	backstory: z.string().nullable().optional(),
	campaignId: z.uuid(),
	characterClass: z.string().nullable().optional(),
	currentLocationId: z.uuid().nullable().optional(),
	dmNotes: z.string().nullable().optional(),
	foundryActorId: z.string().nullable().optional(),
	healthCondition: z.enum(HealthConditionEnum),
	isKnownToParty: z.boolean().optional(),
	knownName: z.string().nullable().optional(),
	labels: z.array(z.string()).nullable().optional(),
	lastFoundrySyncAt: z.coerce.date().nullable().optional(),
	level: z.number().int().nullable().optional(),
	name: z.string(),
	originLocationId: z.uuid().nullable().optional(),
	personality: z.string().nullable().optional(),
	playerNotes: z.string().nullable().optional(),
	race: z.string().nullable().optional(),
	relationToPartyStatus: z.enum(RelationToPartyEnum),
	role: z.string().nullable().optional(),
	sessionEncounteredId: z.uuid().nullable().optional(),
	colonyId: z.uuid().nullable().optional(),
	workforceId: z.uuid().nullable().optional(),
	status: z.enum(CharacterStatusEnum),
});

export type NonPlayerCharacter = z.infer<typeof NonPlayerCharacterSchema>;

// ─── Create NPC ───────────────────────────────────────────────────────────────

export const CreateNpcRequestSchema = z.object({
	age: z.string().optional(),
	aliases: z.array(z.string()).default([]),
	appearance: z.string().optional(),
	avatar: z.string().optional(),
	backstory: z.string().optional(),
	campaignId: z.uuid(),
	characterClass: z.string().optional(),
	currentLocationId: z.uuid().optional(),
	dmNotes: z.string().optional(),
	foundryActorId: z.string().optional(),
	healthCondition: z
		.enum(HealthConditionEnum)
		.default(HealthConditionEnum.HEALTHY),
	isKnownToParty: z.boolean().optional(),
	knownName: z.string().optional(),
	labels: z.array(z.string()).default([]),
	level: z.number().int().optional(),
	name: z.string(),
	originLocationId: z.uuid().optional(),
	personality: z.string().optional(),
	playerNotes: z.string().optional(),
	race: z.string().optional(),
	relationToPartyStatus: z
		.enum(RelationToPartyEnum)
		.default(RelationToPartyEnum.UNKNOWN),
	role: z.string().optional(),
	sessionEncounteredId: z.uuid().optional(),
	colonyId: z.uuid().optional(),
	workforceId: z.uuid().optional(),
	status: z.enum(CharacterStatusEnum).default(CharacterStatusEnum.UNKNOWN),
});

export type CreateNpcRequest = z.infer<typeof CreateNpcRequestSchema>;
export type CreateNpcInput = z.input<typeof CreateNpcRequestSchema>;

export const CreateNpcResponseSchema = z.object({
	npc: NonPlayerCharacterSchema,
});

// ─── Update NPC ───────────────────────────────────────────────────────────────

export const UpdateNpcRequestSchema = z.object({
	age: z.string().nullable().optional(),
	aliases: z.array(z.string()),
	appearance: z.string().nullable().optional(),
	avatar: z.string().nullable().optional(),
	backstory: z.string().nullable().optional(),
	characterClass: z.string().nullable().optional(),
	currentLocationId: z.uuid().nullable().optional(),
	dmNotes: z.string().nullable().optional(),
	foundryActorId: z.string().nullable().optional(),
	healthCondition: z.enum(HealthConditionEnum).optional(),
	id: z.uuid(),
	isKnownToParty: z.boolean().optional(),
	knownName: z.string().nullable().optional(),
	labels: z.array(z.string()),
	level: z.number().int().nullable().optional(),
	name: z.string().optional(),
	originLocationId: z.uuid().nullable().optional(),
	personality: z.string().nullable().optional(),
	playerNotes: z.string().nullable().optional(),
	race: z.string().nullable().optional(),
	relationToPartyStatus: z.enum(RelationToPartyEnum).optional(),
	removedFields: z.string().array(),
	role: z.string().nullable().optional(),
	sessionEncounteredId: z.uuid().nullable().optional(),
	colonyId: z.uuid().nullable().optional(),
	workforceId: z.uuid().nullable().optional(),
	status: z.enum(CharacterStatusEnum).optional(),
});

export const UpdateNpcResponseSchema = z.object({
	npc: NonPlayerCharacterSchema,
});

// ─── Get NPC ──────────────────────────────────────────────────────────────────

export const GetNonPlayerCharacterRequestSchema = z.object({
	id: z.uuid(),
});

export type GetNonPlayerCharacterRequest = z.infer<
	typeof GetNonPlayerCharacterRequestSchema
>;

export const GetNonPlayerCharacterResponseSchema = z.object({
	npc: NonPlayerCharacterSchema,
});

// ─── List NPCs ────────────────────────────────────────────────────────────────

export const ListNonPlayerCharactersByCampaignRequestSchema = z.object({
	campaignId: z.uuid(),
});

export type ListNonPlayerCharactersRequest = z.infer<
	typeof ListNonPlayerCharactersByCampaignRequestSchema
>;

export const ListNonPlayerCharactersByCampaignResponseSchema = z.object({
	npcs: z.array(NonPlayerCharacterSchema),
});

export type ListNonPlayerCharactersResponse = z.infer<
	typeof ListNonPlayerCharactersByCampaignResponseSchema
>;

// ─── Remove NPC ──────────────────────────────────────────────────────────────

export const RemoveNpcRequestSchema = z.object({
	id: z.uuid(),
});

export type RemoveNpcRequest = z.infer<typeof RemoveNpcRequestSchema>;

export const RemoveNpcResponseSchema = z.object({});

export type UpdateNpcRequest = z.infer<typeof UpdateNpcRequestSchema>;
