import { createFileRoute } from "@tanstack/react-router";
import { RegionDetailPage } from "@/features/regions/routes/region-detail";

export const Route = createFileRoute(
	"/_authenticated/campaign/regions/$regionId/",
)({
	component: RegionDetailPage,
});
