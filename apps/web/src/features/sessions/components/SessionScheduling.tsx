import { format } from "date-fns";
import { CalendarCheck } from "lucide-react";
import { Separator } from "@/shared/components/ui/separator";

type Session = {
	id: string;
	startsAt: Date | string;
	campaignId: string;
	seriesId?: string | null;
};

type Props = {
	session: Session;
};

function toDate(value: Date | string): Date {
	return typeof value === "string" ? new Date(value) : value;
}

export function SessionScheduling({ session }: Props) {
	const date = toDate(session.startsAt);

	return (
		<div className="space-y-1.5">
			<h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
				Scheduling
			</h2>
			<div className="rounded-lg border bg-card">
				<div className="px-4 py-4 flex items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<div className="flex items-center justify-center size-9 rounded-md bg-muted shrink-0">
							<CalendarCheck className="size-4 text-muted-foreground" />
						</div>
						<div className="space-y-0.5">
							<p className="text-sm font-medium leading-none">
								{format(date, "EEEE, MMMM d · h:mm a")}
							</p>
							<p className="text-xs text-muted-foreground">
								{format(date, "yyyy")}
							</p>
						</div>
					</div>
					<span className="text-xs font-medium px-2.5 py-1 rounded-full border bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400 dark:bg-emerald-500/15 dark:border-emerald-500/25">
						Confirmed
					</span>
				</div>
				{session.seriesId && (
					<>
						<Separator />
						<div className="px-4 py-3">
							<p className="text-xs text-muted-foreground">
								Part of a recurring series
							</p>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
