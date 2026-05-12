import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { client } from "@/lib/client";

export const Route = createFileRoute(
	"/_authenticated/campaign/quests/$questId/",
)({
	component: RouteComponent,
});

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
	ACTIVE: {
		className: "bg-blue-500/15 text-blue-400 border-blue-500/30",
		label: "Active",
	},
	COMPLETED: {
		className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
		label: "Completed",
	},
	FAILED: {
		className: "bg-red-500/15 text-red-400 border-red-500/30",
		label: "Failed",
	},
	UNSPECIFIED: {
		className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
		label: "Unknown",
	},
};

function RouteComponent() {
	const { questId } = Route.useParams();
	const navigate = useNavigate();

	const { data, isLoading } = useQuery({
		queryFn: () => client.quest.getQuest({ id: questId }),
		queryKey: ["quest", questId],
	});

	if (isLoading)
		return <div className="p-8 text-muted-foreground">Loading...</div>;

	const quest = data?.quest;
	if (!quest)
		return <div className="p-8 text-muted-foreground">Quest not found.</div>;

	const status = STATUS_STYLES[quest.status] ?? STATUS_STYLES.UNSPECIFIED;

	return (
		<div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
			{/* Header */}
			<div className="flex items-start justify-between gap-4">
				<h1 className="text-3xl font-semibold tracking-tight">{quest.title}</h1>
				<Button
					onClick={() =>
						navigate({
							params: { questId },
							to: "/campaign/quests/$questId/edit",
						})
					}
					size="sm"
					variant="outline"
				>
					Edit
				</Button>
			</div>

			{/* Status badge */}
			<div>
				<span
					className={`text-xs font-medium px-2.5 py-1 rounded-full border ${status.className}`}
				>
					{status.label}
				</span>
			</div>

			<Separator />

			<div className="space-y-6">
				<Section
					content={quest.description}
					placeholder="No description recorded."
					title="Description"
				/>
			</div>

			{quest.completedAt && (
				<p className="text-xs text-muted-foreground/50">
					Completed {new Date(quest.completedAt).toLocaleDateString()}
				</p>
			)}
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
