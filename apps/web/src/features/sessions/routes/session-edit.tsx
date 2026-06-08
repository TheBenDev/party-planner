import { zodResolver } from "@hookform/resolvers/zod";
import { Status } from "@planner/enums/session";
import { UserRole } from "@planner/enums/user";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate, useNavigate, useParams } from "@tanstack/react-router";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { DateTimePicker } from "@/shared/components/DateTimePicker";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { useAuth } from "@/shared/hooks/auth";
import { useSession } from "@/features/sessions/hooks/useSession";
import { client } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/query-keys";

export const sessionEditSchema = z.object({
	description: z.string().optional(),
	startsAt: z.date().optional(),
	title: z.string().min(1),
});

export type SessionEditForm = z.infer<typeof sessionEditSchema>;

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

function toDate(value: Date | string | null | undefined): Date | undefined {
	if (!value) return undefined;
	if (typeof value === "string") return new Date(value);
	return value;
}

function SessionEditFormInner({
	session,
	sessionId,
}: {
	session: Session;
	sessionId: string;
}) {
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	const form = useForm<SessionEditForm>({
		defaultValues: {
			description: session.description ?? "",
			startsAt: toDate(session.startsAt),
			title: session.title,
		},
		resolver: zodResolver(sessionEditSchema),
	});

	const updateMutation = useMutation({
		mutationFn: (values: SessionEditForm) => {
			let status = session.status;
			if (values.startsAt !== undefined) status = Status.CONFIRMED;
			return client.session.updateSession({
				id: sessionId,
				status,
				...values,
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.sessions.detail(sessionId),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.sessions.list(session.campaignId),
			});
			navigate({
				params: { sessionId },
				to: "/campaign/sessions/$sessionId",
			});
		},
	});

	return (
		<form
			className="max-w-3xl mx-auto px-4 py-8 space-y-6"
			onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))}
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
				<Label>Date &amp; Time</Label>
				<Controller
					control={form.control}
					name="startsAt"
					render={({ field }) => (
						<DateTimePicker
							minDate={new Date()}
							onChange={field.onChange}
							value={field.value}
						/>
					)}
				/>
			</div>

			<div className="space-y-2">
				<Label>Description</Label>
				<Textarea
					{...form.register("description")}
					placeholder="Describe the session..."
				/>
			</div>

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
				<Button disabled={updateMutation.isPending} type="submit">
					Save Changes
				</Button>
			</div>
		</form>
	);
}
