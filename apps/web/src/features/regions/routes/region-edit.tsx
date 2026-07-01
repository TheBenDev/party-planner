import { zodResolver } from "@hookform/resolvers/zod";
import { UserRole } from "@planner/enums/user";
import { Navigate, useNavigate, useParams } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { useAuth } from "@/shared/hooks/auth";
import { useRegion } from "../hooks/useRegion";
import { useRegionData } from "../hooks/useRegionData";
import { type RegionEditForm, RegionEditSchema } from "../types";

export function RegionEditPage() {
	const { regionId } = useParams({
		from: "/_authenticated/campaign/regions/$regionId/edit",
	});
	const { role, campaignIsLoading } = useAuth();
	const { data, isError, isLoading } = useRegion(regionId);

	if (campaignIsLoading) return <div>Loading...</div>;
	if (role !== UserRole.DUNGEON_MASTER) {
		return (
			<Navigate
				params={{ regionId }}
				replace
				to="/campaign/regions/$regionId"
			/>
		);
	}

	if (isLoading) return <div>Loading...</div>;
	if (isError) return <div>Failed to load region.</div>;
	const region = data?.data.region;
	if (!region) return <div>Region not found.</div>;

	return <RegionEditFormInner region={region} regionId={regionId} />;
}

type RegionFields = { id: string; name: string; mapImageUrl?: string | null };

function RegionEditFormInner({
	region,
	regionId,
}: {
	region: RegionFields;
	regionId: string;
}) {
	const { deleteRegion, updateRegion } = useRegionData();
	const navigate = useNavigate();

	const form = useForm<RegionEditForm>({
		defaultValues: {
			mapImageUrl: region.mapImageUrl ?? "",
			name: region.name,
		},
		resolver: zodResolver(RegionEditSchema),
	});

	return (
		<form
			className="mx-auto max-w-3xl space-y-6 px-4 py-8"
			onSubmit={form.handleSubmit((data) =>
				updateRegion.mutate(
					{
						id: regionId,
						mapImageUrl: data.mapImageUrl || undefined,
						name: data.name,
					},
					{
						onError: () => toast.error("Failed to update region"),
						onSuccess: () =>
							navigate({
								params: { regionId },
								to: "/campaign/regions/$regionId",
							}),
					},
				),
			)}
		>
			<div>
				<h1 className="text-2xl font-semibold">Edit Region</h1>
				<p className="text-sm text-muted-foreground">Update region details</p>
			</div>

			<div className="space-y-2">
				<Label>Name</Label>
				<Input {...form.register("name")} />
			</div>

			<div className="space-y-2">
				<Label>Map Image URL</Label>
				<Input
					{...form.register("mapImageUrl")}
					placeholder="https://example.com/map.jpg"
				/>
			</div>

			<div className="flex items-center justify-between pt-4">
				<AlertDialog>
					<AlertDialogTrigger asChild>
						<Button
							disabled={deleteRegion.isPending}
							type="button"
							variant="destructive"
						>
							Delete Region
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Delete this region?</AlertDialogTitle>
							<AlertDialogDescription>
								This will permanently delete <strong>{region.name}</strong> and
								all of its locations. This action cannot be undone.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction
								className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
								disabled={deleteRegion.isPending}
								onClick={() =>
									deleteRegion.mutate(
										{ id: regionId },
										{
											onError: () => toast.error("Failed to delete region"),
											onSuccess: () => {
												toast.success("Region deleted");
												navigate({ to: "/campaign/regions" });
											},
										},
									)
								}
							>
								Delete
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>

				<div className="flex gap-2">
					<Button
						onClick={() =>
							navigate({
								params: { regionId },
								to: "/campaign/regions/$regionId",
							})
						}
						type="button"
						variant="outline"
					>
						Cancel
					</Button>
					<Button disabled={updateRegion.isPending} type="submit">
						Save Changes
					</Button>
				</div>
			</div>
		</form>
	);
}
