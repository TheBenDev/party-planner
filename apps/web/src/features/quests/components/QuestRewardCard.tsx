import type { QuestReward } from "@planner/schemas/quests";
import type { LucideIcon } from "lucide-react";
import { Coins, Hammer, Heart, Package, Users, Wheat } from "lucide-react";

type ColonyStatKey =
	| "buildingMaterials"
	| "colonistCount"
	| "food"
	| "gold"
	| "morale";

const COLONY_STATS: { icon: LucideIcon; key: ColonyStatKey; label: string }[] =
	[
		{ icon: Coins, key: "gold", label: "Gold" },
		{ icon: Wheat, key: "food", label: "Food" },
		{ icon: Hammer, key: "buildingMaterials", label: "Materials" },
		{ icon: Users, key: "colonistCount", label: "Colonists" },
		{ icon: Heart, key: "morale", label: "Morale" },
	];

function ColonyStatTile({
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
			<p className="text-xl font-semibold tabular-nums text-emerald-500">
				+{value.toLocaleString()}
			</p>
		</div>
	);
}

export function QuestRewardCard({ reward }: { reward?: QuestReward | null }) {
	if (!reward) return null;

	const colonyStats = COLONY_STATS.filter(
		(stat) =>
			reward.colony?.[stat.key] !== undefined &&
			(reward.colony[stat.key] ?? 0) > 0,
	);
	const hasColony = colonyStats.length > 0;
	const hasLoot = (reward.loot?.length ?? 0) > 0;

	if (!(hasColony || hasLoot)) return null;

	return (
		<div className="space-y-4">
			<h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
				Rewards
			</h2>

			{hasColony && (
				<div className="border rounded-2xl p-6 space-y-4">
					<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
						Colony
					</p>
					<div className="grid grid-cols-3 gap-x-4 gap-y-5">
						{colonyStats.map((stat) => {
							const stats = reward.colony ? reward.colony : {};
							const colonyReward = stats[stat.key] || 0;
							return (
								<ColonyStatTile
									icon={stat.icon}
									key={stat.key}
									label={stat.label}
									value={colonyReward}
								/>
							);
						})}
					</div>
				</div>
			)}

			{hasLoot && (
				<div className="border rounded-2xl p-6 space-y-3">
					<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
						Loot
					</p>
					<ul className="space-y-3">
						{reward.loot?.map((item, index) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: loot items have no stable id
							<li className="flex items-center gap-3" key={index}>
								<Package className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
								<div className="min-w-0">
									<span className="text-sm font-medium">
										{item.name}
										{item.quantity !== undefined && item.quantity > 1 && (
											<span className="text-muted-foreground font-normal">
												{" "}
												×{item.quantity}
											</span>
										)}
									</span>
									{item.description && (
										<p className="text-xs text-muted-foreground mt-0.5">
											{item.description}
										</p>
									)}
								</div>
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}
