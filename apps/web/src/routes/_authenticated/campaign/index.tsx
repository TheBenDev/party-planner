import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/campaign/")({
	component: CampaignPage,
});

export default function CampaignPage() {
	return (
		<div>
			Lorem ipsum dolor sit amet consectetur adipisicing elit. Natus, sed
			doloremque! Blanditiis libero distinctio eaque magni quaerat inventore
			sapiente deserunt minus, ab quo alias cupiditate optio omnis consectetur
			cum quae!
		</div>
	);
}
