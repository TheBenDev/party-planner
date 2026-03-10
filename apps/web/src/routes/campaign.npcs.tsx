import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { User2 } from "lucide-react";
import CampaignShell from "@/components/campaign-shell";
import { useAuth } from "@/hooks/auth";
import { client } from "@/lib/client";

export const Route = createFileRoute("/campaign/npcs")({
	component: NPCSPage,
});

function NPCSPage() {
	const { campaign } = useAuth();

	const { data: npcs = [], isLoading } = useQuery({
		enabled: Boolean(campaign),
		queryFn: () =>
			client.npc.listNonPlayerCharactersByCampaignId({
				campaignId: campaign?.id ?? "",
			}),
		queryKey: ["npcs"],
	});

	if (isLoading) return <div>loading...</div>;

	return (
		<CampaignShell>
			<div className="space-y-3 flex flex-col">
				{npcs.map((npc) => {
					return (
						<div
							className="w-full h-80 border-2 flex flex-col items-center justify-center"
							key={npc.id}
						>
							<User2 className="w-32 h-32" />
							<div className="flex">
								<span>{npc.name}</span>
							</div>
						</div>
					);
				})}
			</div>
		</CampaignShell>
	);
}
