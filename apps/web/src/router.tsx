import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routeTree } from "@/routeTree.gen";
import RootErrorBoundary from "@/shared/components/RootErrorBoundary";
import RootNotFound from "@/shared/components/RootNotFound";
import { getContext } from "@/shared/lib/tanstack-query-provider";

export function getRouter() {
	const router = createTanStackRouter({
		context: getContext(),
		defaultErrorComponent: RootErrorBoundary,
		defaultNotFoundComponent: RootNotFound,
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
		routeTree,
		scrollRestoration: true,
	});

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
