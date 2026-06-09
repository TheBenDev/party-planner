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
	ListOneOffSessionsByCampaignRequestSchema,
	ListOneOffSessionsByCampaignResponseSchema,
	PollSessionRequestSchema,
	PollSessionResponseSchema,
	RemoveSessionRequestSchema,
	RemoveSessionResponseSchema,
	UpdateSessionRequestSchema,
	UpdateSessionResponseSchema,
} from "@/features/sessions/types";
import { handleError } from "@/server/errors";
import { campaignProcedure, dmProcedure } from "@/server/middleware";
import {
	protoToPoll,
	protoToSession,
	sessionStatusToProto,
} from "./proto/session";

const announceSession = dmProcedure
	.route({
		method: "POST",
		path: "/session/announce",
		summary: "Announces that a D&D session was set to a discord channel",
	})
	.input(AnnounceSessionRequestSchema)
	.output(AnnounceSessionResponseSchema)
	.handler(async ({ input, context }) => {
		const api = context.api;
		const { campaignId, sessionId } = input;
		if (campaignId !== context.campaignId) {
			throw new ORPCError("FORBIDDEN", { message: "campaign mismatch" });
		}
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

const createSession = dmProcedure
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
		const originalStartsAt = input.originalStartsAt
			? timestampFromDate(input.originalStartsAt)
			: undefined;
		if (input.campaignId !== context.campaignId) {
			throw new ORPCError("FORBIDDEN", { message: "campaign mismatch" });
		}
		try {
			const res = await api.session.createSession({
				campaignId: input.campaignId,
				description: input.description,
				originalStartsAt,
				seriesId: input.seriesId ?? undefined,
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

const getSession = campaignProcedure
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
			const res = await api.session.getSession({
				campaignId: context.campaignId,
				id,
			});
			if (res.session === undefined) {
				throw new ORPCError("NOT_FOUND", { message: "session not found" });
			}
			const session = protoToSession(res.session);
			return { session };
		} catch (err) {
			handleError(
				err,
				"failed to get session",
				{ sessionId: id },
				context.logger,
			);
		}
	});

const listOneOffSessions = campaignProcedure
	.route({
		method: "POST",
		path: "/session/list",
		summary: "List one-off sessions by campaign",
	})
	.input(ListOneOffSessionsByCampaignRequestSchema)
	.output(ListOneOffSessionsByCampaignResponseSchema)
	.handler(async ({ input, context }) => {
		const { campaignId } = input;
		if (campaignId !== context.campaignId) {
			throw new ORPCError("FORBIDDEN", { message: "campaign mismatch" });
		}
		const api = context.api;
		try {
			const res = await api.session.listOneOffSessionsByCampaign({ campaignId });
			return { sessions: res.sessions.map(protoToSession) };
		} catch (err) {
			handleError(
				err,
				"failed to list one-off sessions",
				{ campaignId },
				context.logger,
			);
		}
	});

const getPoll = campaignProcedure
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
		if (campaignId !== context.campaignId) {
			throw new ORPCError("FORBIDDEN", { message: "campaign mismatch" });
		}
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
const pollSession = dmProcedure
	.route({
		method: "POST",
		path: "/session/poll",
		summary: "Start a discord poll for available session starting dates",
	})
	.input(PollSessionRequestSchema)
	.output(PollSessionResponseSchema)
	.handler(async ({ input, context }) => {
		const api = context.api;
		const { campaignId, sessionId } = input;
		if (campaignId !== context.campaignId) {
			throw new ORPCError("FORBIDDEN", { message: "campaign mismatch" });
		}
		try {
			const options = input.options.map((o) => timestampFromDate(o));
			await api.session.pollSession({ campaignId, options, sessionId });
			return {};
		} catch (err) {
			handleError(err, "failed to poll session", { sessionId }, context.logger);
		}
	});

const removeSession = dmProcedure
	.route({
		method: "POST",
		path: "/session/remove",
		summary: "Remove a session",
	})
	.input(RemoveSessionRequestSchema)
	.output(RemoveSessionResponseSchema)
	.handler(async ({ input, context }) => {
		const api = context.api;
		try {
			await api.session.removeSession({
				campaignId: context.campaignId,
				id: input.id,
			});
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

const updateSession = dmProcedure
	.route({
		method: "POST",
		path: "/session/update",
		summary: "Update a session",
	})
	.input(UpdateSessionRequestSchema)
	.output(UpdateSessionResponseSchema)
	.handler(async ({ input, context }) => {
		const api = context.api;
		const startsAt = input.startsAt
			? timestampFromDate(input.startsAt)
			: undefined;
		try {
			const res = await api.session.updateSession({
				...input,
				campaignId: context.campaignId,
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
				{ sessionId: input.id },
				context.logger,
			);
		}
	});

export const sessionRouter = {
	announceSession,
	createSession,
	getPoll,
	getSession,
	listOneOffSessions,
	pollSession,
	removeSession,
	updateSession,
};
