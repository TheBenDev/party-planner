import {
	CharacterStatusEnum,
	RelationToPartyEnum,
} from "@planner/enums/character";
import z from "zod";
import { BaseEntitySchema } from "./common";

export const NonPlayerCharactersSchema = BaseEntitySchema.extend({
	age: z.string().nullable(),
	aliases: z.array(z.string()).nullable(),
	appearance: z.string().nullable(),
	avatar: z.string().nullable(),
	backstory: z.string().nullable(),
	campaignId: z.uuid(),
	currentLocationId: z.uuid().nullable(),
	dmNotes: z.string().nullable(),
	foundryActorId: z.string().nullable(),
	isKnownToParty: z.boolean(),
	knownName: z.string().nullable(),
	lastFoundrySyncAt: z.coerce.date().nullable(),
	name: z.string(),
	originLocationId: z.uuid().nullable(),
	personality: z.string().nullable(),
	playerNotes: z.string().nullable(),
	race: z.string().nullable(),
	relationToPartyStatus: z.enum(RelationToPartyEnum),
	sessionEncounteredId: z.uuid().nullable(),
	status: z.enum(CharacterStatusEnum),
});

export const CreateNpcRequestSchema = z.object({
	age: z.string().optional(),
	aliases: z.array(z.string()).default([]),
	appearance: z.string().optional(),
	avatar: z.string().optional(),
	backstory: z.string().optional(),
	campaignId: z.uuid(),
	currentLocationId: z.uuid().optional(),
	dmNotes: z.string().optional(),
	foundryActorId: z.string().optional(),
	isKnownToParty: z.boolean(),
	knownName: z.string().optional(),
	name: z.string(),
	originLocationId: z.uuid().optional(),
	personality: z.string().optional(),
	playerNotes: z.string().optional(),
	race: z.string().optional(),
	relationToPartyStatus: z.enum(RelationToPartyEnum),
	sessionEncounteredId: z.uuid().optional(),
	status: z.enum(CharacterStatusEnum),
});

export const CreateNpcResponseSchema = z.object({
	npc: NonPlayerCharactersSchema,
});

export const GetNonPlayerCharacterRequestSchema = z.object({
	id: z.uuid(),
});
export const GetNonPlayerCharacterResponseSchema = z.object({
	npc: NonPlayerCharactersSchema,
});

export const ListNonPlayerCharactersRequestSchema = z.object({
	campaignId: z.uuid(),
});

export const ListNonPlayerCharactersResponseSchema = z.object({
	npcs: z.array(NonPlayerCharactersSchema),
});

export type ListCharactersResponse = z.infer<
	typeof ListNonPlayerCharactersResponseSchema
>;

export type NonPlayerCharacters = z.infer<typeof NonPlayerCharactersSchema>;
