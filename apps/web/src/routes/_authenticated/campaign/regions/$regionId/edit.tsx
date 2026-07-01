import { createFileRoute } from "@tanstack/react-router";
import { RegionEditPage } from "@/features/regions/routes/region-edit";

export const Route = createFileRoute(
	"/_authenticated/campaign/regions/$regionId/edit",
)({
	component: RegionEditPage,
});
