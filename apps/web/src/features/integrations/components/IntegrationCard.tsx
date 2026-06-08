import { Link } from "@tanstack/react-router";
import { cn } from "@/shared/lib/utils";

export type IntegrationStatus = "connected" | "available" | "coming_soon";

export interface IntegrationCardProps {
	name: string;
	description: string;
	icon: React.ReactNode;
	href: string;
	status: IntegrationStatus;
	meta?: string;
	metaIcon?: React.ReactNode;
	className?: string;
}

const statusConfig: Record<
	IntegrationStatus,
	{ label: string; className: string }
> = {
	available: {
		className: "bg-muted text-muted-foreground border border-border",
		label: "Available",
	},
	coming_soon: {
		className: "bg-muted text-muted-foreground border border-border",
		label: "Coming soon",
	},
	connected: {
		className:
			"bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
		label: "Connected",
	},
};

export function IntegrationCard({
	name,
	description,
	icon,
	href,
	status,
	meta,
	metaIcon,
	className,
}: IntegrationCardProps) {
	const badge = statusConfig[status];

	const isComingSoon = status === "coming_soon";

	if (isComingSoon) {
		return (
			<div
				aria-disabled="true"
				className={cn(
					"group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 opacity-60",
					className,
				)}
			>
				<div className="flex items-start justify-between">
					<div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
						{icon}
					</div>
					<span
						className={cn(
							"inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium leading-none",
							badge.className,
						)}
					>
						{badge.label}
					</span>
				</div>
				<div className="flex flex-col gap-1">
					<p className="text-sm font-medium leading-snug">{name}</p>
					<p className="text-xs leading-relaxed text-muted-foreground">
						{description}
					</p>
				</div>
				{meta && (
					<div className="mt-auto flex items-center gap-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
						{metaIcon && <span className="flex-shrink-0">{metaIcon}</span>}
						<span>{meta}</span>
					</div>
				)}
			</div>
		);
	}

	return (
		<Link
			className={cn(
				"group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-colors hover:bg-accent/40",
				status === "connected" && "border-emerald-200 dark:border-emerald-800",
				className,
			)}
			to={href}
		>
			<div className="flex items-start justify-between">
				<div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
					{icon}
				</div>
				<span
					className={cn(
						"inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium leading-none",
						badge.className,
					)}
				>
					{status === "connected" && (
						<span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
					)}
					{badge.label}
				</span>
			</div>

			<div className="flex flex-col gap-1">
				<p className="text-sm font-medium leading-snug">{name}</p>
				<p className="text-xs leading-relaxed text-muted-foreground">
					{description}
				</p>
			</div>

			{meta && (
				<div className="mt-auto flex items-center gap-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
					{metaIcon && <span className="flex-shrink-0">{metaIcon}</span>}
					<span>{meta}</span>
				</div>
			)}
		</Link>
	);
}
