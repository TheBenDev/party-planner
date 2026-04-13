import { useClerk, useUser } from "@clerk/clerk-react";
import { toast } from "sonner";
import { client } from "@/lib/client";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export default function ProfileButtonComponent() {
	const { signOut } = useClerk();
	const { user } = useUser();
	function handleSignOut() {
		try {
			client.user.signOut();
			signOut();
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
					{user?.imageUrl ? (
						<img
							alt="Profile"
							className="rounded-md"
							height={30}
							src={user.imageUrl}
							width={30}
						/>
					) : (
						<span>{user.firstName ?? "Profile"}</span>
					)}
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuItem onClick={handleSignOut}>Sign Out</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
