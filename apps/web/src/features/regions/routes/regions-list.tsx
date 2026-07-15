import { UserRole } from "@planner/enums/user";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { MapPin, MapPinOff, MoreHorizontal, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Input } from "@/shared/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useAuth } from "@/shared/hooks/auth";
import { client } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/query-keys";
import LeafletMap from "../components/LeafletMap";
import { useLocationData } from "../hooks/useLocationData";
import { useRegionData } from "../hooks/useRegionData";

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
	regionId: string;
	mapX?: number | null;
	mapY?: number | null;
};

function LocationRow({
	location,
	onView,
	onEdit,
	onDelete,
	onPin,
	onRemovePin,
	isDm,
}: {
	location: Location;
	onView: () => void;
	onEdit: () => void;
	onDelete: () => void;
	onPin?: () => void;
	onRemovePin?: () => void;
	isDm: boolean;
}) {
	const initials = getInitials(location.name);
	const color = getLocationColor(location.name);
	const hasCoords = location.mapX != null && location.mapY != null;

	return (
		<div
			className="group flex w-full items-center gap-3 px-4 py-3.5 border rounded-xl hover:bg-muted/40 transition-colors justify-start h-auto cursor-pointer"
			onClick={onView}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") onView();
			}}
			role="button"
			tabIndex={0}
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

			{isDm && !hasCoords && onPin && (
				<button
					className="inline-flex items-center justify-center rounded-lg h-8 w-8 opacity-0 hover:bg-accent group-hover:opacity-100 hover:cursor-pointer transition-opacity shrink-0 text-muted-foreground hover:text-foreground"
					onClick={(e) => {
						e.stopPropagation();
						onPin();
					}}
					title="Place on map"
					type="button"
				>
					<MapPin className="w-4 h-4" />
				</button>
			)}
			{isDm && hasCoords && onRemovePin && (
				<button
					className="inline-flex items-center justify-center rounded-lg h-8 w-8 opacity-0 hover:bg-accent group-hover:opacity-100 hover:cursor-pointer transition-opacity shrink-0 text-muted-foreground hover:text-destructive"
					onClick={(e) => {
						e.stopPropagation();
						onRemovePin();
					}}
					title="Remove from map"
					type="button"
				>
					<MapPinOff className="w-4 h-4" />
				</button>
			)}

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
					{isDm && (
						<>
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
						</>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}

export function RegionsPage() {
	const { campaign, campaignIsLoading, role } = useAuth();
	const { createRegion } = useRegionData();
	const { createLocation, deleteLocation, updateLocation } = useLocationData();
	const isDm = role === UserRole.DUNGEON_MASTER;
	const navigate = useNavigate();

	const { data: regionsData, isLoading } = useQuery({
		enabled: Boolean(campaign),
		queryFn: () =>
			client.region.listRegionsByCampaign({
				campaignId: campaign?.campaign.id ?? "",
			}),
		queryKey: queryKeys.regions.list(campaign?.campaign.id ?? ""),
	});

	const [search, setSearch] = useState("");
	const [selectedRegionId, setSelectedRegionId] = useState<null | string>(null);
	const [addMarkerId, setAddMarkerId] = useState<null | string>(null);
	const [localMarkers, setLocalMarkers] = useState<
		Array<{ id: string; name: string; x: number; y: number }>
	>([]);

	useEffect(() => {
		if (
			regionsData?.regions &&
			regionsData.regions.length > 0 &&
			!selectedRegionId
		) {
			setSelectedRegionId(regionsData.regions[0].region.id);
		}
	}, [regionsData, selectedRegionId]);

	useEffect(() => {
		const regionData = regionsData?.regions.find(
			(r) => r.region.id === selectedRegionId,
		);
		setLocalMarkers(
			(regionData?.locations ?? [])
				.filter(
					(loc): loc is typeof loc & { mapX: number; mapY: number } =>
						loc.mapX != null && loc.mapY != null,
				)
				.map((loc) => ({
					id: loc.id,
					name: loc.name,
					x: loc.mapX,
					y: loc.mapY,
				})),
		);
	}, [selectedRegionId, regionsData]);

	if (campaignIsLoading) {
		return <div>Loading...</div>;
	}

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

	const selectedRegionData = regionsData?.regions.find(
		(r) => r.region.id === selectedRegionId,
	);
	const allLocations = selectedRegionData?.locations ?? [];

	const filtered = allLocations.filter((loc) => {
		const query = search.toLowerCase();
		return (
			loc.name.toLowerCase().includes(query) ||
			loc.description?.toLowerCase().includes(query)
		);
	});

	function handleCreateLocation() {
		if (!selectedRegionId) return;
		createLocation.mutate(
			{ name: "New Location", regionId: selectedRegionId },
			{
				onError: () => toast.error("Failed to create location"),
				onSuccess: (data) => {
					toast.success("Location created");
					navigate({
						params: {
							locationId: data.location.id,
							regionId: selectedRegionId,
						},
						to: "/campaign/regions/$regionId/locations/$locationId/edit",
					});
				},
			},
		);
	}

	return (
		<div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
			{/* 1. Header */}
			<div className="flex items-center justify-between gap-4">
				<h1 className="text-2xl font-semibold tracking-tight">Regions</h1>
				{isDm && (
					<Button
						disabled={createRegion.isPending}
						onClick={() =>
							createRegion.mutate(
								{ name: "New Region" },
								{
									onError: () => toast.error("Failed to create region"),
									onSuccess: () => toast.success("Region created"),
								},
							)
						}
					>
						<Plus className="w-4 h-4 mr-2" />
						New Region
					</Button>
				)}
			</div>

			{/* 2. Region selector */}
			<div className="space-y-1.5">
				<p className="text-sm font-medium text-muted-foreground">
					Currently displayed Region
				</p>
				<Select
					disabled={isLoading || regionsData?.regions.length === 0}
					onValueChange={setSelectedRegionId}
					value={selectedRegionId ?? ""}
				>
					<SelectTrigger className="w-full max-w-64">
						<SelectValue
							placeholder={isLoading ? "Loading…" : "Select a region"}
						/>
					</SelectTrigger>
					<SelectContent>
						{regionsData?.regions.map((r) => (
							<SelectItem key={r.region.id} value={r.region.id}>
								{r.region.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* 3. Map */}
			{selectedRegionData?.region.mapImageUrl && (
				<LeafletMap
					draggableMarkers={isDm}
					imageUrl={selectedRegionData.region.mapImageUrl}
					isPlacingMarker={addMarkerId !== null}
					markers={localMarkers}
					onMapClick={
						addMarkerId !== null
							? (x, y) => {
									const targetId = addMarkerId;
									setAddMarkerId(null);
									updateLocation.mutate(
										{ id: targetId, mapX: x, mapY: y },
										{ onError: () => toast.error("Failed to place marker") },
									);
								}
							: undefined
					}
					onMarkerClick={(id) => {
						const markerLocation = allLocations.find((loc) => loc.id === id);
						if (!markerLocation) return;
						navigate({
							params: { locationId: id, regionId: markerLocation.regionId },
							to: "/campaign/regions/$regionId/locations/$locationId",
						});
					}}
					onMarkerMove={(id, x, y) => {
						const previousMarkers = localMarkers;
						setLocalMarkers((prev) =>
							prev.map((m) => (m.id === id ? { ...m, x, y } : m)),
						);
						updateLocation.mutate(
							{ id, mapX: x, mapY: y },
							{
								onError: () => {
									setLocalMarkers(previousMarkers);
									toast.error("Failed to save marker position");
								},
							},
						);
					}}
				/>
			)}

			{/* 4 & 5. Locations header + search */}
			<div className="space-y-3">
				<div className="flex items-center justify-between gap-4">
					<div className="flex items-center gap-1.5 min-w-0">
						<h2 className="text-base font-semibold truncate">
							{selectedRegionData
								? `${selectedRegionData.region.name} Locations`
								: "Locations"}
						</h2>
						{selectedRegionId && (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<div className="inline-flex items-center justify-center rounded-lg h-7 w-7 hover:bg-accent cursor-pointer transition-colors shrink-0">
										<MoreHorizontal className="w-4 h-4" />
										<span className="sr-only">Region options</span>
									</div>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="start" className="w-40">
									<DropdownMenuItem
										onClick={() =>
											navigate({
												params: { regionId: selectedRegionId },
												to: "/campaign/regions/$regionId",
											})
										}
									>
										View
									</DropdownMenuItem>
									{isDm && (
										<DropdownMenuItem
											onClick={() =>
												navigate({
													params: { regionId: selectedRegionId },
													to: "/campaign/regions/$regionId/edit",
												})
											}
										>
											Edit
										</DropdownMenuItem>
									)}
								</DropdownMenuContent>
							</DropdownMenu>
						)}
					</div>
					{isDm && selectedRegionId && (
						<Button
							disabled={createLocation.isPending}
							onClick={handleCreateLocation}
							size="sm"
							variant="outline"
						>
							<Plus className="w-3.5 h-3.5 mr-1.5" />
							Add Location
						</Button>
					)}
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
			</div>

			{/* 6. Location list */}
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
								{isDm && selectedRegionId && (
									<Button
										className="mt-4"
										disabled={createLocation.isPending}
										onClick={handleCreateLocation}
										size="sm"
										variant="outline"
									>
										<Plus className="w-4 h-4 mr-1.5" />
										Add Location
									</Button>
								)}
							</>
						)}
					</div>
				)}

				{!isLoading &&
					filtered.length > 0 &&
					filtered.map((loc) => (
						<LocationRow
							isDm={isDm}
							key={loc.id}
							location={loc}
							onDelete={() =>
								deleteLocation.mutate(
									{ id: loc.id },
									{ onError: () => toast.error("Failed to delete location") },
								)
							}
							onEdit={() =>
								navigate({
									params: { locationId: loc.id, regionId: loc.regionId },
									to: "/campaign/regions/$regionId/locations/$locationId/edit",
								})
							}
							onPin={
								selectedRegionData?.region.mapImageUrl
									? () => setAddMarkerId(loc.id)
									: undefined
							}
							onRemovePin={
								selectedRegionData?.region.mapImageUrl
									? () =>
											updateLocation.mutate(
												{ id: loc.id },
												{
													onError: () => toast.error("Failed to remove marker"),
												},
											)
									: undefined
							}
							onView={() =>
								navigate({
									params: { locationId: loc.id, regionId: loc.regionId },
									to: "/campaign/regions/$regionId/locations/$locationId",
								})
							}
						/>
					))}
			</div>
		</div>
	);
}
