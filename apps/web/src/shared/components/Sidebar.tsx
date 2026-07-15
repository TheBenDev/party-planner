import { Link, useRouterState } from "@tanstack/react-router";
import {
	Activity,
	Castle,
	Compass,
	Map as Location,
	Settings,
	ShapesIcon,
	User,
} from "lucide-react";
import { useAuth } from "@/shared/hooks/auth";
import { cn } from "@/shared/lib/utils";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "./ui/accordion";

export default function Sidebar() {
	const { campaign, colonyId } = useAuth();
	const pathName = useRouterState({
		select: (state) => state.location.pathname,
	});

	if (!campaign?.campaign?.title) return null;

	const campaignOptions: LinkItems = [
		...(colonyId
			? [
					{
						icon: Castle,
						label: "colony",
						params: { colonyId },
						url: "/campaign/colony/$colonyId",
					} satisfies LinkItem,
				]
			: []),
		{ icon: User, label: "npcs", url: "/campaign/npcs" },
		{
			icon: Location,
			label: "locations",
			matchPrefix: true,
			url: "/campaign/regions",
		},
		{ icon: Compass, label: "quests", url: "/campaign/quests" },
		{ icon: Activity, label: "sessions", url: "/campaign/sessions" },
	];
	return (
		<div className="flex flex-col w-56 h-full border-r border-muted-foreground/20 px-3 py-5 space-y-1">
			<Accordion defaultValue={["campaign"]} type="multiple">
				<AccordionItem className="border-none" value="campaign">
					<div className="flex items-center px-2 py-1.5">
						<Link className="flex-1 text-sm font-medium" to="/campaign">
							{campaign.campaign.title.substring(0, 30)}
						</Link>
						<AccordionTrigger className="p-0 hover:no-underline" />
					</div>
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
	matchPrefix?: boolean;
	url: string;
	icon: React.ComponentType<{ className?: string }>;
	params?: { colonyId: string | undefined };
}
type LinkItems = LinkItem[];

function LinkComponent({
	item,
	pathName,
}: {
	item: LinkItem;
	pathName: string;
}) {
	const isActive = item.matchPrefix
		? pathName.startsWith(item.url)
		: item.url === pathName;
	return (
		<Link
			activeOptions={{ exact: !item.matchPrefix }}
			className={cn(
				"flex items-center gap-3 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
				isActive && "bg-accent text-foreground cursor-default font-medium",
			)}
			key={item.label}
			onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
				if (item.url === pathName) e.preventDefault();
			}}
			params={item.params ? { ...item.params } : undefined}
			to={item.url}
		>
			<item.icon className="h-4 w-4 shrink-0" />
			{item.label}
		</Link>
	);
}
