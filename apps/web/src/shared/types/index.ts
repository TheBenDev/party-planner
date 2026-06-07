import { z } from "zod";

export const BaseEntitySchema = z.object({
	createdAt: z.coerce.date(),
	id: z.uuid(),
	updatedAt: z.coerce.date(),
});

export const UserSchema = BaseEntitySchema.extend({
	avatar: z.string().nullable(),
	deletedAt: z.date().nullable(),
	email: z.email(),
	externalId: z.string(),
	firstName: z.string().nullable(),
	lastName: z.string().nullable(),
});

export const GetUserRequestSchema = z.object({ id: z.uuid() });
export const GetUserResponseSchema = z.object({ user: UserSchema });

export const GetAuthRequestSchema = z.object({
	userId: z.uuid(),
});

export type GetUserRequest = z.infer<typeof GetUserRequestSchema>;
export type GetUserResponse = z.infer<typeof GetUserResponseSchema>;
export type User = z.infer<typeof UserSchema>;
