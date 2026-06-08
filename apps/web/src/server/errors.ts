import { Code, ConnectError } from "@connectrpc/connect";
import { ORPCError } from "@orpc/client";
import type pino from "pino";
import { ZodError } from "zod";

const SERVER_ERROR_CODES = new Set([
	Code.Internal,
	Code.Unknown,
	Code.DataLoss,
	Code.Unavailable,
	Code.Unimplemented,
]);

const CONNECT_TO_ORPC_CODE = {
	[Code.Canceled]: "CLIENT_CLOSED_REQUEST",
	[Code.Unknown]: "INTERNAL_SERVER_ERROR",
	[Code.InvalidArgument]: "BAD_REQUEST",
	[Code.DeadlineExceeded]: "TIMEOUT",
	[Code.NotFound]: "NOT_FOUND",
	[Code.AlreadyExists]: "CONFLICT",
	[Code.PermissionDenied]: "FORBIDDEN",
	[Code.ResourceExhausted]: "TOO_MANY_REQUESTS",
	[Code.FailedPrecondition]: "PRECONDITION_FAILED",
	[Code.Aborted]: "CONFLICT",
	[Code.OutOfRange]: "BAD_REQUEST",
	[Code.Unimplemented]: "METHOD_NOT_SUPPORTED",
	[Code.Internal]: "INTERNAL_SERVER_ERROR",
	[Code.Unavailable]: "SERVICE_UNAVAILABLE",
	[Code.DataLoss]: "INTERNAL_SERVER_ERROR",
	[Code.Unauthenticated]: "UNAUTHORIZED",
};

export function handleError(
	err: unknown,
	fallbackMessage: string,
	params: Record<string, unknown>,
	log: pino.Logger | undefined,
): never {
	if (err instanceof ORPCError) throw err;
	if (err instanceof ConnectError) {
		if (SERVER_ERROR_CODES.has(err.code)) {
			log?.error({ ...params, connectCode: Code[err.code], err }, err.message);
		} else {
			log?.warn({ ...params, connectCode: Code[err.code], err }, err.message);
		}
		throw new ORPCError(CONNECT_TO_ORPC_CODE[err.code], {
			cause: err,
			message: err.message,
		});
	}
	if (err instanceof ZodError) {
		log?.warn({ ...params, err }, err.message);
		throw new ORPCError("UNPROCESSABLE_CONTENT", {
			cause: err,
			message: err.message,
		});
	}
	log?.error({ ...params, err }, fallbackMessage);
	throw new ORPCError("INTERNAL_SERVER_ERROR", {
		message: fallbackMessage,
	});
}
