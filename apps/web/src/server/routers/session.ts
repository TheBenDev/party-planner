import { timestampFromDate } from "@bufbuild/protobuf/wkt";
import { ORPCError } from "@orpc/server";
import {
	CreateSessionRequestSchema,
	CreateSessionResponseSchema,
	GetSessionRequestSchema,
	GetSessionResponseSchema,
	ListSessionsRequestSchema,
	ListSessionsResponseSchema,
} from "@planner/schemas/sessions";
import { handleError } from "../errors";
import { privateProcedure } from "../orpc";
import { protoToSession } from "./util/proto/session";

const createSession = privateProcedure
	.route({
		method: "POST",
		path: "/session/create",
		summary: "Create a session",
	})
	.input(CreateSessionRequestSchema)
	.output(CreateSessionResponseSchema)
	.handler(async ({ input, context }) => {
		const api = context.api;
		const startsAt = input.startsAt
			? timestampFromDate(input.startsAt)
			: undefined;
		try {
			const res = await api.session.createSession({
				campaignId: input.campaignId,
				description: input.description,
				startsAt,
				title: input.title,
			});
			if (res.session === undefined) {
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "failed to create session",
				});
			}
			return { session: protoToSession(res.session) };
		} catch (err) {
			handleError(err, "failed to create session");
		}
	});

const getSession = privateProcedure
	.route({
		method: "POST",
		path: "/session/get",
		summary: "Get a session by id",
	})
	.input(GetSessionRequestSchema)
	.output(GetSessionResponseSchema)
	.handler(async ({ input, context }) => {
		const { id } = input;
		const api = context.api;
		try {
			const res = await api.session.getSession({ id });
			if (res.session === undefined) {
				throw new ORPCError("NOT_FOUND", { message: "session not found" });
			}
			return { session: protoToSession(res.session) };
		} catch (err) {
			handleError(err, "failed to get session");
		}
	});

const listSessions = privateProcedure
	.route({
		method: "POST",
		path: "/session/list",
		summary: "List sessions by campaign",
	})
	.input(ListSessionsRequestSchema)
	.output(ListSessionsResponseSchema)
	.handler(async ({ input, context }) => {
		const { campaignId } = input;
		const api = context.api;
		try {
			const res = await api.session.listSessionsByCampaign({ campaignId });
			return { sessions: res.sessions.map(protoToSession) };
		} catch (err) {
			handleError(err, "failed to list sessions");
		}
	});

export const sessionRouter = {
	createSession,
	getSession,
	listSessions,
};
