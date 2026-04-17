import { Link, useRouterState } from "@tanstack/react-router";
import {
	Activity,
	Compass,
	Map as Location,
	Settings,
	ShapesIcon,
	User,
} from "lucide-react";
import { useAuth } from "@/hooks/auth";
import { cn } from "@/lib/utils";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "./ui/accordion";

interface LinkItem {
	label: string;
	url: string;
	icon: React.ComponentType<{ className?: string }>;
}
type LinkItems = LinkItem[];

function LinkComponent({
	item,
	pathName,
}: {
	item: LinkItem;
	pathName: string;
}) {
	return (
		<Link
			activeOptions={{
				exact: true,
			}}
			className={cn(
				"flex hover:bg-accent mr-3 p-1 rounded-sm items-center",
				item.url === pathName && "bg-accent cursor-default",
			)}
			key={item.label}
			onClick={(e) => {
				if (item.url === pathName) e.preventDefault();
			}}
			to={item.url}
		>
			<item.icon className="mr-5" />
			{item.label}
		</Link>
	);
}

export default function SidebarComponent() {
	const { campaign } = useAuth();
	const pathName = useRouterState({
		select: (state) => state.location.pathname,
	});
	if (campaign === null) return null;
	const campaignOptions: LinkItems = [
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
			<Accordion defaultValue={["campaign"]} type="multiple">
				<AccordionItem value="campaign">
					<AccordionTrigger>
						{campaign.campaign.title.substring(0, 30)}
					</AccordionTrigger>
					<AccordionContent>
						{campaignOptions.map((option) => (
							<LinkComponent
								item={option}
								key={option.label}
								pathName={pathName}
							/>
						))}
					</AccordionContent>
				</AccordionItem>
			</Accordion>
			<LinkComponent
				item={{
					icon: ShapesIcon,
					label: "integrations",
					url: "/campaign/integrations",
				}}
				pathName={pathName}
			/>
			<LinkComponent
				item={{
					icon: Settings,
					label: "settings",
					url: "/campaign/settings",
				}}
				pathName={pathName}
			/>
		</div>
	);
}
