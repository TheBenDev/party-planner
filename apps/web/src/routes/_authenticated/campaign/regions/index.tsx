import { createFileRoute } from "@tanstack/react-router";
import { RegionsPage } from "@/features/regions/routes/regions-list";

export const Route = createFileRoute("/_authenticated/campaign/regions/")({
	component: RegionsPage,
});
