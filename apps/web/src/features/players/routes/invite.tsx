import { UserRole } from "@planner/enums/user";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "@tanstack/react-router";
import { CheckCircle, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { Separator } from "@/shared/components/ui/separator";
import { useAuth } from "@/shared/hooks/auth";
import { client } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/query-keys";

interface CampaignRole {
	style: string;
	label: string;
	value: UserRole;
}
type CampaignRoles = CampaignRole[];
const campaignRoles: CampaignRoles = [
	{
		label: "Player",
		style: "bg-emerald-500",
		value: UserRole.PLAYER,
	},
	{
		label: "Dungeon Master",
		style: "bg-violet-500",
		value: UserRole.DUNGEON_MASTER,
	},
];

function timeAgo(date: Date): string {
	const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
	if (days === 0) return "today";
	if (days === 1) return "yesterday";
	return `${days} days ago`;
}

export function InvitePlayerPage() {
	const queryClient = useQueryClient();
	const { role: authRole, campaignIsLoading } = useAuth();

	const [email, setEmail] = useState("");
	const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.PLAYER);
	const [successEmail, setSuccessEmail] = useState<string | null>(null);

	const { data: pendingInvites } = useQuery({
		queryFn: async () => await client.member.listInvitations(),
		queryKey: queryKeys.invitations.list(),
	});

	const { mutate: revokeInvitation } = useMutation({
		mutationFn: async (id: string) =>
			await client.member.revokeInvitation({ id }),
		mutationKey: ["invitation"],
		onError: () => {
			toast.error(
				"Something went wrong trying to revoke invitation. Please try again.",
			);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.invitations.list() });
		},
	});
	const { mutate: sendInvitation, isPending: sendInvitationIsPending } =
		useMutation({
			mutationFn: async () =>
				await client.member.createInvitation({
					inviteeEmail: email.trim(),
					role: selectedRole,
				}),
			mutationKey: ["invitation"],
			onError: (err) => {
				// TODO: improve error handling for toasts
				if (err.message === "[already_exists] campaign user already exists") {
					toast.error("This player is already in the campaign.");
					return;
				}
				toast.error(
					"Something went wrong trying to send invitation. Please try again.",
				);
			},
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: queryKeys.invitations.list(),
				});
				setSuccessEmail(email.trim());
				setEmail("");
				setSelectedRole(UserRole.PLAYER);
			},
		});

	if (campaignIsLoading) return <div>loading...</div>;
	if (authRole !== UserRole.DUNGEON_MASTER) {
		return <Navigate to="/campaign/settings" />;
	}

	const isValid = z.email().safeParse(email.trim()).success;

	function handleReset() {
		setEmail("");
		setSelectedRole(UserRole.PLAYER);
		setSuccessEmail(null);
	}

	function handleSend() {
		sendInvitation();
	}

	function handleRevoke(id: string) {
		revokeInvitation(id);
	}

	return (
		<div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
			{/* Header */}
			<div className="space-y-1">
				<h1 className="font-cinzel text-2xl font-medium tracking-wide">
					Invite to campaign
				</h1>
			</div>

			{/* Success banner */}
			{successEmail && (
				<div className="flex items-center gap-3 px-4 py-3 rounded-md border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
					<CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
					<p className="text-sm text-green-700 dark:text-green-300">
						Invitation sent to {successEmail}.
					</p>
					<button
						className="ml-auto text-green-500 hover:text-green-700 dark:hover:text-green-300 transition-colors"
						onClick={() => setSuccessEmail(null)}
						type="button"
					>
						<X className="w-3.5 h-3.5" />
					</button>
				</div>
			)}

			{/* Form card */}
			<Card>
				<CardHeader>
					<CardTitle className="font-cinzel text-base font-medium tracking-wide">
						New invitation
					</CardTitle>
					<CardDescription className="italic font-crimson font-light">
						The invite link expires after 7 days.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Email */}
					<div className="space-y-1.5">
						<Label
							className="font-cinzel text-[11px] tracking-widest uppercase"
							htmlFor="invite-email"
						>
							Email address
						</Label>
						<Input
							id="invite-email"
							onChange={(e) => setEmail(e.target.value)}
							placeholder="player@example.com"
							type="email"
							value={email}
						/>
						<p className="text-xs italic text-muted-foreground font-crimson">
							They'll receive an email with a link to join.
						</p>
					</div>

					{/* Role */}
					<div className="space-y-2">
						<Label className="font-cinzel text-[11px] tracking-widest uppercase">
							Role
						</Label>
						<RadioGroup
							className="grid grid-cols-2 gap-3"
							onValueChange={(v) => setSelectedRole(v as UserRole)}
							value={selectedRole}
						>
							{campaignRoles.map((opt) => (
								<Label
									className={[
										"flex flex-col justify-center gap-1 rounded-lg border p-3.5 cursor-pointer transition-colors",
										selectedRole === opt.value
											? "border-foreground/40 bg-muted"
											: "border-border hover:bg-muted/50",
									].join(" ")}
									htmlFor={`role-${opt.value}`}
									key={opt.value}
								>
									<RadioGroupItem
										className="sr-only"
										id={`role-${opt.value}`}
										value={opt.value}
									/>
									<span className="flex items-center justify-center gap-2 font-cinzel text-[11px] tracking-wide font-medium sm:justify-start">
										<span
											className={`w-2 h-2 rounded-full shrink-0 ${opt.style}`}
										/>
										{opt.label}
									</span>
								</Label>
							))}
						</RadioGroup>
					</div>

					{/* Actions */}
					<div className="flex justify-end gap-2 pt-1">
						<Button onClick={handleReset} type="button" variant="outline">
							Cancel
						</Button>
						<Button
							disabled={!isValid || sendInvitationIsPending}
							onClick={handleSend}
							type="button"
						>
							Send invitation
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Pending invitations */}
			{pendingInvites?.invitations && pendingInvites.invitations.length > 0 && (
				<div className="space-y-3">
					<div className="flex items-center gap-3">
						<Separator className="flex-1" />
						<span className="font-cinzel text-[11px] tracking-widest text-muted-foreground uppercase shrink-0">
							Pending invitations
						</span>
						<Separator className="flex-1" />
					</div>

					<div className="space-y-2">
						{pendingInvites.invitations.map((invite) => (
							<div
								className="flex items-center gap-3 px-4 py-3 rounded-lg bg-muted/50 border border-border"
								key={invite.id}
							>
								<div className="w-8 h-8 rounded-full border border-border bg-background flex items-center justify-center font-cinzel text-[10px] text-muted-foreground shrink-0">
									{invite.inviteeEmail.slice(0, 2).toUpperCase()}
								</div>
								<div className="flex-1 min-w-0">
									<p className="text-sm truncate text-foreground">
										{invite.inviteeEmail}
									</p>
									<p className="text-xs italic text-muted-foreground font-crimson">
										{invite.role === UserRole.DUNGEON_MASTER
											? "Dungeon master"
											: "Player"}{" "}
										· Sent {timeAgo(invite.createdAt)}
									</p>
								</div>
								<Badge
									className="font-cinzel text-[10px] tracking-wide shrink-0"
									variant="outline"
								>
									Pending
								</Badge>
								<button
									aria-label="Revoke invitation"
									className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
									onClick={() => handleRevoke(invite.id)}
									type="button"
								>
									<X className="w-3.5 h-3.5" />
								</button>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
