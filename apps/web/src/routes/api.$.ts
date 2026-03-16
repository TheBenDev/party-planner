import { LoggingHandlerPlugin } from "@orpc/experimental-pino";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { CORSPlugin, RequestHeadersPlugin } from "@orpc/server/plugins";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { createFileRoute } from "@tanstack/react-router";
import pino from "pino";
import appRouter from "@/server";

const logger = pino();

const handler = new OpenAPIHandler(appRouter, {
	plugins: [
		new CORSPlugin(),
		new RequestHeadersPlugin(),
		new LoggingHandlerPlugin({
			logger,
			logRequestAbort: true,
			logRequestResponse: true,
		}),
		new OpenAPIReferencePlugin({
			docsPath: "/docs",
			docsProvider: "swagger",
			schemaConverters: [new ZodToJsonSchemaConverter()],
			specGenerateOptions: {
				info: { title: "Party Planner API", version: "1.0.0" },
				servers: [{ url: "/api" }],
			},
			specPath: "/spec.json",
		}),
	],
});

async function handle({ request }: { request: Request }) {
	const { response } = await handler.handle(request, {
		prefix: "/api",
	});
	return response ?? new Response("Not found", { status: 404 });
}

export const Route = createFileRoute("/api/$")({
	server: {
		handlers: {
			DELETE: handle,
			GET: handle,
			HEAD: handle,
			PATCH: handle,
			POST: handle,
			PUT: handle,
		},
	},
});
