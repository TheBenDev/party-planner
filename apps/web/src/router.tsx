import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { getContext } from "@/integrations/tanstack-query/root-provider";
import { RootErrorBoundary } from "./components/error-boundary";
import { RootNotFound } from "./components/not-found";
import { routeTree } from "./routeTree.gen";

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
