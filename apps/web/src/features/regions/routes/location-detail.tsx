import { UserRole } from "@planner/enums/user";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useLocation } from "@/features/regions/hooks/useLocation";
import { Button } from "@/shared/components/ui/button";
import { Separator } from "@/shared/components/ui/separator";
import { useAuth } from "@/shared/hooks/auth";

export function LocationDetailPage() {
	const { regionId, locationId } = useParams({
		from: "/_authenticated/campaign/regions/$regionId/locations/$locationId/",
	});
	const navigate = useNavigate();
	const { role } = useAuth();

	const { data: locationData, isError, isLoading } = useLocation(locationId);
	if (isLoading) return <div>Loading...</div>;
	if (isError) return <div>Failed to load location.</div>;
	const location = locationData?.location;

	if (!location) {
		return <div className="p-8 text-muted-foreground">Location not found.</div>;
	}

	return (
		<div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
			{/* Header */}
			<div className="flex items-start justify-between gap-4">
				<div className="space-y-1">
					<h1 className="text-3xl font-semibold tracking-tight">
						{location.name}
					</h1>
				</div>
				{role === UserRole.DUNGEON_MASTER && (
					<Button
						onClick={() =>
							navigate({
								params: { locationId, regionId },
								to: "/campaign/regions/$regionId/locations/$locationId/edit",
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

			<div className="space-y-6">
				<Section
					content={location.description}
					placeholder="No description recorded."
					title="Description"
				/>
				<Section
					content={location.notes}
					placeholder="No notes recorded."
					title="Notes"
				/>
				{role === UserRole.DUNGEON_MASTER && (
					<Section
						content={location.dmNotes}
						muted
						placeholder="No DM notes yet."
						title="DM Notes"
					/>
				)}
			</div>
		</div>
	);
}

function Section({
	title,
	content,
	muted = false,
	placeholder,
}: {
	title: string;
	content?: string | null;
	muted?: boolean;
	placeholder: string;
}) {
	return (
		<div className="space-y-1.5">
			<h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
				{title}
			</h2>
			{content ? (
				<p
					className={`text-sm leading-relaxed whitespace-pre-wrap ${muted ? "text-muted-foreground" : ""}`}
				>
					{content}
				</p>
			) : (
				<p className="text-sm italic text-muted-foreground/50">{placeholder}</p>
			)}
		</div>
	);
}
