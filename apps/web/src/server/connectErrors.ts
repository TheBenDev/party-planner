import { Code, ConnectError } from "@connectrpc/connect";
import { ORPCError } from "@orpc/client";

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

export function throwConnectError(
	err: unknown,
	fallbackMessage: string,
): never {
	if (err instanceof ConnectError) {
		throw new ORPCError(CONNECT_TO_ORPC_CODE[err.code], {
			message: err.message || fallbackMessage,
		});
	}
	throw new ORPCError("INTERNAL_SERVER_ERROR", {
		message: fallbackMessage,
	});
}
