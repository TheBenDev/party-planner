import { schema } from "@planner/database";
import {
	CreateUserRequestSchema,
	GetUserResponseSchema,
} from "@planner/schemas/user";
import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { j, privateProcedure, publicProcedure } from "../jsandy";

const { usersTable } = schema;
export const userRouter = j.router({
	createUser: publicProcedure
		.input(CreateUserRequestSchema)
		.mutation(async ({ c, input }) => {
			const { email, externalId, firstName, lastName, avatar } = input;
			const db = c.get("db");

			const userRow = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.email, email))
				.limit(1);

			if (userRow.length > 0) {
				throw new HTTPException(409, { message: "User already exists" });
			}

			const values = {
				avatar,
				email: email.toLowerCase(),
				externalId,
				firstName,
				lastName,
			};
			await db.insert(usersTable).values(values);
		}),
	getUser: privateProcedure.query(async ({ c }) => {
		const userId = c.get("clerkUserId");
		const db = c.get("db");
		if (!userId) {
			throw new HTTPException(400, { message: "missing clerk id" });
		}
		const userRow = await db
			.select()
			.from(usersTable)
			.where(eq(usersTable.externalId, userId))
			.limit(1);
		if (userRow.length <= 0) {
			throw new HTTPException(404, { message: "user not found" });
		}

		const user = GetUserResponseSchema.parse({
			avatar: userRow[0].avatar,
			email: userRow[0].email,
			externalId: userRow[0].externalId,
			firstName: userRow[0].firstName,
			id: userRow[0].id,
			lastName: userRow[0].lastName,
		});

		return c.superjson({ user });
	}),
});
