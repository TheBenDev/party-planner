import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { CORSPlugin } from "@orpc/server/plugins";
import appRouter from "@/server/index";

const handler = new RPCHandler(appRouter, {
	interceptors: [
		onError((error) => {
			// biome-ignore lint/suspicious/noConsole: I'll fix later
			console.error(error);
		}),
	],
	plugins: [new CORSPlugin()],
});

async function handleRequest(request: Request) {
	const headers: Headers = request.headers;
	const { response } = await handler.handle(request, {
		context: { headers }, // Provide initial context if required
		prefix: "/api",
	});

	return response ?? new Response("Not found", { status: 404 });
}

export const HEAD = handleRequest;
export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
