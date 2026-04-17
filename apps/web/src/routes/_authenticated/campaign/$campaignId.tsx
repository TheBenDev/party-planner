import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/campaign/$campaignId")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/_authenticated/campaign/$campaignId"!</div>;
}
