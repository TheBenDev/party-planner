import { ORPCError } from "@orpc/server";
import {
	CreateUserRequestSchema,
	CreateUserResponseSchema,
	GetUserResponseSchema,
} from "@planner/schemas/user";
import { handleError } from "../errors";
import { privateProcedure, publicProcedure } from "../orpc";
import { protoToUser } from "./util/proto/user";

const createUser = publicProcedure
	.route({
		method: "POST",
		path: "/user/create",
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

		try {
			const { user } = await api.user.createUser(values);
			if (!user) {
				throw new ORPCError("NOT_FOUND", { message: "user not found" });
			}
			return { user: protoToUser(user) };
		} catch (err) {
			handleError(err, "failed to create user");
		}
	});

const getUser = privateProcedure
	.route({
		method: "POST",
		path: "/user/get",
		summary: "Get the current user",
	})
	.output(GetUserResponseSchema)
	.handler(async ({ context }) => {
		const userId = context.clerkUserId;
		const api = context.api;
		try {
			const { user } = await api.user.getUser({ externalId: userId });
			if (!user) {
				throw new ORPCError("NOT_FOUND", { message: "user not found" });
			}
			return { user: protoToUser(user) };
		} catch (err) {
			handleError(err, "failed to get user");
		}
	});

export const userRouter = {
	createUser,
	getUser,
};
