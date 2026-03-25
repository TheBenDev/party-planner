import { ORPCError } from "@orpc/server";
import { schema } from "@planner/database";
import {
	CreateUserRequestSchema,
	CreateUserResponseSchema,
	GetUserResponseSchema,
} from "@planner/schemas/user";
import { eq } from "drizzle-orm";
import { privateProcedure, publicProcedure } from "../orpc";

const { usersTable } = schema;

const createUser = publicProcedure
	.route({
		method: "POST",
		path: "/user",
		summary: "Creates a user",
	})
	.input(CreateUserRequestSchema)
	.output(CreateUserResponseSchema)
	.handler(async ({ input, context }) => {
		const { email, externalId, firstName, lastName, avatar } = input;
		const db = context.db;

		const userRow = await db
			.select()
			.from(usersTable)
			.where(eq(usersTable.email, email))
			.limit(1);

		if (userRow.length > 0) {
			throw new ORPCError("CONFLICT", { message: "User already exists" });
		}

		const values = {
			avatar,
			email: email.toLowerCase(),
			externalId,
			firstName,
			lastName,
		};

		await db.insert(usersTable).values(values);
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
		const db = context.db;

		if (!userId) {
			throw new ORPCError("BAD_REQUEST", { message: "missing clerk id" });
		}

		const userRow = await db
			.select()
			.from(usersTable)
			.where(eq(usersTable.externalId, userId))
			.limit(1);

		if (userRow.length <= 0) {
			throw new ORPCError("NOT_FOUND", { message: "user not found" });
		}

		return {
			avatar: userRow[0].avatar,
			email: userRow[0].email,
			externalId: userRow[0].externalId,
			firstName: userRow[0].firstName,
			id: userRow[0].id,
			lastName: userRow[0].lastName,
		};
	});

export const userRouter = {
	createUser,
	getUser,
};
