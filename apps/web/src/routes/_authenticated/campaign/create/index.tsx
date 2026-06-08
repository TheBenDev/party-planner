import { createFileRoute } from "@tanstack/react-router";
import { CreateCampaignForm } from "@/features/campaigns/routes/create";

export const Route = createFileRoute("/_authenticated/campaign/create/")({
	component: CreateCampaignForm,
});
