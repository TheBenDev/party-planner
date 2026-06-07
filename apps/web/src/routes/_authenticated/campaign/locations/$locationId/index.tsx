import { createFileRoute } from "@tanstack/react-router";
import { LocationDetailPage } from "@/features/locations/routes/location-detail";

export const Route = createFileRoute(
	"/_authenticated/campaign/locations/$locationId/",
)({
	component: LocationDetailPage,
});
