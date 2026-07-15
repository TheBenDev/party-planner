import { WorkerTypeEnum } from "@planner/enums/colony";
import {
	BookOpen,
	Coins,
	Hammer,
	HardHat,
	Heart,
	HeartPulse,
	type LucideIcon,
	Pickaxe,
	Sword,
	Users,
	Wand2,
	Wheat,
} from "lucide-react";

export const AVATAR_COLORS = [
	"bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
	"bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
	"bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
	"bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300",
	"bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
	"bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900 dark:text-fuchsia-300",
];

export interface WorkerTypeOption {
	key: WorkerTypeEnum;
	label: string;
	icon: LucideIcon;
}

export const WORKER_TYPE_OPTIONS: WorkerTypeOption[] = [
	{ icon: Wheat, key: WorkerTypeEnum.FARMER, label: "Farmer" },
	{ icon: HeartPulse, key: WorkerTypeEnum.HEALER, label: "Healer" },
	{ icon: Hammer, key: WorkerTypeEnum.BLACKSMITH, label: "Blacksmith" },
	{ icon: Sword, key: WorkerTypeEnum.SOLDIER, label: "Soldier" },
	{ icon: Pickaxe, key: WorkerTypeEnum.MINER, label: "Miner" },
	{ icon: HardHat, key: WorkerTypeEnum.BUILDER, label: "Builder" },
	{ icon: BookOpen, key: WorkerTypeEnum.SCHOLAR, label: "Scholar" },
	{ icon: Wand2, key: WorkerTypeEnum.MAGE, label: "Mage" },
];

export const WORKER_TYPE_LABEL = Object.fromEntries(
	WORKER_TYPE_OPTIONS.map((option) => [option.key, option.label]),
) as Record<WorkerTypeEnum, string>;

export type StatKey =
	| "gold"
	| "food"
	| "buildingMaterials"
	| "colonistCount"
	| "morale";

export const COLONY_STATS: { icon: LucideIcon; key: StatKey; label: string }[] =
	[
		{ icon: Coins, key: "gold", label: "Gold" },
		{ icon: Wheat, key: "food", label: "Food" },
		{ icon: Hammer, key: "buildingMaterials", label: "Materials" },
		{ icon: Users, key: "colonistCount", label: "Colonists" },
		{ icon: Heart, key: "morale", label: "Morale" },
	];
