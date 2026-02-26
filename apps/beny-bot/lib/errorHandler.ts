import axios, { type AxiosError } from "axios";
// biome-ignore  lint/correctness/noUndeclaredDependencies: it exists and works
import type { ContentfulStatusCode } from "hono/utils/http-status";
import z, { type ZodError } from "zod";
import logger from "../lib/logger";

type ErrorHandler = {
	error: unknown;
	operation: string;
};
type ErrorDetails = {
	status: ContentfulStatusCode;
	message: string;
	cause?: unknown | undefined;
};

export const extractErrorDetails = ({
	error,
	operation,
}: ErrorHandler): ErrorDetails => {
	if (axios.isAxiosError(error)) {
		return axiosErrorHandler({ error, operation });
	}
	if (error instanceof z.ZodError) {
		return zodErrorHandler({ error, operation });
	}
	logger.error({ operation }, "Failed to recognize error");
	return { message: "unknown error", status: 500 };
};

const isContentfulStatusCode = (
	status: number | undefined,
): status is ContentfulStatusCode => {
	if (status === undefined) return false;
	return status >= 100 && status < 600;
};

const axiosErrorHandler = ({
	error,
	operation,
}: {
	error: AxiosError;
	operation: string;
}): ErrorDetails => {
	const message =
		(error.response?.data as { message?: string })?.message ||
		error.response?.data ||
		error.message ||
		"An error occurred";
	const code = error.code;
	const status: ContentfulStatusCode = isContentfulStatusCode(error.status)
		? error.status
		: 500;

	logger.error({ code, message, status }, `Axios error in ${operation}`);
	return { cause: error.cause, message: error.message, status };
};

function zodErrorHandler({
	error,
	operation,
}: {
	error: ZodError;
	operation: string;
}): ErrorDetails {
	const prettyError = z.prettifyError(error);
	logger.error(
		{ code: "Zod Error", message: prettyError, status: 400 },
		`Zod error in ${operation}`,
	);
	return {
		cause: "Zod Error",
		message: prettyError,
		status: 400,
	};
}
