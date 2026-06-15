import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useCalendarConflicts } from "@/features/integrations/hooks/useCalendarConflicts";
import type { CalendarConflict } from "@/features/integrations/types";
import { Button } from "@/shared/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
	type CreateSeriesInput,
	type SeriesFormValues,
	seriesSchema,
} from "../types";
import { RRuleBuilder } from "./RRuleBuilder";
import { localTimeToUtc } from "./session-utils";

function toLocalDateString(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function ConflictWarning({
	conflicts,
	isLoading,
}: {
	conflicts: CalendarConflict[];
	isLoading: boolean;
}) {
	if (isLoading) {
		return (
			<p className="text-xs text-muted-foreground">
				Checking calendar conflicts…
			</p>
		);
	}
	if (conflicts.length === 0) return null;
	return (
		<div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs dark:border-amber-800 dark:bg-amber-950">
			<p className="font-medium text-amber-800 dark:text-amber-300">
				{conflicts.length === 1
					? "1 member has"
					: `${conflicts.length} members have`}{" "}
				schedule conflicts
			</p>
			<ul className="mt-1 space-y-0.5 text-amber-700 dark:text-amber-400">
				{conflicts.map((c) =>
					c.calendarEventWindows.map((slot, i) => (
						<li key={`${c.userId}-${i}`}>
							{new Date(slot.start).toLocaleTimeString([], {
								hour: "2-digit",
								minute: "2-digit",
							})}{" "}
							–{" "}
							{new Date(slot.end).toLocaleTimeString([], {
								hour: "2-digit",
								minute: "2-digit",
							})}
						</li>
					)),
				)}
			</ul>
		</div>
	);
}

export function CreateSessionDialog({
	open,
	onClose,
	onCreateSeries,
	isCreatingSeries,
	campaignId,
}: {
	open: boolean;
	onClose: () => void;
	onCreateSeries: (input: CreateSeriesInput) => void;
	isCreatingSeries: boolean;
	campaignId: string;
}) {
	const form = useForm<SeriesFormValues>({
		defaultValues: {
			description: "",
			durationMinutes: 180,
			rrule: "",
			seriesEndDate: "",
			seriesStartDate: "",
			startTime: "19:00",
			title: "",
		},
		mode: "onBlur",
		resolver: zodResolver(seriesSchema),
	});

	const rrule = form.watch("rrule");
	const isOneOff = rrule === null;
	const seriesStartDate = form.watch("seriesStartDate") ?? "";
	const seriesStartTime = form.watch("startTime") ?? "19:00";
	const durationMinutes = form.watch("durationMinutes");

	const effectiveDuration =
		typeof durationMinutes === "number" &&
		!Number.isNaN(durationMinutes) &&
		durationMinutes >= 15
			? durationMinutes
			: 180;

	const startsAtUtc =
		seriesStartDate && seriesStartTime
			? new Date(`${seriesStartDate}T${seriesStartTime}`).toISOString()
			: "";

	const { conflicts, isLoading: conflictsLoading } = useCalendarConflicts({
		campaignId,
		durationMinutes: effectiveDuration,
		startsAt: startsAtUtc,
	});

	function handleClose() {
		form.reset();
		onClose();
	}

	const handleSubmit = form.handleSubmit((data) => {
		const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		onCreateSeries({
			description: data.description?.trim() || undefined,
			durationMinutes: data.durationMinutes,
			rrule: data.rrule,
			seriesEndDate: data.seriesEndDate
				? new Date(`${data.seriesEndDate}T00:00`)
				: undefined,
			seriesStartDate: new Date(`${data.seriesStartDate}T00:00`),
			startTime: localTimeToUtc(
				data.startTime,
				new Date(`${data.seriesStartDate}T00:00`),
			),
			timezone,
			title: data.title.trim(),
		});
		handleClose();
	});

	return (
		<Dialog onOpenChange={(o) => !o && handleClose()} open={open}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>New Session</DialogTitle>
				</DialogHeader>

				<form id="session-form" onSubmit={handleSubmit}>
					<div className="space-y-4">
						<div className="space-y-1.5">
							<Label className="text-sm font-medium" htmlFor="title">
								Title <span className="text-destructive">*</span>
							</Label>
							<Input
								id="title"
								placeholder="Session title"
								{...form.register("title")}
							/>
							{form.formState.errors.title && (
								<p className="text-xs text-destructive">
									{form.formState.errors.title.message}
								</p>
							)}
						</div>

						<div className="space-y-1.5">
							<p className="text-sm font-medium">
								Frequency <span className="text-destructive">*</span>
							</p>
							<Controller
								control={form.control}
								name="rrule"
								render={({ field }) => (
									<RRuleBuilder
										onChange={field.onChange}
										value={field.value}
									/>
								)}
							/>
							{form.formState.errors.rrule && (
								<p className="text-xs text-destructive">
									{form.formState.errors.rrule.message}
								</p>
							)}
						</div>

						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-1.5">
								<Label className="text-sm font-medium" htmlFor="startTime">
									Start time <span className="text-destructive">*</span>
								</Label>
								<Input
									id="startTime"
									type="time"
									{...form.register("startTime")}
								/>
								{form.formState.errors.startTime && (
									<p className="text-xs text-destructive">
										{form.formState.errors.startTime.message}
									</p>
								)}
							</div>
							<div className="space-y-1.5">
								<Label className="text-sm font-medium" htmlFor="seriesStartDate">
									{isOneOff ? "Session date" : "First session"}{" "}
									<span className="text-destructive">*</span>
								</Label>
								<Input
									id="seriesStartDate"
									min={toLocalDateString(new Date())}
									type="date"
									{...form.register("seriesStartDate")}
								/>
								{form.formState.errors.seriesStartDate && (
									<p className="text-xs text-destructive">
										{form.formState.errors.seriesStartDate.message}
									</p>
								)}
							</div>
						</div>

						<ConflictWarning conflicts={conflicts} isLoading={conflictsLoading} />

						{!isOneOff && (
							<div className="space-y-1.5">
								<Label className="text-sm font-medium" htmlFor="seriesEndDate">
									End date{" "}
									<span className="font-normal text-muted-foreground">
										(optional)
									</span>
								</Label>
								<Input
									id="seriesEndDate"
									type="date"
									{...form.register("seriesEndDate")}
								/>
							</div>
						)}

						<div className="space-y-1.5">
							<Label className="text-sm font-medium" htmlFor="durationMinutes">
								Duration (minutes)
							</Label>
							<Input
								id="durationMinutes"
								inputMode="numeric"
								type="text"
								{...form.register("durationMinutes", {
									setValueAs: (v) => Number(v),
								})}
							/>
							{form.formState.errors.durationMinutes && (
								<p className="text-xs text-destructive">
									{form.formState.errors.durationMinutes.message}
								</p>
							)}
						</div>

						<div className="space-y-1.5">
							<Label className="text-sm font-medium" htmlFor="description">
								Description{" "}
								<span className="font-normal text-muted-foreground">
									(optional)
								</span>
							</Label>
							<textarea
								className="flex min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
								id="description"
								placeholder="Optional description"
								{...form.register("description")}
							/>
						</div>
					</div>
				</form>

				<DialogFooter>
					<Button onClick={handleClose} type="button" variant="outline">
						Cancel
					</Button>
					<Button disabled={isCreatingSeries} form="session-form" type="submit">
						{isOneOff ? "Create Session" : "Create Series"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
