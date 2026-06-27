import { zodResolver } from "@hookform/resolvers/zod";
import { UserRole } from "@planner/enums/user";
import { Navigate, useNavigate, useParams } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useLocation } from "@/features/locations/hooks/useLocation";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { useAuth } from "@/shared/hooks/auth";
import type { client } from "@/shared/lib/client";
import { useLocationData } from "../hooks/useLocationData";

export const locationEditSchema = z.object({
	description: z.string().optional(),
	dmNotes: z.string().optional(),
	name: z.string().min(1),
	notes: z.string().optional(),
});

export type LocationEditForm = z.infer<typeof locationEditSchema>;

export function LocationEditPage() {
	const { locationId } = useParams({
		from: "/_authenticated/campaign/locations/$locationId/edit",
	});
	const { role, campaignIsLoading } = useAuth();

	const { data: locationData, isError, isLoading } = useLocation(locationId);

	if (campaignIsLoading) return <div>Loading...</div>;
	if (role !== UserRole.DUNGEON_MASTER) {
		return (
			<Navigate
				params={{ locationId }}
				replace
				to="/campaign/locations/$locationId"
			/>
		);
	}

	if (isLoading) return <div>Loading...</div>;
	if (isError) return <div>Failed to load location.</div>;
	const location = locationData?.location;
	if (!location) return <div>Location not found.</div>;

	return <LocationEditFormInner location={location} locationId={locationId} />;
}

type Location = NonNullable<
	Awaited<ReturnType<typeof client.location.getLocationById>>["location"]
>;

function LocationEditFormInner({
	location,
	locationId,
}: {
	location: Location;
	locationId: string;
}) {
	const { updateLocation } = useLocationData();
	const navigate = useNavigate();

	const form = useForm<LocationEditForm>({
		defaultValues: {
			description: location.description ?? "",
			dmNotes: location.dmNotes ?? "",
			name: location.name,
			notes: location.notes ?? "",
		},
		resolver: zodResolver(locationEditSchema),
	});

	return (
		<form
			className="mx-auto max-w-3xl space-y-6 px-4 py-8"
			onSubmit={form.handleSubmit((data) =>
				updateLocation.mutate(
					{ id: locationId, ...data },
					{
						onError: () => toast.error("failed to update location"),
						onSuccess: () =>
							navigate({
								params: { locationId },
								to: "/campaign/locations/$locationId",
							}),
					},
				),
			)}
		>
			<div>
				<h1 className="text-2xl font-semibold">Edit Location</h1>
				<p className="text-sm text-muted-foreground">Update location details</p>
			</div>

			<div className="space-y-2">
				<Label>Name</Label>
				<Input {...form.register("name")} />
			</div>

			<div className="space-y-2">
				<Label>Description</Label>
				<Textarea {...form.register("description")} placeholder="Description" />
			</div>

			<div className="space-y-2">
				<Label>Notes</Label>
				<Textarea
					{...form.register("notes")}
					placeholder="Player-facing notes"
				/>
			</div>

			<div className="space-y-2">
				<Label>DM Notes</Label>
				<Textarea
					{...form.register("dmNotes")}
					placeholder="Private DM notes"
				/>
			</div>

			<div className="flex justify-end gap-2 pt-4">
				<Button
					onClick={() =>
						navigate({
							params: { locationId },
							to: "/campaign/locations/$locationId",
						})
					}
					type="button"
					variant="outline"
				>
					Cancel
				</Button>

				<Button disabled={updateLocation.isPending} type="submit">
					Save Changes
				</Button>
			</div>
		</form>
	);
}
