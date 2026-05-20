import { zodResolver } from "@hookform/resolvers/zod";
import { Status } from "@planner/enums/session";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { client } from "@/lib/client";
import { cn } from "@/lib/utils";

export const sessionEditSchema = z.object({
	description: z.string().optional(),
	startsAt: z.date().optional(),
	title: z.string().min(1),
});

export type SessionEditForm = z.infer<typeof sessionEditSchema>;

export const Route = createFileRoute(
	"/_authenticated/campaign/sessions/$sessionId/edit",
)({
	component: RouteComponent,
});

function RouteComponent() {
	const { sessionId } = Route.useParams();

	const { data, isPending, isError } = useQuery({
		queryFn: () => client.session.getSession({ id: sessionId }),
		queryKey: ["session", sessionId],
	});

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

type TimeSegment = "hour" | "minute" | "ampm";

function applyTimeChange(
	current: Date | undefined,
	type: TimeSegment,
	value: string,
): Date {
	const base = current ? new Date(current) : new Date();

	if (type === "hour") {
		const hour = Number.parseInt(value, 10);
		const isPm = base.getHours() >= 12;
		let hours24 = hour % 12;
		if (isPm) hours24 += 12;
		base.setHours(hours24);
		return base;
	}

	if (type === "minute") {
		base.setMinutes(Number.parseInt(value, 10));
		return base;
	}

	// ampm
	const hours = base.getHours();
	if (value === "AM" && hours >= 12) base.setHours(hours - 12);
	if (value === "PM" && hours < 12) base.setHours(hours + 12);
	return base;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1).reverse();
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const AMPM = ["AM", "PM"] as const;

function DateTimePicker({
	value,
	onChange,
}: {
	value: Date | undefined;
	onChange: (date: Date | undefined) => void;
}) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					className={cn(
						"w-full justify-start text-left font-normal",
						!value && "text-muted-foreground",
					)}
					type="button"
					variant="outline"
				>
					<CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-50" />
					{value ? (
						format(value, "MM/dd/yyyy hh:mm aa")
					) : (
						<span>MM/DD/YYYY hh:mm aa</span>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0">
				<div className="sm:flex">
					<Calendar
						mode="single"
						onSelect={(day) => {
							if (!day) return;
							const base = value ? new Date(value) : new Date();
							base.setFullYear(
								day.getFullYear(),
								day.getMonth(),
								day.getDate(),
							);
							onChange(base);
						}}
						selected={value}
					/>
					<div className="flex flex-col sm:flex-row sm:h-[300px] divide-y sm:divide-y-0 sm:divide-x">
						<ScrollArea className="w-64 sm:w-auto">
							<div className="flex sm:flex-col p-2">
								{HOURS.map((hour) => (
									<Button
										className="sm:w-full shrink-0 aspect-square"
										key={hour}
										onClick={() =>
											onChange(applyTimeChange(value, "hour", hour.toString()))
										}
										size="icon"
										type="button"
										variant={
											value && value.getHours() % 12 === hour % 12
												? "default"
												: "ghost"
										}
									>
										{hour}
									</Button>
								))}
							</div>
							<ScrollBar className="sm:hidden" orientation="horizontal" />
						</ScrollArea>

						<ScrollArea className="w-64 sm:w-auto">
							<div className="flex sm:flex-col p-2">
								{MINUTES.map((minute) => (
									<Button
										className="sm:w-full shrink-0 aspect-square"
										key={minute}
										onClick={() =>
											onChange(
												applyTimeChange(value, "minute", minute.toString()),
											)
										}
										size="icon"
										type="button"
										variant={
											value && value.getMinutes() === minute
												? "default"
												: "ghost"
										}
									>
										{minute.toString().padStart(2, "0")}
									</Button>
								))}
							</div>
							<ScrollBar className="sm:hidden" orientation="horizontal" />
						</ScrollArea>

						<ScrollArea>
							<div className="flex sm:flex-col p-2">
								{AMPM.map((ampm) => (
									<Button
										className="sm:w-full shrink-0 aspect-square"
										key={ampm}
										onClick={() =>
											onChange(applyTimeChange(value, "ampm", ampm))
										}
										size="icon"
										type="button"
										variant={
											value &&
											((ampm === "AM" && value.getHours() < 12) ||
												(ampm === "PM" && value.getHours() >= 12))
												? "default"
												: "ghost"
										}
									>
										{ampm}
									</Button>
								))}
							</div>
						</ScrollArea>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
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
		mutationFn: (values: SessionEditForm) =>
			client.session.updateSession({
				id: sessionId,
				status: values.startsAt === undefined ? Status.DRAFT : Status.CONFIRMED,
				...values,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
			queryClient.invalidateQueries({
				queryKey: ["sessions", session.campaignId],
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
						<DateTimePicker onChange={field.onChange} value={field.value} />
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
