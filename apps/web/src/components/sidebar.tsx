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

export default function SidebarComponent() {
	const { campaign } = useAuth();
	const pathName = useRouterState({
		select: (state) => state.location.pathname,
	});

	if (!campaign?.campaign?.title) return null;

	const campaignOptions: LinkItems = [
		{ icon: User, label: "npcs", url: "/campaign/npcs" },
		{ icon: Location, label: "locations", url: "/campaign/locations" },
		{ icon: Compass, label: "quests", url: "/campaign/quests" },
		{ icon: Activity, label: "sessions", url: "/campaign/sessions" },
	];

	return (
		<div className="flex flex-col w-56 h-full border-r border-muted-foreground/20 px-3 py-5 space-y-1">
			<Accordion defaultValue={["campaign"]} type="multiple">
				<AccordionItem className="border-none" value="campaign">
					<AccordionTrigger className="px-2 py-1.5 text-sm font-medium hover:no-underline">
						{campaign.campaign.title.substring(0, 30)}
					</AccordionTrigger>
					<AccordionContent className="pb-1 space-y-1">
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

			<div className="border-t border-muted-foreground/20 pt-1 space-y-1">
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
		</div>
	);
}

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
			activeOptions={{ exact: true }}
			className={cn(
				"flex items-center gap-3 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
				item.url === pathName &&
					"bg-accent text-foreground cursor-default font-medium",
			)}
			key={item.label}
			onClick={(e) => {
				if (item.url === pathName) e.preventDefault();
			}}
			to={item.url}
		>
			<item.icon className="h-4 w-4 shrink-0" />
			{item.label}
		</Link>
	);
}
