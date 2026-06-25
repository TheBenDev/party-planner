import { timestampFromDate } from "@bufbuild/protobuf/wkt";
import { ORPCError } from "@orpc/server";
import {
	CreateSessionRequestSchema,
	CreateSessionResponseSchema,
	GetSessionRequestSchema,
	GetSessionResponseSchema,
	RemoveSessionRequestSchema,
	RemoveSessionResponseSchema,
	UpdateSessionRequestSchema,
	UpdateSessionResponseSchema,
} from "@/features/sessions/types";
import { handleError } from "@/server/errors";
import { campaignProcedure, dmProcedure } from "@/server/middleware";
import { protoToSession } from "./proto/session";

const createSessionDef = dmProcedure
	.route({
		method: "POST",
		path: "/session/create",
		summary: "Create a session",
	})
	.input(CreateSessionRequestSchema)
	.output(CreateSessionResponseSchema);

export const createSessionHandler: Parameters<
	typeof createSessionDef.handler
>[0] = async ({ input, context }) => {
	const api = context.api;
	const startsAt = input.startsAt ? timestampFromDate(input.startsAt) : undefined;
	if (input.campaignId !== context.campaignId) {
		throw new ORPCError("FORBIDDEN", { message: "campaign mismatch" });
	}
	try {
		const res = await api.session.createSession({
			campaignId: input.campaignId,
			description: input.description,
			durationMinutes: input.durationMinutes,
			seriesId: input.seriesId ?? undefined,
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
		handleError(
			err,
			"failed to create session",
			{ campaignId: input.campaignId },
			context.logger,
		);
	}
};

const getSessionDef = campaignProcedure
	.route({
		method: "POST",
		path: "/session/get",
		summary: "Get a session by id",
	})
	.input(GetSessionRequestSchema)
	.output(GetSessionResponseSchema);

export const getSessionHandler: Parameters<
	typeof getSessionDef.handler
>[0] = async ({ input, context }) => {
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
};

const removeSessionDef = dmProcedure
	.route({
		method: "POST",
		path: "/session/remove",
		summary: "Remove a session",
	})
	.input(RemoveSessionRequestSchema)
	.output(RemoveSessionResponseSchema);

export const removeSessionHandler: Parameters<
	typeof removeSessionDef.handler
>[0] = async ({ input, context }) => {
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
};

const updateSessionDef = dmProcedure
	.route({
		method: "POST",
		path: "/session/update",
		summary: "Update a session",
	})
	.input(UpdateSessionRequestSchema)
	.output(UpdateSessionResponseSchema);

export const updateSessionHandler: Parameters<
	typeof updateSessionDef.handler
>[0] = async ({ input, context }) => {
	const api = context.api;
	try {
		const res = await api.session.updateSession({
			campaignId: context.campaignId,
			description: input.description,
			id: input.id,
			recap: input.recap,
			title: input.title,
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
};

export const sessionRouter = {
	createSession: createSessionDef.handler(createSessionHandler),
	getSession: getSessionDef.handler(getSessionHandler),
	removeSession: removeSessionDef.handler(removeSessionHandler),
	updateSession: updateSessionDef.handler(updateSessionHandler),
};
