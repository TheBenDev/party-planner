import { ORPCError } from "@orpc/server";
import { deleteCookie } from "@orpc/server/helpers";
import { GetUserResponseSchema } from "@planner/schemas/user";
import z from "zod";
import { handleError } from "../errors";
import {
	ACTIVE_CAMPAIGN_ID_COOKIE_NAME,
	AUTH_COOKIE_NAME,
	privateProcedure,
} from "../orpc";
import { protoToUser } from "./util/proto/user";

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

const signOut = privateProcedure
	.route({
		method: "POST",
		path: "/user/signout",
		summary: "Handles custom logic when logging out with clerk",
	})
	.output(z.object({ success: z.boolean() }))
	.handler(({ context }) => {
		const resHeaders = context.resHeaders;
		deleteCookie(resHeaders, AUTH_COOKIE_NAME);
		deleteCookie(resHeaders, ACTIVE_CAMPAIGN_ID_COOKIE_NAME);
		return { success: true };
	});

export const userRouter = {
	getUser,
	signOut,
};
