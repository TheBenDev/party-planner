import type { GetCampaignInvitationByTokenResponse } from "@planner/schemas/member";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Calendar, Loader2, User, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { client } from "@/lib/client";

const searchSchema = z.object({
	token: z.string().min(1),
});

export const Route = createFileRoute("/_authenticated/join")({
	component: JoinCampaignPage,
	validateSearch: searchSchema,
});

// ---- types ---- //

type InvitationStatus = "idle" | "accepting" | "declining" | "error";

// ---- helpers ---- //

function daysUntil(date: Date): number {
	const diff = date.getTime() - Date.now();
	return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// ---- sub-components ---- //

function DetailRow({
	icon: Icon,
	label,
	value,
}: {
	icon: React.ElementType;
	label: string;
	value: string;
}) {
	return (
		<div className="flex items-center gap-3 py-3">
			<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
				<Icon size={14} />
			</div>
			<div className="flex flex-col gap-0.5">
				<span className="text-[11px] uppercase tracking-widest text-muted-foreground">
					{label}
				</span>
				<span className="text-sm font-medium text-foreground">{value}</span>
			</div>
		</div>
	);
}

function DetailRowSkeleton() {
	return (
		<div className="flex items-center gap-3 py-3">
			<Skeleton className="h-8 w-8 shrink-0 rounded-md" />
			<div className="flex flex-col gap-1.5">
				<Skeleton className="h-2.5 w-16" />
				<Skeleton className="h-3.5 w-28" />
			</div>
		</div>
	);
}

function CardHeaderContent({
	isLoading,
	isError,
	campaignTitle,
	sentBy,
}: {
	isLoading: boolean;
	isError: boolean;
	campaignTitle?: string;
	sentBy?: string;
}) {
	if (isLoading) {
		return (
			<>
				<Skeleton className="mx-auto h-8 w-64" />
				<Skeleton className="mx-auto h-5 w-40" />
			</>
		);
	}

	if (isError) {
		return (
			<p className="font-serif text-base text-destructive">
				This invitation is invalid or has expired.
			</p>
		);
	}

	return (
		<>
			<h1 className="font-serif text-2xl font-medium tracking-wide text-foreground">
				{campaignTitle}
			</h1>
			<p className="font-serif text-base italic text-muted-foreground">
				Dungeon Master — {sentBy}
			</p>
		</>
	);
}

function InvitationDetails({
	isLoading,
	isError,
	invitationData,
}: {
	isLoading: boolean;
	isError: boolean;
	invitationData?: GetCampaignInvitationByTokenResponse;
}) {
	if (isLoading) {
		return (
			<>
				<DetailRowSkeleton />
				<Separator className="my-0.5" />
				<DetailRowSkeleton />
				<Separator className="my-0.5" />
				<DetailRowSkeleton />
			</>
		);
	}

	if (isError || !invitationData) {
		return null;
	}

	return (
		<>
			<DetailRow
				icon={User}
				label="Your role"
				value={invitationData.invitation.role}
			/>
			<Separator className="my-0.5" />
			<DetailRow
				icon={Calendar}
				label="Expires"
				value={`${daysUntil(invitationData.invitation.expiresAt)} days`}
			/>
			<Separator className="my-0.5" />
			{invitationData.sentBy && (
				<DetailRow
					icon={Users}
					label="Invited by"
					value={invitationData.sentBy}
				/>
			)}
		</>
	);
}

// ---- page ---- //

export default function JoinCampaignPage() {
	const { token } = Route.useSearch();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [status, setStatus] = useState<InvitationStatus>("idle");
	const [errorMsg, setErrorMsg] = useState("");

	const {
		data: invitationData,
		isLoading,
		isError,
	} = useQuery({
		enabled: !!token,
		queryFn: async () => await client.member.getInvitationByToken({ token }),
		queryKey: ["invitation", token],
	});

	const { mutateAsync: acceptInvitation } = useMutation({
		mutationFn: async () =>
			await client.member.acceptCampaignInvitation({ token }),
		mutationKey: ["invitation", token],
		onError: () => {
			setStatus("error");

			toast.error(
				"Something went wrong accepting the invitation. Please try again.",
			);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["auth", "campaign"] });
			navigate({ to: "/dashboard" });
		},
	});

	const { mutateAsync: declineInvitation } = useMutation({
		mutationFn: async () =>
			await client.member.declineCampaignInvitation({ token }),
		mutationKey: ["invitation", token],
		onError: () => {
			toast.error(
				"Something went wrong declining the invitation. Please try again.",
			);
			setStatus("error");
		},
		onSuccess: () => {
			navigate({ to: "/dashboard" });
		},
	});

	const isActioning = status === "accepting" || status === "declining";

	async function handleAccept() {
		if (!token) {
			setErrorMsg("Invalid invitation link.");
			setStatus("error");
			return;
		}
		setStatus("accepting");
		try {
			await acceptInvitation();
		} catch {
			setErrorMsg("Something went wrong. Please try again.");
			setStatus("error");
		}
	}

	async function handleDecline() {
		if (!token) {
			return;
		}
		setStatus("declining");
		try {
			await declineInvitation();
		} catch {
			setErrorMsg("Something went wrong. Please try again.");
			setStatus("error");
		}
	}

	return (
		<div className="relative flex items-center justify-center overflow-hidden bg-background p-4">
			<div
				aria-hidden="true"
				className="pointer-events-none fixed inset-0 flex select-none items-center justify-center text-[320px] leading-none tracking-tighter text-foreground opacity-[0.03]"
			>
				⚔︎
			</div>

			<Card className="relative w-full max-w-[440px] animate-in fade-in slide-in-from-bottom-4 duration-500">
				<CardHeader className="items-center gap-4 pb-2 text-center">
					<div className="flex flex-col gap-1">
						<p className="text-[11px] uppercase tracking-widest text-muted-foreground">
							You've been invited to join
						</p>
						<CardHeaderContent
							campaignTitle={invitationData?.campaignTitle}
							isError={isError}
							isLoading={isLoading}
							sentBy={invitationData?.sentBy}
						/>
					</div>
				</CardHeader>

				<Separator />

				<CardContent className="py-4">
					<InvitationDetails
						invitationData={invitationData}
						isError={isError}
						isLoading={isLoading}
					/>
				</CardContent>

				<Separator />

				<CardFooter className="flex flex-col gap-3 pt-5">
					{status === "error" && (
						<p className="text-center text-sm text-destructive">{errorMsg}</p>
					)}

					<Button
						className="w-full"
						disabled={isActioning || isLoading || isError}
						onClick={handleAccept}
					>
						{status === "accepting" ? (
							<>
								<Loader2 className="animate-spin" size={14} />
								Joining...
							</>
						) : (
							"Accept invitation"
						)}
					</Button>
					<Button
						className="w-full"
						disabled={isActioning || isLoading || isError}
						onClick={handleDecline}
						variant="outline"
					>
						{status === "declining" ? (
							<>
								<Loader2 className="animate-spin" size={14} />
								Declining...
							</>
						) : (
							"Decline"
						)}
					</Button>

					{!(isLoading || isError) && invitationData && (
						<p className="font-serif text-center text-xs italic text-muted-foreground">
							This invitation expires in{" "}
							{daysUntil(invitationData.invitation.expiresAt)} days
						</p>
					)}
				</CardFooter>
			</Card>
		</div>
	);
}
