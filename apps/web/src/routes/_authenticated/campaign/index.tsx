import { createFileRoute } from "@tanstack/react-router";
import { CampaignPage } from "@/features/campaigns/routes/campaign-index";

export const Route = createFileRoute("/_authenticated/campaign/")({
	component: CampaignPage,
});
