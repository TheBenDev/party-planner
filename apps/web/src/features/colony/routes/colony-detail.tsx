import { useParams } from "@tanstack/react-router";
import { Map as MapIcon, Users } from "lucide-react";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/shared/components/ui/tabs";
import { useAuth } from "@/shared/hooks/auth";
import ColonistsCard from "../components/ColonistsCard";
import ColonyDetailsCard from "../components/ColonyDetailsCard";

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
	const campaignId = campaign?.campaign.id ?? "";
	if (campaignIsLoading) return <div>Loading...</div>;

	return (
		<div className="space-y-6">
			<ColonyDetailsCard campaignId={campaignId} />

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
					<ColonistsCard colonyId={colonyId} />
				</TabsContent>

				<TabsContent value="map">
					<MapTab />
				</TabsContent>
			</Tabs>
		</div>
	);
}
