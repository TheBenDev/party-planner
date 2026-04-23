import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/components/dashboard";
import { EmptyCampaignDashboard } from "@/components/emptyCampaign";
import { useAuth } from "@/hooks/auth";

export const Route = createFileRoute("/_authenticated/dashboard")({
	component: DashboardPage,
});

function DashboardPage() {
	const { campaign, campaignIsLoading } = useAuth();

	if (campaignIsLoading) {
		return <div>loading...</div>;
	}

	if (!campaign) {
		return <EmptyCampaignDashboard />;
	}

	return <Dashboard />;
}
