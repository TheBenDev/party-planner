import { createClient } from "@jsandy/rpc";
import type { AppRouter } from "@/server";
import { clientConfig } from "./config";

/**
 * Your type-safe API client with Clerk authentication
 */
export const client = createClient<AppRouter>({
	baseUrl: `${clientConfig.NEXT_PUBLIC_APP_URL}/api`,
});
