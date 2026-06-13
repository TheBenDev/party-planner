import { UserRole } from "@planner/enums/user";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { UserPlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { CampaignUserWithUser } from "@/features/players/types";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Textarea } from "@/shared/components/ui/textarea";
import { useAuth } from "@/shared/hooks/auth";
import { client } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/query-keys";

const TRAILING_COMMA_RE = /,$/;

export function SettingsPage() {
	const { campaign, user, role } = useAuth();
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const isDm = role === UserRole.DUNGEON_MASTER;

	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [tags, setTags] = useState<string[]>([]);
	const [tagInput, setTagInput] = useState("");

	useEffect(() => {
		if (campaign) {
			setTitle(campaign.campaign.title);
			setDescription(campaign.campaign.description ?? "");
			setTags(campaign.campaign.tags);
		}
	}, [campaign]);

	const {
		data: membersData,
		isLoading: membersLoading,
		isError: membersError,
	} = useQuery({
		enabled: Boolean(campaign),
		queryFn: () => {
			if (!campaign) throw new Error("campaign required");
			return client.member.listMembersByCampaign({
				campaignId: campaign.campaign.id,
			});
		},
		queryKey: queryKeys.members.list(campaign?.campaign.id ?? ""),
	});

	const { mutate: updateCampaign, isPending: updatingCampaign } = useMutation({
		mutationFn: () => {
			if (!campaign) throw new Error("campaign required");
			return client.campaign.updateCampaign({
				description: description || undefined,
				id: campaign.campaign.id,
				tags,
				title,
			});
		},
		onError: () => toast.error("Failed to update campaign"),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: queryKeys.auth.campaign(),
			});
			toast.success("Campaign updated");
		},
	});

	const { mutate: removeMember, isPending: removingMember } = useMutation({
		mutationFn: (userId: string) => {
			if (!campaign) throw new Error("campaign required");
			return client.member.removeMember({
				campaignId: campaign.campaign.id,
				userId,
			});
		},
		onError: () => toast.error("Failed to remove member"),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: queryKeys.members.list(campaign?.campaign.id ?? ""),
			});
			toast.success("Member removed");
		},
	});

	const { mutate: deleteCampaign, isPending: deletingCampaign } = useMutation({
		mutationFn: () => {
			if (!campaign) throw new Error("campaign required");
			return client.campaign.deleteCampaign({ id: campaign.campaign.id });
		},
		onError: () => toast.error("Failed to delete campaign"),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: queryKeys.auth.campaign(),
			});
			toast.success("Campaign deleted");
			navigate({ to: "/" });
		},
	});

	if (!campaign) {
		return (
			<div className="flex flex-col space-y-3 justify-center items-center py-20">
				<span className="text-muted-foreground font-crimson italic">
					No active campaign
				</span>
				<Button onClick={() => navigate({ to: "/campaign/create" })}>
					Create campaign
				</Button>
			</div>
		);
	}

	function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === "Enter" || e.key === ",") {
			e.preventDefault();
			const tag = tagInput.trim().replace(TRAILING_COMMA_RE, "");
			if (tag && !tags.includes(tag)) {
				setTags([...tags, tag]);
			}
			setTagInput("");
		}
	}

	return (
		<div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
			<div className="space-y-1">
				<h1 className="font-cinzel text-2xl font-medium tracking-wide">
					Settings
				</h1>
				<p className="text-sm text-muted-foreground font-crimson italic">
					Manage your campaign configuration and members.
				</p>
			</div>

			{isDm && (
				<Card>
					<CardHeader>
						<CardTitle className="font-cinzel text-base font-medium tracking-wide">
							Campaign details
						</CardTitle>
						<CardDescription className="italic font-crimson font-light">
							Update your campaign's title, description, and tags.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-5">
						<div className="space-y-1.5">
							<Label
								className="font-cinzel text-[11px] tracking-widest uppercase"
								htmlFor="campaign-title"
							>
								Title
							</Label>
							<Input
								id="campaign-title"
								onChange={(e) => setTitle(e.target.value)}
								placeholder="Campaign title"
								value={title}
							/>
						</div>

						<div className="space-y-1.5">
							<Label
								className="font-cinzel text-[11px] tracking-widest uppercase"
								htmlFor="campaign-description"
							>
								Description
							</Label>
							<Textarea
								className="resize-none"
								id="campaign-description"
								onChange={(e) => setDescription(e.target.value)}
								placeholder="What is this campaign about?"
								rows={3}
								value={description}
							/>
						</div>

						<div className="space-y-1.5">
							<Label className="font-cinzel text-[11px] tracking-widest uppercase">
								Tags
							</Label>
							<div className="flex flex-wrap gap-1.5 min-h-[2.5rem] px-3 py-2 border rounded-md bg-background focus-within:ring-1 focus-within:ring-ring">
								{tags.map((tag) => (
									<Badge
										className="gap-1 pr-1 font-normal font-crimson"
										key={tag}
										variant="secondary"
									>
										{tag}
										<button
											aria-label={`Remove ${tag}`}
											className="hover:text-destructive transition-colors rounded"
											onClick={() => setTags(tags.filter((t) => t !== tag))}
											type="button"
										>
											<X className="w-3 h-3" />
										</button>
									</Badge>
								))}
								<input
									className="flex-1 min-w-[8rem] text-sm bg-transparent outline-none placeholder:text-muted-foreground"
									onChange={(e) => setTagInput(e.target.value)}
									onKeyDown={handleTagKeyDown}
									placeholder={
										tags.length === 0
											? "Add tags (press Enter)..."
											: "Add tag..."
									}
									value={tagInput}
								/>
							</div>
							<p className="text-xs italic text-muted-foreground font-crimson">
								Press Enter or comma to add a tag.
							</p>
						</div>

						<div className="flex justify-end pt-1">
							<Button
								disabled={!title.trim() || updatingCampaign}
								onClick={() => updateCampaign()}
							>
								Save changes
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader>
					<CardTitle className="font-cinzel text-base font-medium tracking-wide">
						Members
					</CardTitle>
					<CardDescription className="italic font-crimson font-light">
						{membersData
							? `${membersData.members.length} member${membersData.members.length !== 1 ? "s" : ""} in this campaign.`
							: "View and manage campaign members."}
					</CardDescription>
					{isDm && (
						<CardAction>
							<Button
								onClick={() => navigate({ to: "/campaign/settings/invite" })}
								size="sm"
								variant="outline"
							>
								<UserPlus className="w-3.5 h-3.5 mr-1.5" />
								Invite
							</Button>
						</CardAction>
					)}
				</CardHeader>
				<CardContent className="space-y-1">
					{membersError && (
						<div className="px-3 py-2 text-sm text-destructive flex items-center justify-between gap-3">
							<span>Failed to load members.</span>
						</div>
					)}
					{membersLoading &&
						Array.from({ length: 3 }).map((_, i) => (
							<div className="flex items-center gap-3 px-3 py-2.5" key={i}>
								<Skeleton className="w-9 h-9 rounded-full shrink-0" />
								<div className="flex-1 space-y-1.5">
									<Skeleton className="h-3.5 w-32" />
									<Skeleton className="h-3 w-20" />
								</div>
							</div>
						))}
					{!membersLoading &&
						// TODO: Paginate members in the future
						membersData?.members.map((member) => (
							<MemberRow
								currentUserId={user?.user.id}
								isDm={isDm}
								isRemoving={removingMember}
								key={member.userId}
								member={member}
								onKick={() => removeMember(member.userId)}
							/>
						))}
				</CardContent>
			</Card>

			{isDm && (
				<Card className="border-destructive/40">
					<CardHeader>
						<CardTitle className="font-cinzel text-base font-medium tracking-wide text-destructive">
							Danger zone
						</CardTitle>
						<CardDescription className="italic font-crimson font-light">
							Permanent actions that cannot be undone.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex items-center justify-between gap-4">
							<div>
								<p className="text-sm font-medium">Delete campaign</p>
								<p className="text-xs text-muted-foreground mt-0.5 font-crimson italic">
									Soft-deletes the campaign — it can be restored later.
								</p>
							</div>
							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button size="sm" variant="destructive">
										Delete
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle className="font-cinzel tracking-wide">
											Archive campaign?
										</AlertDialogTitle>
										<AlertDialogDescription className="font-crimson italic">
											This will archive{" "}
											<span className="font-semibold not-italic text-foreground">
												{campaign.campaign.title}
											</span>
											. The campaign is soft-deleted and can be restored later
											if needed.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>Cancel</AlertDialogCancel>
										<AlertDialogAction
											className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
											disabled={deletingCampaign}
											onClick={() => deleteCampaign()}
										>
											Delete campaign
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

function MemberRow({
	member,
	currentUserId,
	isDm,
	isRemoving,
	onKick,
}: {
	member: CampaignUserWithUser;
	currentUserId: string | undefined;
	isDm: boolean;
	isRemoving: boolean;
	onKick: () => void;
}) {
	const isCurrentUser = member.userId === currentUserId;
	const initials = member.userId.slice(0, 2).toUpperCase();

	return (
		<div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/40 transition-colors">
			<div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center font-cinzel text-[11px] text-muted-foreground shrink-0 border border-border">
				{initials}
			</div>
			<div className="flex-1 min-w-0">
				<p className="text-sm font-medium truncate">
					{isCurrentUser ? "You" : `Member ${member.email}`}
				</p>
				<p className="text-xs text-muted-foreground font-crimson italic">
					{member.role === UserRole.DUNGEON_MASTER
						? "Dungeon master"
						: "Player"}
				</p>
			</div>
			{isCurrentUser && (
				<Badge
					className="font-cinzel text-[10px] tracking-wide shrink-0"
					variant="outline"
				>
					You
				</Badge>
			)}
			{isDm && !isCurrentUser && (
				<button
					aria-label="Remove member"
					className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
					disabled={isRemoving}
					onClick={onKick}
					type="button"
				>
					<X className="w-3.5 h-3.5" />
				</button>
			)}
		</div>
	);
}
