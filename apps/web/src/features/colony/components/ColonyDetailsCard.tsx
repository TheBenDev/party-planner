import { UserRole } from "@planner/enums/user";
import { Link, useRouterState } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { Pencil, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useAuth } from "@/shared/hooks/auth";
import { useColony } from "../hooks/useColony";
import { useColonyData } from "../hooks/useColonyData";
import type { Colony } from "../types";
import { COLONY_STATS } from "../constants";
import EditColonyCard from "./EditColonyCard";

function StatTile({
	icon: Icon,
	label,
	value,
}: {
	icon: LucideIcon;
	label: string;
	value: number;
}) {
	return (
		<div className="space-y-1">
			<div className="flex items-center gap-1.5 text-muted-foreground">
				<Icon className="w-3.5 h-3.5" />
				<span className="text-xs font-medium uppercase tracking-wide">
					{label}
				</span>
			</div>
			<p className="text-2xl font-semibold tabular-nums">
				{value.toLocaleString()}
			</p>
		</div>
	);
}

const LOADING_HEADER = (
	<h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">
		Colony
	</h2>
);

export default function ColonyDetailsCard({
	campaignId,
}: {
	campaignId: string;
}) {
	const { data, isLoading } = useColony(campaignId);
	const { role } = useAuth();
	const pathName = useRouterState({
		select: (state) => state.location.pathname,
	});
	const isDm = role === UserRole.DUNGEON_MASTER;
	const [isEditing, setIsEditing] = useState(false);
	const { createColony } = useColonyData();

	if (isLoading) {
		return (
			<>
				{LOADING_HEADER}
				<Skeleton className="h-32 rounded-2xl" />
			</>
		);
	}

	if (!data) {
		if (!isDm) return null;
		return (
			<>
				{LOADING_HEADER}
				<div className="border rounded-2xl p-6 flex items-center justify-between">
					<p className="text-sm text-muted-foreground">No colony yet.</p>
					<Button
						disabled={createColony.isPending}
						onClick={() =>
							createColony.mutate(
								{},
								{
									onError: () => toast.error("Failed to create colony"),
									onSuccess: () => toast.success("Colony created"),
								},
							)
						}
						size="sm"
					>
						Initialize Colony
					</Button>
				</div>
			</>
		);
	}

	return (
		<>
			<div className="flex items-center justify-between mb-3">
				<h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
					{pathName.startsWith("/campaign/colony") ? (
						"Colony"
					) : (
						<Link
							params={{ colonyId: data.colony.id }}
							to="/campaign/colony/$colonyId"
						>
							Colony
						</Link>
					)}
				</h2>
				{isDm && (
					<button
						className="text-muted-foreground hover:text-foreground transition-colors"
						onClick={() => setIsEditing((prev) => !prev)}
						type="button"
					>
						{isEditing ? (
							<X className="w-3.5 h-3.5" />
						) : (
							<Pencil className="w-3.5 h-3.5" />
						)}
					</button>
				)}
			</div>
			{isEditing ? (
				<EditColonyCard
					buildingMaterials={data.colony.buildingMaterials}
					colonistCount={data.colony.colonistCount}
					colonyId={data.colony.id}
					food={data.colony.food}
					gold={data.colony.gold}
					morale={data.colony.morale}
				/>
			) : (
				<div className="border rounded-2xl p-6">
					<div className="grid grid-cols-3 gap-x-4 gap-y-5">
						{COLONY_STATS.map((stat) => (
							<StatTile
								icon={stat.icon}
								key={stat.key}
								label={stat.label}
								value={data.colony[stat.key as keyof Colony] as number}
							/>
						))}
					</div>
				</div>
			)}
		</>
	);
}
