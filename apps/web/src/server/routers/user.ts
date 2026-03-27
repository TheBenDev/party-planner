import { ORPCError } from "@orpc/server";
import {
	CreateUserRequestSchema,
	CreateUserResponseSchema,
	GetUserResponseSchema,
} from "@planner/schemas/user";
import { privateProcedure, publicProcedure } from "../orpc";

const createUser = publicProcedure
	.route({
		method: "POST",
		path: "/user/createUser",
		summary: "Creates a user",
	})
	.input(CreateUserRequestSchema)
	.output(CreateUserResponseSchema)
	.handler(async ({ input, context }) => {
		const { email, externalId, firstName, lastName, avatar } = input;
		const api = context.api;

		const values = {
			avatar: avatar ?? undefined,
			email: email.toLowerCase(),
			externalId,
			firstName: firstName ?? undefined,
			lastName: lastName ?? undefined,
		};
		await api.user.createUser(values);
	});

const getUser = privateProcedure
	.route({
		method: "POST",
		path: "/user/getUser",
		summary: "Get the current user",
	})
	.output(GetUserResponseSchema)
	.handler(async ({ context }) => {
		const userId = context.clerkUserId;
		const api = context.api;

		const userRow = await api.user.getUser({ externalId: userId });
		if (!userRow.user) {
			throw new ORPCError("NOT_FOUND", { message: "user not found" });
		}
		const user = {
			avatar: userRow.user.avatar ?? null,
			email: userRow.user.email,
			externalId: userRow.user.externalId,
			firstName: userRow.user.firstName ?? null,
			id: userRow.user.id,
			lastName: userRow.user.lastName ?? null,
		};
		return user;
	});

export const userRouter = {
	createUser,
	getUser,
};
