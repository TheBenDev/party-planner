import { format } from "date-fns";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

type TimeSegment = "hour" | "minute" | "ampm";

export type DateTimePickerProps = {
	value: Date | undefined;
	onChange: (date: Date | undefined) => void;
	minDate?: Date;
};

// ----------------------------------------------------------------
// Constants
// ----------------------------------------------------------------

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1).reverse();
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const AMPM = ["AM", "PM"] as const;

export function applyTimeChange(
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

	const hours = base.getHours();
	if (value === "AM" && hours >= 12) base.setHours(hours - 12);
	if (value === "PM" && hours < 12) base.setHours(hours + 12);
	return base;
}

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------

export function DateTimePicker({ value, onChange, minDate }: DateTimePickerProps) {
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
					<CalendarClock className="mr-2 h-4 w-4 shrink-0 opacity-50" />
					{value ? (
						format(value, "MM/dd/yyyy hh:mm aa")
					) : (
						<span>Pick a date &amp; time</span>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0">
				<div className="sm:flex">
					<Calendar
						disabled={
							minDate
								? (day) => {
										const minDay = new Date(
											minDate.getFullYear(),
											minDate.getMonth(),
											minDate.getDate(),
										);
										return day < minDay;
									}
								: undefined
						}
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
