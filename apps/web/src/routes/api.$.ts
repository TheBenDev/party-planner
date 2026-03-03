import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { CORSPlugin } from "@orpc/server/plugins";
import { createFileRoute } from "@tanstack/react-router";
import appRouter from "@/server";

const handler = new RPCHandler(appRouter, {
	interceptors: [
		onError((error) => {
			console.error(error);
		}),
	],
	plugins: [new CORSPlugin()],
});

async function handle({ request }: { request: Request }) {
	const headers: Headers = request.headers;
	const { response } = await handler.handle(request, {
		context: { headers },
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
