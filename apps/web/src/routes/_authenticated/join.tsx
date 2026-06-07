import { createFileRoute } from "@tanstack/react-router";
import { JoinCampaignPage, joinSearchSchema } from "@/features/players/routes/join";

export const Route = createFileRoute("/_authenticated/join")({
	component: JoinCampaignPage,
	validateSearch: joinSearchSchema,
});
