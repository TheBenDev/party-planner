import { useClerk } from "@clerk/clerk-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/hooks/auth";
import { client } from "@/lib/client";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card";

export default function ProfileButtonComponent() {
	const { signOut } = useClerk();
	const { campaign: campaignAuth, user: userAuth } = useAuth();
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
	if (!user) return <div>Must be signed in</div>;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					aria-label="Open profile menu"
					className="rounded-md hover:cursor-pointer"
					type="button"
				>
					{user?.avatar ? (
						<img
							alt="Profile"
							className="rounded-md"
							height={30}
							src={user.avatar}
							width={30}
						/>
					) : (
						<span>{user.firstName ?? "Profile"}</span>
					)}
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="flex flex-col items-center p-0">
				{user.email && (
					<DropdownMenuLabel className="w-full justify-center py-1 mx-1 border-b-[1px] bg-accent">
						{user.email.length > 15 ? (
							<HoverCard>
								<HoverCardTrigger>
									{`${user.email.substring(0, 15)}...`}
								</HoverCardTrigger>
								<HoverCardContent className="flex items-center justify-center h-5 w-auto py-0 px-2 text-xs text-center bg-accent">
									{user.email}
								</HoverCardContent>
							</HoverCard>
						) : (
							user.email
						)}
					</DropdownMenuLabel>
				)}
				<DropdownMenuItem className="w-full justify-center">
					{campaign ? (
						<Link
							className="w-full text-center"
							params={{ campaignId: campaign.id }}
							to="/campaign/$campaignId"
						>
							{campaign.title}
						</Link>
					) : (
						<Link className="w-full text-center" to="/campaign/create">
							Create Campaign
						</Link>
					)}
				</DropdownMenuItem>
				<DropdownMenuItem
					className="w-full justify-center"
					onClick={handleSignOut}
				>
					Sign Out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
