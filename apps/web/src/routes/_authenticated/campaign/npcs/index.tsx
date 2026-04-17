import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { User2 } from "lucide-react";
import { useAuth } from "@/hooks/auth";
import { client } from "@/lib/client";

export const Route = createFileRoute("/_authenticated/campaign/npcs/")({
	component: NPCSPage,
});

function NPCSPage() {
	const { campaign } = useAuth();

	const { data: npcs = { npcs: [] }, isLoading } = useQuery({
		enabled: Boolean(campaign),
		queryFn: () =>
			client.npc.listNonPlayerCharacters({
				campaignId: campaign?.campaign.id ?? "",
			}),
		queryKey: ["npcs", "campaignId"],
	});

	if (isLoading) return <div>loading...</div>;

	return (
		<div className="space-y-3 flex flex-col">
			{npcs.npcs.map((npc) => {
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
	);
}
