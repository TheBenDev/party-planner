import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Dashboard } from "@/features/campaigns/components/Dashboard";
import { useAuth } from "@/shared/hooks/auth";

export function DashboardPage() {
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
