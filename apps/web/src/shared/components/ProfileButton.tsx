import { useClerk } from "@clerk/clerk-react";
import { Link } from "@tanstack/react-router";
import { Castle, ChevronDown, Moon, Settings, Sun } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/shared/hooks/auth";
import { client } from "@/shared/lib/client";
import { useTheme } from "../hooks/theme";
import { Button } from "./ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card";
import { Skeleton } from "./ui/skeleton";

export default function ProfileButton() {
	const { signOut } = useClerk();
	const { theme, toggleTheme } = useTheme();
	const { campaign: campaignAuth, user: userAuth, userIsLoading } = useAuth();
	const user = userAuth?.user;
	const campaign = campaignAuth?.campaign;
	async function handleSignOut() {
		try {
			await client.user.signOut();
			await signOut({ redirectUrl: "/" });
		} catch {
			toast.error("Something went wrong when trying to sign out");
		}
	}
	if (userIsLoading)
		return (
			<div className="flex items-center space-x-4">
				<Skeleton className="h-8 w-8 rounded-full bg-muted-foreground/20" />
			</div>
		);
	if (!user) return null;

	return (
		<div className="flex items-center">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						aria-label="Open profile menu"
						className="group flex items-center gap-1 cursor-pointer mr-3 focus:outline-none"
						type="button"
					>
						{user.avatar ? (
							<img
								alt="Profile"
								className="rounded-full"
								height={30}
								src={user.avatar}
								width={30}
							/>
						) : (
							<span>
								{user.firstName ?? "Profile"} {user.lastName}
							</span>
						)}
						<ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent className="flex flex-col p-0 min-w-48">
					{user.email && (
						<DropdownMenuLabel className="w-full text-start border-b-[1px] bg-accent text-xs">
							{user.email.length > 26 ? (
								<HoverCard>
									<HoverCardTrigger>
										{`${user.email.substring(0, 25)}...`}
									</HoverCardTrigger>
									<HoverCardContent className="flex items-center justify-center h-5 w-auto py-0 text-xs text-center bg-accent">
										{user.email}
									</HoverCardContent>
								</HoverCard>
							) : (
								user.email
							)}
						</DropdownMenuLabel>
					)}
					<DropdownMenuCheckboxItem
						checked={theme === "dark"}
						className="w-full text-lg"
						onCheckedChange={toggleTheme}
						onSelect={(e) => e.preventDefault()}
					>
						{theme === "dark" ? (
							<Sun className="h-3 w-3 text-primary" />
						) : (
							<Moon className="h-3 w-3 text-primary" />
						)}
						Dark Mode
					</DropdownMenuCheckboxItem>
					<DropdownMenuItem className="w-full text-lg">
						<Castle className="h-3 w-3 text-primary" />
						{campaign ? (
							<Link className="w-full text-left" to="/campaign">
								{campaign.title}
							</Link>
						) : (
							<Link className="w-full text-left" to="/campaign/create">
								Create Campaign
							</Link>
						)}
					</DropdownMenuItem>
					<DropdownMenuItem className="w-full text-lg">
						<Settings className="h-3 w-3 text-primary" />
						<Link
							className="w-full text-left flex items-center gap-2"
							to="/settings"
						>
							Profile Settings
						</Link>
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						className="w-full bg-accent"
						onClick={handleSignOut}
					>
						<Button className="w-full text-xl bg-accent text-primary hover:bg-accent">
							Sign Out
						</Button>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
