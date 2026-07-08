import { QuestStatusEnum } from "@planner/enums/quest";
import { UserRole } from "@planner/enums/user";
import { useNavigate, useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import { QuestRewardCard } from "@/features/quests/components/QuestRewardCard";
import { useQuest } from "@/features/quests/hooks/useQuest";
import { useQuestData } from "@/features/quests/hooks/useQuestData";
import { Button } from "@/shared/components/ui/button";
import { Separator } from "@/shared/components/ui/separator";
import { useAuth } from "@/shared/hooks/auth";

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

export function QuestDetailPage() {
	const { questId } = useParams({ from: "/_authenticated/campaign/quests/$questId/" });
	const navigate = useNavigate();
	const { role } = useAuth();
	const { completeQuest } = useQuestData();

	const { data, isLoading } = useQuest(questId);

	if (isLoading)
		return <div className="p-8 text-muted-foreground">Loading...</div>;

	const quest = data?.quest;
	if (!quest)
		return <div className="p-8 text-muted-foreground">Quest not found.</div>;

	const status = STATUS_STYLES[quest.status] ?? STATUS_STYLES.UNSPECIFIED;
	const isDm = role === UserRole.DUNGEON_MASTER;
	const isActive = quest.status === QuestStatusEnum.ACTIVE;

	return (
		<div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
			<div className="flex items-start justify-between gap-4">
				<h1 className="text-3xl font-semibold tracking-tight">{quest.title}</h1>
				{isDm && (
					<div className="flex items-center gap-2 shrink-0">
						{isActive && (
							<Button
								disabled={completeQuest.isPending}
								onClick={() =>
									completeQuest.mutate(
										{ id: questId },
										{
											onError: () => toast.error("Failed to complete quest"),
											onSuccess: () => toast.success("Quest completed"),
										},
									)
								}
								size="sm"
								variant="default"
							>
								Complete
							</Button>
						)}
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
				)}
			</div>

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
				<QuestRewardCard reward={quest.reward} />
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
