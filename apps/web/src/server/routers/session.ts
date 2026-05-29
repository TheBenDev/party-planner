import { timestampFromDate } from "@bufbuild/protobuf/wkt";
import { ORPCError } from "@orpc/server";
import {
	AnnounceSessionRequestSchema,
	AnnounceSessionResponseSchema,
	CreateSessionRequestSchema,
	CreateSessionResponseSchema,
	GetPollRequestSchema,
	GetPollResponseSchema,
	GetSessionRequestSchema,
	GetSessionResponseSchema,
	ListSessionsByCampaignRequestSchema,
	ListSessionsByCampaignResponseSchema,
	PollSessionRequestSchema,
	PollSessionResponseSchema,
	RemoveSessionRequestSchema,
	RemoveSessionResponseSchema,
	UpdateSessionRequestSchema,
	UpdateSessionResponseSchema,
} from "@planner/schemas/sessions";
import { handleError } from "../errors";
import { privateProcedure, requireDungeonMaster } from "../orpc";
import {
	protoToPoll,
	protoToSession,
	sessionStatusToProto,
} from "./util/proto/session";

const announceSession = privateProcedure
	.route({
		method: "POST",
		path: "/session/announce",
		summary: "Announces that a D&D session was set to a discord channel",
	})
	.input(AnnounceSessionRequestSchema)
	.output(AnnounceSessionResponseSchema)
	.handler(async ({ input, context }) => {
		requireDungeonMaster(context.role);
		const api = context.api;
		const { campaignId, sessionId } = input;

		try {
			await api.session.announceSession({
				campaignId,
				sessionId,
			});

			return {};
		} catch (err) {
			handleError(
				err,
				"failed to announce session",
				{ campaignId: input.campaignId },
				context.logger,
			);
		}
	});

const createSession = privateProcedure
	.route({
		method: "POST",
		path: "/session/create",
		summary: "Create a session",
	})
	.input(CreateSessionRequestSchema)
	.output(CreateSessionResponseSchema)
	.handler(async ({ input, context }) => {
		requireDungeonMaster(context.role);
		const api = context.api;
		const startsAt = input.startsAt
			? timestampFromDate(input.startsAt)
			: undefined;
		try {
			const res = await api.session.createSession({
				campaignId: input.campaignId,
				description: input.description,
				startsAt,
				status: sessionStatusToProto(input.status),
				title: input.title,
			});
			if (res.session === undefined) {
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "failed to create session",
				});
			}
			return { session: protoToSession(res.session) };
		} catch (err) {
			handleError(
				err,
				"failed to create session",
				{ campaignId: input.campaignId },
				context.logger,
			);
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
			handleError(
				err,
				"failed to get session",
				{ sessionId: id },
				context.logger,
			);
		}
	});

const listSessions = privateProcedure
	.route({
		method: "POST",
		path: "/session/list",
		summary: "List sessions by campaign",
	})
	.input(ListSessionsByCampaignRequestSchema)
	.output(ListSessionsByCampaignResponseSchema)
	.handler(async ({ input, context }) => {
		const { campaignId } = input;
		const api = context.api;
		try {
			const res = await api.session.listSessionsByCampaign({ campaignId });
			return { sessions: res.sessions.map(protoToSession) };
		} catch (err) {
			handleError(
				err,
				"failed to list sessions",
				{ campaignId },
				context.logger,
			);
		}
	});

const getPoll = privateProcedure
	.route({
		method: "POST",
		path: "/session/get-poll",
		summary: "Get the current discord poll results for a session",
	})
	.input(GetPollRequestSchema)
	.output(GetPollResponseSchema)
	.handler(async ({ input, context }) => {
		const api = context.api;
		const { campaignId, sessionId } = input;
		try {
			const pollProto = await api.session.getSessionPoll({
				campaignId,
				sessionId,
			});

			if (pollProto.poll === undefined) {
				return { poll: null };
			}

			return { poll: protoToPoll(pollProto.poll) };
		} catch (err) {
			handleError(err, "failed to poll session", { sessionId }, context.logger);
		}
	});
const pollSession = privateProcedure
	.route({
		method: "POST",
		path: "/session/poll",
		summary: "Start a discord poll for available session starting dates",
	})
	.input(PollSessionRequestSchema)
	.output(PollSessionResponseSchema)
	.handler(async ({ input, context }) => {
		requireDungeonMaster(context.role);
		const api = context.api;
		const { campaignId, sessionId } = input;
		try {
			const options = input.options.map((o) => timestampFromDate(o));
			await api.session.pollSession({ campaignId, options, sessionId });
			return {};
		} catch (err) {
			handleError(err, "failed to poll session", { sessionId }, context.logger);
		}
	});

const removeSession = privateProcedure
	.route({
		method: "POST",
		path: "/session/remove",
		summary: "Remove a session",
	})
	.input(RemoveSessionRequestSchema)
	.output(RemoveSessionResponseSchema)
	.handler(async ({ input, context }) => {
		requireDungeonMaster(context.role);
		const api = context.api;
		try {
			await api.session.removeSession({ id: input.id });
			return {};
		} catch (err) {
			handleError(
				err,
				"failed to remove session",
				{ session: input.id },
				context.logger,
			);
		}
	});

const updateSession = privateProcedure
	.route({
		method: "POST",
		path: "/session/update",
		summary: "Update a session",
	})
	.input(UpdateSessionRequestSchema)
	.output(UpdateSessionResponseSchema)
	.handler(async ({ input, context }) => {
		requireDungeonMaster(context.role);
		const api = context.api;
		const startsAt = input.startsAt
			? timestampFromDate(input.startsAt)
			: undefined;
		try {
			const res = await api.session.updateSession({
				...input,
				startsAt,
				status: sessionStatusToProto(input.status),
			});
			if (res.session === undefined) {
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "failed to update session",
				});
			}
			return { session: protoToSession(res.session) };
		} catch (err) {
			handleError(
				err,
				"failed to update session",
				{ sessiongId: input.id },
				context.logger,
			);
		}
	});

export const sessionRouter = {
	announceSession,
	createSession,
	getPoll,
	getSession,
	listSessions,
	pollSession,
	removeSession,
	updateSession,
};
