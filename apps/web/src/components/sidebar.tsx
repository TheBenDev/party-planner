import { Activity, Compass, Map as Location, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface LinkItem {
	label: string;
	url: string;
	icon: React.ComponentType<{ className?: string }>;
}
type LinkItems = LinkItem[];

export default function SidebarComponent() {
	const pathName = usePathname();
	const options: LinkItems = [
		{
			icon: User,
			label: "npcs",
			url: "/campaign/npcs",
		},
		{
			icon: Location,
			label: "locations",
			url: "/campaign/locations",
		},
		{
			icon: Compass,
			label: "quests",
			url: "/campaign/quests",
		},
		{
			icon: Activity,
			label: "sessions",
			url: "/campaign/sessions",
		},
	];
	return (
		<div className="flex flex-col pl-7 pt-5 space-y-3 w-3xs border-r-2 border-t-2">
			{options.map((option) => (
				<Link
					className={cn(
						"flex hover:bg-accent mr-3 p-1 rounded-sm items-center",
						option.url === pathName && "bg-accent cursor-default",
					)}
					href={option.url}
					key={option.label}
					onClick={(e) => {
						if (option.url === pathName) e.preventDefault();
					}}
				>
					<option.icon className="mr-5" />
					{option.label}
				</Link>
			))}
		</div>
	);
}
