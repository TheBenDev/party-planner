import { auth } from "@clerk/tanstack-react-start/server";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

import CampaignShell from "@/components/campaign-shell";

const fetchClerkAuth = createServerFn({ method: "GET" }).handler(async () => {
	const { userId, isAuthenticated } = await auth();
	if (!isAuthenticated) {
		throw redirect({
			to: "/sign-in",
		});
	}

	return {
		userId,
	};
});

export const Route = createFileRoute("/_authenticated")({
	beforeLoad: async () => await fetchClerkAuth(),
	component: () => (
		<CampaignShell>
			<Outlet />
		</CampaignShell>
	),
});
