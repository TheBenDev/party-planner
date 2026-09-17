import { createFileRoute } from "@tanstack/react-router";
import { MapPage } from "@/features/map/routes/map-page";

export const Route = createFileRoute("/_authenticated/campaign/map/")({
	component: MapPage,
});
