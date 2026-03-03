import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import type { AppRouter } from "@/server";

const link = new RPCLink({
	url: `${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/rpc`,
});

// Create a client for your router
export const client: RouterClient<AppRouter> = createORPCClient(link);
