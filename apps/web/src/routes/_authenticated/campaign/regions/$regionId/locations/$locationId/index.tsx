import { createFileRoute } from "@tanstack/react-router";
import { LocationDetailPage } from "@/features/regions/routes/location-detail";

export const Route = createFileRoute(
	"/_authenticated/campaign/regions/$regionId/locations/$locationId/",
)({
	component: LocationDetailPage,
});
