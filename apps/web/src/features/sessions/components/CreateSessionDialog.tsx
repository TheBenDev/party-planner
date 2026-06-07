import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/utils";
import { RRuleBuilder } from "./RRuleBuilder";
import { localTimeToUtc } from "./session-utils";

export type CreateOneOffInput = {
	title: string;
	description?: string;
	startsAt?: Date;
};

export type CreateSeriesInput = {
	title: string;
	description?: string;
	rrule: string;
	startTime: string;
	timezone: string;
	seriesStartDate: Date;
	seriesEndDate?: Date;
};

function toLocalDatetimeString(date: Date): string {
	const offset = date.getTimezoneOffset();
	const local = new Date(date.getTime() - offset * 60_000);
	return local.toISOString().slice(0, 16);
}

function toLocalDateString(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
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
}: {
	open: boolean;
	mode: "oneoff" | "series";
	onModeChange: (m: "oneoff" | "series") => void;
	onClose: () => void;
	onCreateOneOff: (input: CreateOneOffInput) => void;
	onCreateSeries: (input: CreateSeriesInput) => void;
	isCreatingOneOff: boolean;
	isCreatingSeries: boolean;
}) {
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [startsAt, setStartsAt] = useState("");

	const [seriesTitle, setSeriesTitle] = useState("");
	const [seriesDescription, setSeriesDescription] = useState("");
	const [rrule, setRrule] = useState("");
	const [startTime, setStartTime] = useState("19:00");
	const [seriesStartDate, setSeriesStartDate] = useState("");
	const [seriesEndDate, setSeriesEndDate] = useState("");

	function reset() {
		setTitle("");
		setDescription("");
		setStartsAt("");
		setSeriesTitle("");
		setSeriesDescription("");
		setRrule("");
		setStartTime("19:00");
		setSeriesStartDate("");
		setSeriesEndDate("");
	}

	function handleClose() {
		reset();
		onClose();
	}

	function handleSubmitOneOff() {
		if (!title.trim()) return;
		onCreateOneOff({
			description: description.trim() || undefined,
			startsAt: startsAt ? new Date(startsAt) : undefined,
			title: title.trim(),
		});
		handleClose();
	}

	function handleSubmitSeries() {
		if (!(seriesTitle.trim() && rrule && startTime && seriesStartDate)) return;
		const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		onCreateSeries({
			description: seriesDescription.trim() || undefined,
			rrule,
			seriesEndDate: seriesEndDate
				? new Date(`${seriesEndDate}T00:00`)
				: undefined,
			seriesStartDate: new Date(`${seriesStartDate}T00:00`),
			startTime: localTimeToUtc(
				startTime,
				new Date(`${seriesStartDate}T00:00`),
			),
			timezone,
			title: seriesTitle.trim(),
		});
		handleClose();
	}

	const isPending = mode === "oneoff" ? isCreatingOneOff : isCreatingSeries;
	const canSubmit =
		mode === "oneoff"
			? Boolean(title.trim())
			: Boolean(seriesTitle.trim() && rrule && startTime && seriesStartDate);

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
					<div className="space-y-4">
						<div className="space-y-1.5">
							<label className="text-sm font-medium" htmlFor="oo-title">
								Title <span className="text-destructive">*</span>
							</label>
							<Input
								id="oo-title"
								onChange={(e) => setTitle(e.target.value)}
								placeholder="Session title"
								value={title}
							/>
						</div>
						<div className="space-y-1.5">
							<label className="text-sm font-medium" htmlFor="oo-date">
								Date &amp; time
							</label>
							<Input
								id="oo-date"
								min={toLocalDatetimeString(new Date())}
								onChange={(e) => setStartsAt(e.target.value)}
								type="datetime-local"
								value={startsAt}
							/>
						</div>
						<div className="space-y-1.5">
							<label className="text-sm font-medium" htmlFor="oo-desc">
								Description
							</label>
							<textarea
								className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
								id="oo-desc"
								onChange={(e) => setDescription(e.target.value)}
								placeholder="Optional description"
								value={description}
							/>
						</div>
					</div>
				) : (
					<div className="space-y-4">
						<div className="space-y-1.5">
							<label className="text-sm font-medium" htmlFor="s-title">
								Series title <span className="text-destructive">*</span>
							</label>
							<Input
								id="s-title"
								onChange={(e) => setSeriesTitle(e.target.value)}
								placeholder="e.g. Weekly Friday Campaign"
								value={seriesTitle}
							/>
						</div>
						<div className="space-y-1.5">
							<p className="text-sm font-medium">
								Repeats on <span className="text-destructive">*</span>
							</p>
							<RRuleBuilder onChange={setRrule} value={rrule} />
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-1.5">
								<label className="text-sm font-medium" htmlFor="s-time">
									Start time <span className="text-destructive">*</span>
								</label>
								<Input
									id="s-time"
									onChange={(e) => setStartTime(e.target.value)}
									type="time"
									value={startTime}
								/>
							</div>
							<div className="space-y-1.5">
								<label className="text-sm font-medium" htmlFor="s-start">
									First session <span className="text-destructive">*</span>
								</label>
								<Input
									id="s-start"
									min={toLocalDateString(new Date())}
									onChange={(e) => setSeriesStartDate(e.target.value)}
									type="date"
									value={seriesStartDate}
								/>
							</div>
						</div>
						<div className="space-y-1.5">
							<label className="text-sm font-medium" htmlFor="s-end">
								End date{" "}
								<span className="font-normal text-muted-foreground">
									(optional)
								</span>
							</label>
							<Input
								id="s-end"
								onChange={(e) => setSeriesEndDate(e.target.value)}
								type="date"
								value={seriesEndDate}
							/>
						</div>
						<div className="space-y-1.5">
							<label className="text-sm font-medium" htmlFor="s-desc">
								Description{" "}
								<span className="font-normal text-muted-foreground">
									(optional)
								</span>
							</label>
							<textarea
								className="flex min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
								id="s-desc"
								onChange={(e) => setSeriesDescription(e.target.value)}
								placeholder="Optional description"
								value={seriesDescription}
							/>
						</div>
					</div>
				)}

				<DialogFooter>
					<Button onClick={handleClose} variant="outline">
						Cancel
					</Button>
					<Button
						disabled={!canSubmit || isPending}
						onClick={
							mode === "oneoff" ? handleSubmitOneOff : handleSubmitSeries
						}
					>
						{mode === "oneoff" ? "Create Session" : "Create Series"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
