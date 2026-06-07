import { createFileRoute } from "@tanstack/react-router";
import { LocationsPage } from "@/features/locations/routes/locations-list";

export const Route = createFileRoute("/_authenticated/campaign/locations/")({
	component: LocationsPage,
});
