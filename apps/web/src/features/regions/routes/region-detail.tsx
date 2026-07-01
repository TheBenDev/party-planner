import { UserRole } from "@planner/enums/user";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Button } from "@/shared/components/ui/button";
import { Separator } from "@/shared/components/ui/separator";
import { useAuth } from "@/shared/hooks/auth";
import { useRegion } from "../hooks/useRegion";

export function RegionDetailPage() {
	const { regionId } = useParams({
		from: "/_authenticated/campaign/regions/$regionId/",
	});
	const navigate = useNavigate();
	const { role } = useAuth();
	const { data, isError, isLoading } = useRegion(regionId);

	if (isLoading) return <div>Loading...</div>;
	if (isError) return <div>Failed to load region.</div>;
	const region = data?.region;
	if (!region) return <div className="p-8 text-muted-foreground">Region not found.</div>;

	return (
		<div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
			<div className="flex items-start justify-between gap-4">
				<h1 className="text-3xl font-semibold tracking-tight">{region.name}</h1>
				{role === UserRole.DUNGEON_MASTER && (
					<Button
						onClick={() =>
							navigate({
								params: { regionId },
								to: "/campaign/regions/$regionId/edit",
							})
						}
						size="sm"
						variant="outline"
					>
						Edit
					</Button>
				)}
			</div>

			<Separator />

			{region.mapImageUrl && (
				<div className="space-y-1.5">
					<h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
						Map
					</h2>
					<img
						alt={`Map of ${region.name}`}
						className="rounded-lg border w-full object-cover max-h-96"
						src={region.mapImageUrl}
					/>
				</div>
			)}

			<Button
				className="text-muted-foreground"
				onClick={() => navigate({ to: "/campaign/regions" })}
				size="sm"
				variant="ghost"
			>
				← Back to Regions
			</Button>
		</div>
	);
}
