"use client";
import { useQuery } from "@tanstack/react-query";
import { User2 } from "lucide-react";
import { useAuth } from "@/hooks/auth";
import { client } from "@/lib/client";

export default function NPCSPage() {
	const { campaign } = useAuth();

	const { data: npcs, isLoading } = useQuery({
		enabled: Boolean(campaign),
		queryFn: async () => {
			if (!campaign) return null;
			const res = await client.npc.listNonPlayerCharacters.$get({
				campaignId: campaign.id,
			});

			return await res.json();
		},
		queryKey: ["npcs"],
	});
	if (isLoading) return <div>loading...</div>;
	return (
		<div className="space-y-3 flex flex-col">
			{npcs?.map((npc) => {
				return (
					<div
						className="w-full h-80 border-2 flex flex-col items-center justify-center"
						key={npc.id}
					>
						<User2 className="w-32 h-32" />
						<div className="flex">
							<span>{npc.firstName}</span>
							<span>{npc.lastName}</span>
						</div>
					</div>
				);
			})}
		</div>
	);
}
