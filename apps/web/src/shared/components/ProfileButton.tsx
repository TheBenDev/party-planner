import { useClerk } from "@clerk/clerk-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/shared/hooks/auth";
import { client } from "@/shared/lib/client";
import ThemeSwitch from "./ThemeSwitch";
import {
	DropdownMenu,
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
						className="hover:cursor-pointer mr-3"
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
							<span>{user.firstName ?? "Profile"}</span>
						)}
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent className="flex flex-col p-0">
					{user.email && (
						<DropdownMenuLabel className="w-full text-start border-b-[1px] bg-accent text-xs">
							{user.email.length > 15 ? (
								<HoverCard>
									<HoverCardTrigger>
										{`${user.email.substring(0, 15)}...`}
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
					<DropdownMenuItem className="w-full">
						{campaign ? (
							<Link className="w-full text-left text-sm" to="/campaign">
								{campaign.title}
							</Link>
						) : (
							<Link className="w-full text-left text-sm" to="/campaign/create">
								Create Campaign
							</Link>
						)}
					</DropdownMenuItem>
					<DropdownMenuItem className="w-full">
						<Link
							className="w-full text-left text-sm flex items-center gap-2"
							to="/settings"
						>
							Settings
						</Link>
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem className="w-full text-sm" onClick={handleSignOut}>
						Sign Out
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<ThemeSwitch id="theme" />
		</div>
	);
}
