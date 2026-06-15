import { Clock, MoreHorizontal } from "lucide-react";
import type { Session } from "@/features/sessions/types";
import { Button } from "@/shared/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { cn } from "@/shared/lib/utils";
import { formatSessionDate } from "./session-utils";

const SESSION_COLORS = [
	"bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
	"bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
	"bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
	"bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300",
	"bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
	"bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900 dark:text-fuchsia-300",
];
const SESSION_NUMBER_RE = /\d+/;

function getSessionColor(title: string) {
	const index =
		title.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
		SESSION_COLORS.length;
	return SESSION_COLORS[index];
}

function getSessionLabel(title: string) {
	const match = SESSION_NUMBER_RE.exec(title);
	if (match) return match[0];
	return title
		.split(" ")
		.slice(0, 2)
		.map((n) => n[0])
		.join("")
		.toUpperCase();
}

export function SessionRow({
	session,
	onView,
	onEdit,
	onDelete,
	onCancelOccurrence,
	onRecap,
	isDm,
	isSeriesSession = false,
	indented = false,
}: {
	session: Session;
	onView: () => void;
	onEdit: () => void;
	onDelete: () => void;
	onCancelOccurrence?: () => void;
	onRecap?: () => void;
	isDm: boolean;
	isSeriesSession?: boolean;
	indented?: boolean;
}) {
	const label = getSessionLabel(session.title);
	const color = getSessionColor(session.title);

	let dateDisplay: React.ReactNode;
	if (session.startsAt) {
		dateDisplay = (
			<p className="text-xs text-muted-foreground mt-0.5 truncate flex items-center gap-1">
				<Clock className="w-3 h-3 shrink-0" />
				{formatSessionDate(session.startsAt)}
			</p>
		);
	} else {
		dateDisplay = (
			<p className="text-xs text-muted-foreground mt-0.5 truncate">
				{session.description ?? (
					<span className="italic text-muted-foreground/50">No date set</span>
				)}
			</p>
		);
	}

	const showRecapButton =
		isDm &&
		onRecap &&
		!session.recap &&
		!!session.startsAt &&
		new Date(session.startsAt) < new Date();

	return (
		<div
			className={cn(
				"group flex w-full items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors",
				indented && "pl-6",
			)}
		>
			<div
				className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${color}`}
			>
				{label}
			</div>

			<button
				className="flex-1 min-w-0 text-left"
				onClick={onView}
				type="button"
			>
				<p className="font-medium text-sm leading-tight truncate">
					{session.title}
				</p>
				{dateDisplay}
			</button>

			{showRecapButton && (
				<Button
					className="h-7 text-xs shrink-0"
					onClick={(e) => {
						e.stopPropagation();
						onRecap();
					}}
					size="sm"
					type="button"
					variant="outline"
				>
					Recap
				</Button>
			)}

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						className="inline-flex items-center justify-center rounded-lg h-8 w-8 opacity-0 hover:bg-accent group-hover:opacity-100 transition-opacity shrink-0"
						onClick={(e) => e.stopPropagation()}
						type="button"
					>
						<MoreHorizontal className="w-4 h-4" />
						<span className="sr-only">Options for {session.title}</span>
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-44">
					<DropdownMenuItem
						onClick={(e) => {
							e.stopPropagation();
							onView();
						}}
					>
						View
					</DropdownMenuItem>
					{isDm && (
						<>
							<DropdownMenuItem
								onClick={(e) => {
									e.stopPropagation();
									onEdit();
								}}
							>
								Edit
							</DropdownMenuItem>
							{isSeriesSession && onCancelOccurrence && (
								<>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										onClick={(e) => {
											e.stopPropagation();
											onCancelOccurrence();
										}}
									>
										Cancel occurrence
									</DropdownMenuItem>
								</>
							)}
							<DropdownMenuSeparator />
							<DropdownMenuItem
								className="text-destructive focus:text-destructive"
								onClick={(e) => {
									e.stopPropagation();
									onDelete();
								}}
							>
								Delete
							</DropdownMenuItem>
						</>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
