import { useParams } from "@tanstack/react-router";
import { Map as MapIcon, Users } from "lucide-react";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/shared/components/ui/tabs";
import { useAuth } from "@/shared/hooks/auth";
import ColonyResourcesCard from "../components/ColonyResourcesCard";
import NpcColonistsCard from "../components/NpcColonistsCard";
import { WorkforceCard } from "../components/WorkforceCard";
import { useColonyWorkforce } from "../hooks/useColony";

function MapTab() {
	return (
		<div className="border rounded-2xl p-6 flex items-center justify-center min-h-[480px]">
			<p className="text-sm text-muted-foreground">Colony map coming soon.</p>
		</div>
	);
}

export default function ColonyDetailPage() {
	const { colonyId } = useParams({
		from: "/_authenticated/campaign/colony/$colonyId/",
	});
	const { campaign, campaignIsLoading } = useAuth();
	const { data, isPending: workforceIsLoading } = useColonyWorkforce(colonyId);
	const campaignId = campaign?.campaign.id ?? "";
	if (campaignIsLoading) return <div>Loading...</div>;

	return (
		<div className="space-y-6">
			<div className="flex flex-col lg:flex-row gap-4 items-start">
				<div className="w-full lg:w-1/2 min-w-0">
					<ColonyResourcesCard campaignId={campaignId} />
				</div>
				{data?.workforces && (
					<div className="overflow-hidden w-full lg:w-1/2">
						<WorkforceCard
							colonyId={colonyId}
							workforceIsLoading={workforceIsLoading}
							workforces={data.workforces}
						/>
					</div>
				)}
			</div>

			<Tabs defaultValue="colonists">
				<TabsList>
					<TabsTrigger value="colonists">
						<Users />
						Colonists
					</TabsTrigger>
					<TabsTrigger value="map">
						<MapIcon />
						Map
					</TabsTrigger>
				</TabsList>

				<TabsContent value="colonists">
					<NpcColonistsCard colonyId={colonyId} />
				</TabsContent>

				<TabsContent value="map">
					<MapTab />
				</TabsContent>
			</Tabs>
		</div>
	);
}
