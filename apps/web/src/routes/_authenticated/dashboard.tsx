import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Dashboard } from "@/components/dashboard";
import { useAuth } from "@/hooks/auth";

export const Route = createFileRoute("/_authenticated/dashboard")({
	component: DashboardPage,
});

function DashboardPage() {
	const { campaign, campaignIsLoading } = useAuth();
	const navigate = useNavigate();

	useEffect(() => {
		if (campaignIsLoading) return;
		if (campaign !== null) navigate({ to: "/campaign" });
	}, [campaign, campaignIsLoading]);

	if (campaignIsLoading) {
		return <div>loading...</div>;
	}

	return <Dashboard />;
}
