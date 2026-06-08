import type { SessionSeries } from "@/features/sessions/types";
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
import { RRuleBuilder } from "./RRuleBuilder";
import { localTimeToUtc, toDateInputValue, utcTimeToLocal } from "./session-utils";

type SaveInput = {
	title?: string;
	description?: string;
	rrule?: string;
	startTime?: string;
	seriesEndDate?: Date;
};

export function EditSeriesDialog({
	series,
	onClose,
	onSave,
	isUpdating,
}: {
	series: SessionSeries;
	onClose: () => void;
	onSave: (input: SaveInput) => void;
	isUpdating: boolean;
}) {
	const [title, setTitle] = useState(series.title);
	const [description, setDescription] = useState(series.description ?? "");
	const [rrule, setRrule] = useState(series.rrule);
	const [startTime, setStartTime] = useState(utcTimeToLocal(series.startTime, series.seriesStartDate));
	const [seriesEndDate, setSeriesEndDate] = useState(
		series.seriesEndDate ? toDateInputValue(series.seriesEndDate) : "",
	);

	return (
		<Dialog onOpenChange={(o) => !o && onClose()} open>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Edit Series</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-1.5">
						<label className="text-sm font-medium" htmlFor="edit-title">
							Title
						</label>
						<Input
							id="edit-title"
							onChange={(e) => setTitle(e.target.value)}
							value={title}
						/>
					</div>
					<div className="space-y-1.5">
						<p className="text-sm font-medium">Repeats on</p>
						<RRuleBuilder onChange={setRrule} value={rrule} />
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1.5">
							<label className="text-sm font-medium" htmlFor="edit-time">
								Start time
							</label>
							<Input
								id="edit-time"
								onChange={(e) => setStartTime(e.target.value)}
								type="time"
								value={startTime}
							/>
						</div>
						<div className="space-y-1.5">
							<label className="text-sm font-medium" htmlFor="edit-end">
								End date
							</label>
							<Input
								id="edit-end"
								onChange={(e) => setSeriesEndDate(e.target.value)}
								type="date"
								value={seriesEndDate}
							/>
						</div>
					</div>
					<div className="space-y-1.5">
						<label className="text-sm font-medium" htmlFor="edit-desc">
							Description
						</label>
						<textarea
							className="flex min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
							id="edit-desc"
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Optional description"
							value={description}
						/>
					</div>
				</div>

				<DialogFooter>
					<Button onClick={onClose} variant="outline">
						Cancel
					</Button>
					<Button
						disabled={isUpdating || !title.trim()}
						onClick={() =>
							onSave({
								description: description.trim() || undefined,
								rrule: rrule || undefined,
								seriesEndDate: seriesEndDate
									? new Date(`${seriesEndDate}T00:00`)
									: undefined,
								startTime: startTime ? localTimeToUtc(startTime, series.seriesStartDate) : undefined,
								title: title.trim() || undefined,
							})
						}
					>
						Save Changes
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
