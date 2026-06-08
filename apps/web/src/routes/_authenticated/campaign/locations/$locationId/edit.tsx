import { createFileRoute } from "@tanstack/react-router";
import { LocationEditPage } from "@/features/locations/routes/location-edit";

export const Route = createFileRoute(
	"/_authenticated/campaign/locations/$locationId/edit",
)({
	component: LocationEditPage,
});
