import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MapPin, MoreHorizontal, Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/auth";
import { client } from "@/lib/client";

export const Route = createFileRoute("/_authenticated/campaign/locations/")({
	component: LocationsPage,
});

const LOCATION_COLORS = [
	"bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
	"bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
	"bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
	"bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300",
	"bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
	"bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900 dark:text-fuchsia-300",
];

function getLocationColor(name: string) {
	const index =
		name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
		LOCATION_COLORS.length;
	return LOCATION_COLORS[index];
}

function getInitials(name: string) {
	return name
		.split(" ")
		.slice(0, 2)
		.map((n) => n[0])
		.join("")
		.toUpperCase();
}

function LocationCardSkeleton() {
	return (
		<div className="flex items-center gap-3 px-4 py-3.5 border rounded-xl">
			<Skeleton className="w-10 h-10 rounded-full shrink-0" />
			<div className="flex-1 space-y-2">
				<Skeleton className="h-4 w-36" />
				<Skeleton className="h-3 w-56" />
			</div>
			<Skeleton className="h-8 w-8 rounded-md" />
		</div>
	);
}

type Location = {
	id: string;
	name: string;
	description?: string | null;
	notes?: string | null;
};

function LocationRow({
	location,
	onView,
	onEdit,
	onDelete,
}: {
	location: Location;
	onView: () => void;
	onEdit: () => void;
	onDelete: () => void;
}) {
	const initials = getInitials(location.name);
	const color = getLocationColor(location.name);

	return (
		<Button
			className="group flex w-full items-center gap-3 px-4 py-3.5 border rounded-xl hover:bg-muted/40 transition-colors cursor-pointer justify-start h-auto"
			onClick={onView}
			size={null}
			variant="ghost"
		>
			<div
				className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold ${color}`}
			>
				{initials}
			</div>

			<div className="flex-1 min-w-0">
				<p className="font-medium text-sm leading-tight truncate">
					{location.name}
				</p>
				<p className="text-xs text-muted-foreground mt-0.5 truncate text-start">
					{location.description ?? (
						<span className="italic text-muted-foreground/50">
							No description yet.
						</span>
					)}
				</p>
			</div>

			<DropdownMenu>
				<DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
					<div className="inline-flex items-center justify-center rounded-lg h-8 w-8 opacity-0 hover:bg-accent group-hover:opacity-100 hover:cursor-pointer transition-opacity shrink-0">
						<MoreHorizontal className="w-4 h-4" />
						<span className="sr-only">Options for {location.name}</span>
					</div>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-40">
					<DropdownMenuItem
						onClick={(e) => {
							e.stopPropagation();
							onView();
						}}
					>
						View
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={(e) => {
							e.stopPropagation();
							onEdit();
						}}
					>
						Edit
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						className="text-destructive focus:text-destructive"
						onClick={(e) => {
							e.stopPropagation();
							onDelete();
						}}
					>
						Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</Button>
	);
}

function LocationsPage() {
	const { campaign } = useAuth();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");

	const { data: locations = { locations: [] }, isLoading } = useQuery({
		enabled: Boolean(campaign),
		queryFn: () => {
			if (!campaign) throw new Error("campaign required");
			return client.location.listLocationsByCampaignId({
				campaignId: campaign.campaign.id,
			});
		},
		queryKey: ["locations", campaign?.campaign.id],
	});

	const { mutate: deleteLocation } = useMutation({
		mutationFn: (id: string) => client.location.removeLocation({ id }),
		onError: () => toast.error("Failed to delete location"),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["locations", campaign?.campaign.id],
			});
		},
	});

	const { mutate: createLocation, isPending: creatingLocation } = useMutation({
		mutationFn: () => {
			if (!campaign) throw new Error("campaign required");
			return client.location.createLocation({
				campaignId: campaign.campaign.id,
				name: "New Location",
			});
		},
		onError: () => toast.error("Failed to create location"),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["locations", campaign?.campaign.id],
			});
		},
	});

	if (!campaign) {
		return (
			<div className="flex flex-col space-x-3 justify-center items-center">
				<span>Campaign Missing</span>
				<Button onClick={() => navigate({ to: "/campaign/create" })}>
					Create new Campaign
				</Button>
			</div>
		);
	}

	const filtered = locations.locations.filter((loc) => {
		const q = search.toLowerCase();
		return (
			loc.name.toLowerCase().includes(q) ||
			loc.description?.toLowerCase().includes(q)
		);
	});

	return (
		<div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">Locations</h1>
					{!isLoading && (
						<p className="text-sm text-muted-foreground mt-0.5">
							{locations.locations.length} location
							{locations.locations.length !== 1 ? "s" : ""} in this campaign
						</p>
					)}
				</div>
				<Button
					className="shrink-0"
					disabled={creatingLocation}
					onClick={() => createLocation()}
				>
					<Plus className="w-4 h-4 mr-2" />
					New Location
				</Button>
			</div>

			<div className="relative">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
				<Input
					className="pl-9"
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Search by name or description..."
					value={search}
				/>
			</div>

			<div className="space-y-2">
				{isLoading &&
					Array.from({ length: 5 }).map((_, i) => (
						<LocationCardSkeleton key={i} />
					))}

				{!isLoading && filtered.length === 0 && (
					<div className="flex flex-col items-center justify-center py-20 text-center">
						<div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
							<MapPin className="w-7 h-7 text-muted-foreground" />
						</div>
						{search ? (
							<>
								<p className="font-medium">No locations match "{search}"</p>
								<p className="text-sm text-muted-foreground mt-1">
									Try searching by name or description.
								</p>
							</>
						) : (
							<>
								<p className="font-medium">No locations yet</p>
								<p className="text-sm text-muted-foreground mt-1">
									Add your first location to get started.
								</p>
								<Button
									className="mt-4"
									disabled={creatingLocation}
									onClick={() => createLocation()}
									size="sm"
									variant="outline"
								>
									<Plus className="w-4 h-4 mr-1.5" />
									Create Location
								</Button>
							</>
						)}
					</div>
				)}

				{!isLoading &&
					filtered.length > 0 &&
					filtered.map((loc) => (
						<LocationRow
							key={loc.id}
							location={loc}
							onDelete={() => deleteLocation(loc.id)}
							onEdit={() =>
								navigate({
									params: { locationId: loc.id },
									to: "/campaign/locations/$locationId/edit",
								})
							}
							onView={() =>
								navigate({
									params: { locationId: loc.id },
									to: "/campaign/locations/$locationId",
								})
							}
						/>
					))}
			</div>
		</div>
	);
}
