import { UserRole } from "@planner/enums/user";
import type { CampaignInvitation } from "@planner/schemas/member";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { client } from "@/lib/client";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function timeAgo(date: Date): string {
	const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
	if (days === 0) return "today";
	if (days === 1) return "yesterday";
	return `${days} days ago`;
}

export const Route = createFileRoute("/_authenticated/campaign/invite/")({
	component: InvitePlayerPage,
});

export function InvitePlayerPage() {
	const [email, setEmail] = useState("");
	const [role, setRole] = useState<UserRole>(UserRole.PLAYER);
	const [pending, setPending] = useState<CampaignInvitation[]>([]);
	const [successEmail, setSuccessEmail] = useState<string | null>(null);

	const { data: pendingInvites, isLoading: isLoadingInvites } = useQuery({
		queryFn: async () => await client.member.listInvitations(),
		queryKey: ["invitation"],
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
		onSuccess: (inv) => {
			setPending((prev) => prev.filter((i) => i.id !== inv.invitation.id));
		},
	});
	const { mutate: sendInvitation, isPending: sendInvitationIsPending } =
		useMutation({
			mutationFn: async () =>
				await client.member.createInvitation({ inviteeEmail: email, role }),
			mutationKey: ["invitation"],
			onError: (err) => {
				// TODO: improve error handling for toasts
				if (err.message === "[already_exists] campaign user already exists") {
					toast.error("This player is already in the campaign.");
					return;
				}
				if (
					err.message === "[already_exists] campaign invitation already exists"
				) {
					toast.error("This player already has a pending invitation.");
					return;
				}
				toast.error(
					"Something went wrong trying to send invitation. Please try again.",
				);
			},
			onSuccess: (inv) => {
				setSuccessEmail(email.trim());
				setEmail("");
				setRole(UserRole.PLAYER);
				setPending((prev) => [inv.invitation, ...prev]);
			},
		});

	useEffect(() => {
		if (isLoadingInvites) return;
		if (pendingInvites?.invitations) setPending(pendingInvites?.invitations);
	}, [pendingInvites]);

	const isValid = EMAIL_REGEX.test(email.trim());

	function handleReset() {
		setEmail("");
		setRole(UserRole.PLAYER);
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
							onValueChange={(v) => setRole(v as UserRole)}
							value={role}
						>
							{(
								[
									{
										desc: "Controls a character, participates in the adventure",
										dot: "bg-emerald-500",
										label: "Player",
										value: UserRole.PLAYER,
									},
									{
										desc: "Co-DM with full campaign edit access",
										dot: "bg-violet-500",
										label: "Dungeon master",
										value: UserRole.DUNGEON_MASTER,
									},
								] as const
							).map((opt) => (
								<Label
									className={[
										"flex flex-col gap-1 rounded-lg border p-3.5 cursor-pointer transition-colors",
										role === opt.value
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
									<span className="flex items-center gap-2 font-cinzel text-[11px] tracking-wide font-medium">
										<span
											className={`w-2 h-2 rounded-full shrink-0 ${opt.dot}`}
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
			{pending.length > 0 && (
				<div className="space-y-3">
					<div className="flex items-center gap-3">
						<Separator className="flex-1" />
						<span className="font-cinzel text-[11px] tracking-widest text-muted-foreground uppercase shrink-0">
							Pending invitations
						</span>
						<Separator className="flex-1" />
					</div>

					<div className="space-y-2">
						{pending.map((invite) => (
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
