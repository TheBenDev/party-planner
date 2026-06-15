import { zodResolver } from "@hookform/resolvers/zod";
import { Status } from "@planner/enums/session";
import { Controller, useForm } from "react-hook-form";
import { useCalendarConflicts } from "@/features/integrations/hooks/useCalendarConflicts";
import type { CalendarConflict } from "@/features/integrations/types";
import { DateTimePicker } from "@/shared/components/DateTimePicker";
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
import { cn } from "@/shared/lib/utils";
import {
	type CreateOneOffInput,
	type CreateSeriesInput,
	type OneOffFormValues,
	oneOffSchema,
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
	mode,
	onModeChange,
	onClose,
	onCreateOneOff,
	onCreateSeries,
	isCreatingOneOff,
	isCreatingSeries,
	campaignId,
}: {
	open: boolean;
	mode: "oneoff" | "series";
	onModeChange: (m: "oneoff" | "series") => void;
	onClose: () => void;
	onCreateOneOff: (input: CreateOneOffInput) => void;
	onCreateSeries: (input: CreateSeriesInput) => void;
	isCreatingOneOff: boolean;
	isCreatingSeries: boolean;
	campaignId: string;
}) {
	const oneOffForm = useForm<OneOffFormValues>({
		defaultValues: {
			description: "",
			durationMinutes: 180,
			startsAt: undefined,
			title: "",
		},
		mode: "onBlur",
		resolver: zodResolver(oneOffSchema),
	});

	const seriesForm = useForm<SeriesFormValues>({
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

	const oneoffStartsAt = oneOffForm.watch("startsAt");
	const oneoffDuration = oneOffForm.watch("durationMinutes");
	const seriesStartDate = seriesForm.watch("seriesStartDate") ?? "";
	const seriesStartTime = seriesForm.watch("startTime") ?? "19:00";
	const seriesDuration = seriesForm.watch("durationMinutes");

	const effectiveOneoffDuration =
		typeof oneoffDuration === "number" &&
		!Number.isNaN(oneoffDuration) &&
		oneoffDuration >= 15
			? oneoffDuration
			: 180;
	const effectiveSeriesDuration =
		typeof seriesDuration === "number" &&
		!Number.isNaN(seriesDuration) &&
		seriesDuration >= 15
			? seriesDuration
			: 180;

	const oneOffStartsAtUtc = oneoffStartsAt ? oneoffStartsAt.toISOString() : "";
	const { conflicts: oneOffConflicts, isLoading: oneOffConflictsLoading } =
		useCalendarConflicts({
			campaignId,
			durationMinutes: effectiveOneoffDuration,
			startsAt: oneOffStartsAtUtc,
		});

	const seriesStartsAtUtc =
		seriesStartDate && seriesStartTime
			? new Date(`${seriesStartDate}T${seriesStartTime}`).toISOString()
			: "";
	const { conflicts: seriesConflicts, isLoading: seriesConflictsLoading } =
		useCalendarConflicts({
			campaignId,
			durationMinutes: effectiveSeriesDuration,
			startsAt: seriesStartsAtUtc,
		});

	function handleClose() {
		oneOffForm.reset();
		seriesForm.reset();
		onClose();
	}

	const handleSubmitOneOff = oneOffForm.handleSubmit((data) => {
		const status = data.startsAt ? Status.CONFIRMED : Status.DRAFT;
		onCreateOneOff({
			description: data.description?.trim() || undefined,
			durationMinutes: data.durationMinutes,
			startsAt: data.startsAt,
			status,
			title: data.title.trim(),
		});
		handleClose();
	});

	const handleSubmitSeries = seriesForm.handleSubmit((data) => {
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

	const isPending = mode === "oneoff" ? isCreatingOneOff : isCreatingSeries;

	return (
		<Dialog onOpenChange={(o) => !o && handleClose()} open={open}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>New Session</DialogTitle>
				</DialogHeader>

				<div className="flex rounded-lg border p-1 gap-1 bg-muted/30">
					<button
						className={cn(
							"flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
							mode === "oneoff"
								? "bg-background shadow-sm text-foreground"
								: "text-muted-foreground hover:text-foreground",
						)}
						onClick={() => onModeChange("oneoff")}
						type="button"
					>
						One-off
					</button>
					<button
						className={cn(
							"flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
							mode === "series"
								? "bg-background shadow-sm text-foreground"
								: "text-muted-foreground hover:text-foreground",
						)}
						onClick={() => onModeChange("series")}
						type="button"
					>
						Recurring Series
					</button>
				</div>

				{mode === "oneoff" ? (
					// SESSION ONE OFF
					<form id="oneoff-form" onSubmit={handleSubmitOneOff}>
						<div className="space-y-4">
							<div className="space-y-1.5">
								<Label className="text-sm font-medium" htmlFor="oo-title">
									Title <span className="text-destructive">*</span>
								</Label>
								<Input
									id="oo-title"
									placeholder="Session title"
									{...oneOffForm.register("title")}
								/>
								{oneOffForm.formState.errors.title && (
									<p className="text-xs text-destructive">
										{oneOffForm.formState.errors.title.message}
									</p>
								)}
							</div>
							<div className="space-y-1.5">
								<Label className="text-sm font-medium">Date &amp; time</Label>
								<Controller
									control={oneOffForm.control}
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
							<ConflictWarning
								conflicts={oneOffConflicts}
								isLoading={oneOffConflictsLoading}
							/>
							<div className="space-y-1.5">
								<Label className="text-sm font-medium" htmlFor="oo-duration">
									Duration (minutes)
								</Label>
								<Input
									id="oo-duration"
									inputMode="numeric"
									type="text"
									{...oneOffForm.register("durationMinutes", {
										setValueAs: (v) => Number(v),
									})}
								/>
								{oneOffForm.formState.errors.durationMinutes && (
									<p className="text-xs text-destructive">
										{oneOffForm.formState.errors.durationMinutes.message}
									</p>
								)}
							</div>
							<div className="space-y-1.5">
								<Label className="text-sm font-medium" htmlFor="oo-desc">
									Description
								</Label>
								<textarea
									className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
									id="oo-desc"
									placeholder="Optional description"
									{...oneOffForm.register("description")}
								/>
							</div>
						</div>
					</form>
				) : (
					// SESSION SERIES
					<form id="series-form" onSubmit={handleSubmitSeries}>
						<div className="space-y-4">
							<div className="space-y-1.5">
								<Label className="text-sm font-medium" htmlFor="s-title">
									Series title <span className="text-destructive">*</span>
								</Label>
								<Input
									id="s-title"
									placeholder="e.g. Weekly Friday Campaign"
									{...seriesForm.register("title")}
								/>
								{seriesForm.formState.errors.title && (
									<p className="text-xs text-destructive">
										{seriesForm.formState.errors.title.message}
									</p>
								)}
							</div>
							<div className="space-y-1.5">
								<p className="text-sm font-medium">
									Repeats on <span className="text-destructive">*</span>
								</p>
								<Controller
									control={seriesForm.control}
									name="rrule"
									render={({ field }) => (
										<RRuleBuilder
											onChange={field.onChange}
											value={field.value}
										/>
									)}
								/>
								{seriesForm.formState.errors.rrule && (
									<p className="text-xs text-destructive">
										{seriesForm.formState.errors.rrule.message}
									</p>
								)}
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div className="space-y-1.5">
									<Label className="text-sm font-medium" htmlFor="s-time">
										Start time <span className="text-destructive">*</span>
									</Label>
									<Input
										id="s-time"
										type="time"
										{...seriesForm.register("startTime")}
									/>
									{seriesForm.formState.errors.startTime && (
										<p className="text-xs text-destructive">
											{seriesForm.formState.errors.startTime.message}
										</p>
									)}
								</div>
								<div className="space-y-1.5">
									<Label className="text-sm font-medium" htmlFor="s-start">
										First session <span className="text-destructive">*</span>
									</Label>
									<Input
										id="s-start"
										min={toLocalDateString(new Date())}
										type="date"
										{...seriesForm.register("seriesStartDate")}
									/>
									{seriesForm.formState.errors.seriesStartDate && (
										<p className="text-xs text-destructive">
											{seriesForm.formState.errors.seriesStartDate.message}
										</p>
									)}
								</div>
							</div>
							<ConflictWarning
								conflicts={seriesConflicts}
								isLoading={seriesConflictsLoading}
							/>
							<div className="space-y-1.5">
								<Label className="text-sm font-medium" htmlFor="s-end">
									End date{" "}
									<span className="font-normal text-muted-foreground">
										(optional)
									</span>
								</Label>
								<Input
									id="s-end"
									type="date"
									{...seriesForm.register("seriesEndDate")}
								/>
							</div>
							<div className="space-y-1.5">
								<Label className="text-sm font-medium" htmlFor="s-duration">
									Duration (minutes)
								</Label>
								<Input
									id="s-duration"
									inputMode="numeric"
									type="text"
									{...seriesForm.register("durationMinutes", {
										setValueAs: (v) => Number(v),
									})}
								/>
								{seriesForm.formState.errors.durationMinutes && (
									<p className="text-xs text-destructive">
										{seriesForm.formState.errors.durationMinutes.message}
									</p>
								)}
							</div>
							<div className="space-y-1.5">
								<Label className="text-sm font-medium" htmlFor="s-desc">
									Description{" "}
									<span className="font-normal text-muted-foreground">
										(optional)
									</span>
								</Label>
								<textarea
									className="flex min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
									id="s-desc"
									placeholder="Optional description"
									{...seriesForm.register("description")}
								/>
							</div>
						</div>
					</form>
				)}

				<DialogFooter>
					<Button onClick={handleClose} type="button" variant="outline">
						Cancel
					</Button>
					<Button
						disabled={isPending}
						form={mode === "oneoff" ? "oneoff-form" : "series-form"}
						type="submit"
					>
						{mode === "oneoff" ? "Create Session" : "Create Series"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
