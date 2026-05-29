import { UserRole } from "@planner/enums/user";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SessionScheduling } from "@/components/session-scheduling";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/auth";
import { useSession } from "@/hooks/queries";

export const Route = createFileRoute(
	"/_authenticated/campaign/sessions/$sessionId/",
)({
	component: RouteComponent,
});

function formatSessionDate(date: Date | string): string {
	const d = typeof date === "string" ? new Date(date) : date;
	return d.toLocaleDateString("en-US", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});
}

function RouteComponent() {
	const { sessionId } = Route.useParams();
	const navigate = useNavigate();
	const { role } = useAuth();

	const { data, isLoading } = useSession(sessionId);

	if (isLoading) {
		return <div className="p-8 text-muted-foreground">Loading...</div>;
	}

	const session = data?.session;

	if (!session) {
		return <div className="p-8 text-muted-foreground">Session not found.</div>;
	}

	return (
		<div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
			{/* Header */}
			<div className="flex items-start justify-between gap-4">
				<h1 className="text-3xl font-semibold tracking-tight">
					{session.title}
				</h1>
				{role === UserRole.DUNGEON_MASTER && (
					<Button
						className="hover:cursor-pointer"
						onClick={() =>
							navigate({
								params: { sessionId },
								to: "/campaign/sessions/$sessionId/edit",
							})
						}
						size="sm"
						variant="outline"
					>
						Edit
					</Button>
				)}
			</div>

			{/* Date badge — only shown when confirmed */}
			{session.startsAt && (
				<div>
					<span className="text-xs font-medium px-2.5 py-1 rounded-full border bg-zinc-500/15 text-zinc-400 border-zinc-500/30">
						{formatSessionDate(session.startsAt)}
					</span>
				</div>
			)}

			<Separator />

			<div className="space-y-6">
				<Section
					content={session.description}
					placeholder="No description recorded."
					title="Description"
				/>

				<Separator />

				<SessionScheduling
					session={{
						announcedAt: session.announcedAt,
						campaignId: session.campaignId,
						id: session.id,
						startsAt: session.startsAt,
						status: session.status,
					}}
				/>
			</div>

			<p className="text-xs text-muted-foreground/50">
				Last updated {formatSessionDate(session.updatedAt)}
			</p>
		</div>
	);
}

function Section({
	title,
	content,
	placeholder,
}: {
	title: string;
	content?: string | null;
	placeholder: string;
}) {
	return (
		<div className="space-y-1.5">
			<h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
				{title}
			</h2>
			{content ? (
				<p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
			) : (
				<p className="text-sm italic text-muted-foreground/50">{placeholder}</p>
			)}
		</div>
	);
}
