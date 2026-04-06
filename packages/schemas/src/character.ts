import { ListByEnum } from "@planner/enums/character";
import z from "zod";
import { BaseEntitySchema } from "./common";

export const CharactersSchema = BaseEntitySchema.extend({
	avatar: z.string().nullable().optional(),
	campaignId: z.uuid().nullable().optional(),
	// TODO: set up character sheet
	characterSheet: z.any(),
	deletedAt: z.date().nullable().optional(),
	firstName: z.string(),
	lastName: z.string(),
	originId: z.uuid().nullable().optional(),
	userId: z.uuid(),
});

export const GetCharacterRequestSchema = z.object({ id: z.uuid() });
export const GetCharacterResponseSchema = z.object({
	character: CharactersSchema,
});

export const ListCharactersRequestSchema = z.object({
	by: z.enum(ListByEnum),
	id: z.uuid(),
});

export const ListCharactersResponseSchema = z.object({
	characters: z.array(CharactersSchema),
});

export type ListCharactersResponse = z.infer<
	typeof ListCharactersResponseSchema
>;
export type Characters = z.infer<typeof CharactersSchema>;
