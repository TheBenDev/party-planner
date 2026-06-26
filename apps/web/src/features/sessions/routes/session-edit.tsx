import { zodResolver } from "@hookform/resolvers/zod";
import { UserRole } from "@planner/enums/user";
import { Navigate, useNavigate, useParams } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useSession } from "@/features/sessions/hooks/useSession";
import { useSessionData } from "@/features/sessions/hooks/useSessionData";
import {
	type SessionEditForm,
	SessionEditSchema,
} from "@/features/sessions/types";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { useAuth } from "@/shared/hooks/auth";
import type { client } from "@/shared/lib/client";

export function SessionEditPage() {
	const { sessionId } = useParams({
		from: "/_authenticated/campaign/sessions/$sessionId/edit",
	});
	const { role, campaignIsLoading } = useAuth();

	const { data, isPending, isError } = useSession(sessionId);

	if (campaignIsLoading) return <div>Loading...</div>;
	if (role !== UserRole.DUNGEON_MASTER) {
		return (
			<Navigate
				params={{ sessionId }}
				replace
				to="/campaign/sessions/$sessionId"
			/>
		);
	}

	if (isPending) return <div>Loading...</div>;
	if (isError || !data?.session) return <div>Session not found.</div>;

	return <SessionEditFormInner session={data.session} sessionId={sessionId} />;
}

type Session = NonNullable<
	Awaited<ReturnType<typeof client.session.getSession>>["session"]
>;

function SessionEditFormInner({
	session,
	sessionId,
}: {
	session: Session;
	sessionId: string;
}) {
	const { updateSession } = useSessionData();
	const navigate = useNavigate();
	const isPast = new Date(session.startsAt) < new Date();

	const form = useForm<SessionEditForm>({
		defaultValues: {
			description: session.description ?? "",
			recap: session.recap ?? "",
			title: session.title,
		},
		resolver: zodResolver(SessionEditSchema),
	});

	return (
		<form
			className="max-w-3xl mx-auto px-4 py-8 space-y-6"
			onSubmit={form.handleSubmit((data) =>
				updateSession.mutate(
					{
						description: data.description,
						id: sessionId,
						recap: data.recap,
						title: data.title,
					},
					{
						onError: () => toast.error("Failed to update session."),

						onSuccess: () =>
							navigate({
								params: { sessionId },
								to: "/campaign/sessions/$sessionId",
							}),
					},
				),
			)}
		>
			<div>
				<h1 className="text-2xl font-semibold">Edit Session</h1>
				<p className="text-sm text-muted-foreground">Update session details</p>
			</div>

			<div className="space-y-2">
				<Label>Title</Label>
				<Input {...form.register("title")} />
			</div>

			<div className="space-y-2">
				<Label>Description</Label>
				<Textarea
					{...form.register("description")}
					placeholder="Describe the session..."
				/>
			</div>

			{isPast && (
				<div className="space-y-2">
					<Label>Session Recap</Label>
					<Textarea
						{...form.register("recap")}
						placeholder="Write a recap of what happened in this session..."
						rows={6}
					/>
				</div>
			)}

			<div className="flex justify-end gap-2 pt-4">
				<Button
					onClick={() =>
						navigate({
							params: { sessionId },
							to: "/campaign/sessions/$sessionId",
						})
					}
					type="button"
					variant="outline"
				>
					Cancel
				</Button>
				<Button disabled={updateSession.isPending} type="submit">
					Save Changes
				</Button>
			</div>
		</form>
	);
}
