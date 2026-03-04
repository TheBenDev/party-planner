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

export const GetNonPlayerCharacterByIdRequestSchema = z.object({
	id: z.uuid(),
});
export const GetNonPlayerCharacterByIdResponseSchema =
	NonPlayerCharactersSchema;

export const ListNonPlayerCharactersByCampaignIdRequestSchema = z.object({
	campaignId: z.uuid(),
});

export const ListNonPlayerCharactersByCampaignIdResponseSchema = z.array(
	NonPlayerCharactersSchema,
);

export type ListCharactersResponse = z.infer<
	typeof ListNonPlayerCharactersByCampaignIdResponseSchema
>;

export type NonPlayerCharacters = z.infer<typeof NonPlayerCharactersSchema>;
