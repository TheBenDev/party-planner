import { createFileRoute } from "@tanstack/react-router";
import { LocationEditPage } from "@/features/regions/routes/location-edit";

export const Route = createFileRoute(
	"/_authenticated/campaign/regions/$regionId/locations/$locationId/edit",
)({
	component: LocationEditPage,
});
