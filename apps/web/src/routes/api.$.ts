import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { CORSPlugin, RequestHeadersPlugin } from "@orpc/server/plugins";
import { createFileRoute } from "@tanstack/react-router";
import appRouter from "@/server";

const handler = new RPCHandler(appRouter, {
	interceptors: [
		onError((error) => {
			// biome-ignore lint/suspicious/noConsole: This is ok for now
			console.error(error);
		}),
	],
	plugins: [new CORSPlugin(), new RequestHeadersPlugin()],
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
