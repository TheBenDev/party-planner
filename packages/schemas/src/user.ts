import { UserRole } from "@planner/enums/user";
import { z } from "zod";
import { CampaignSchema } from "./campaign";
import { BaseEntitySchema } from "./common";

export const UserSchema = BaseEntitySchema.extend({
	avatar: z.string().nullable(),
	deletedAt: z.date().nullable(),
	email: z.email(),
	externalId: z.string(),
	firstName: z.string().nullable(),
	lastName: z.string().nullable(),
});

export const CreateUserRequestSchema = z.object({
	avatar: z.string().optional(),
	email: z.email(),
	externalId: z.string(),
	firstName: z.string().nullable(),
	lastName: z.string().nullable(),
});
export const CreateUserResponseSchema = z.object({
	user: UserSchema,
});

export const GetUserRequestSchema = z.object({ id: z.uuid() });
export const GetUserResponseSchema = z.object({ user: UserSchema });

export const GetAuthRequestSchema = z.object({
	userId: z.uuid(),
});

export const GetAuthResponseSchema = z.object({
	campaign: CampaignSchema.omit({
		createdAt: true,
		deletedAt: true,
		updatedAt: true,
	})
		.extend({ role: z.enum(UserRole) })
		.nullable(),
	user: UserSchema.omit({ createdAt: true, deletedAt: true, updatedAt: true }),
});

export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;
export type CreateUserResponse = z.infer<typeof CreateUserResponseSchema>;

export type GetAuthRequest = z.infer<typeof GetAuthRequestSchema>;
export type GetAuthResponse = z.infer<typeof GetAuthResponseSchema>;

export type GetUserRequest = z.infer<typeof GetUserRequestSchema>;
export type GetUserResponse = z.infer<typeof GetUserResponseSchema>;
export type User = z.infer<typeof UserSchema>;
