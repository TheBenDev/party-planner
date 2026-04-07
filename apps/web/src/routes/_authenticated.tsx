import { auth } from "@clerk/tanstack-react-start/server";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

async function requireAuth() {
	const { userId, isAuthenticated } = await auth();
	if (!isAuthenticated) {
		throw redirect({
			to: "/sign-in",
		});
	}

	return { userId };
}

export const Route = createFileRoute("/_authenticated")({
	beforeLoad: async () => await requireAuth(),
	component: () => <Outlet />,
});
