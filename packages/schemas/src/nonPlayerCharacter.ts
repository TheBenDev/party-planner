import z from "zod";
import { BaseEntitySchema } from "./common";

export const NonPlayerCharactersSchema = BaseEntitySchema.extend({
	avatar: z.string().nullable().optional(),
	bio: z.string().nullable().optional(),
	campaignId: z.uuid().nullable(),
	characterSheet: z.any(),
	deletedAt: z.date().nullable().optional(),
	dmNotes: z.string().nullable().optional(),
	firstName: z.string(),
	lastName: z.string().nullable().optional(),
	notes: z.string().nullable().optional(),
	originId: z.uuid().nullable().optional(),
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
