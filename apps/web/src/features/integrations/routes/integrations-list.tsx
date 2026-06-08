import { IntegrationSource } from "@planner/enums/integration";
import { UserRole } from "@planner/enums/user";
import { useQuery } from "@tanstack/react-query";
import { ServerIcon } from "lucide-react";
import { IntegrationCard } from "@/features/integrations/components/IntegrationCard";
import { useAuth } from "@/shared/hooks/auth";
import { client } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/query-keys";

function DiscordIcon() {
	return (
		<svg
			aria-hidden="true"
			className="h-6 w-6"
			fill="none"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"
				fill="#5865F2"
			/>
		</svg>
	);
}

function FoundryIcon() {
	return (
		<svg
			aria-hidden="true"
			className="h-6 w-6"
			fill="none"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				className="text-muted-foreground"
				d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z"
				stroke="currentColor"
				strokeLinejoin="round"
				strokeWidth="1.5"
			/>
			<path
				className="text-muted-foreground"
				d="M9 12l2 2 4-4"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="1.5"
			/>
		</svg>
	);
}

function CalendarIcon() {
	return (
		<svg
			aria-hidden="true"
			className="h-6 w-6"
			fill="none"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
		>
			<rect
				className="text-muted-foreground"
				height="18"
				rx="2"
				stroke="currentColor"
				strokeWidth="1.5"
				width="18"
				x="3"
				y="4"
			/>
			<path
				className="text-muted-foreground"
				d="M16 2v4M8 2v4M3 10h18"
				stroke="currentColor"
				strokeLinecap="round"
				strokeWidth="1.5"
			/>
			<rect
				className="text-muted-foreground"
				fill="currentColor"
				height="3"
				rx="0.5"
				width="3"
				x="8"
				y="14"
			/>
		</svg>
	);
}

function IntegrationsGridSkeleton() {
	return (
		<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{Array.from({ length: 3 }).map((_, i) => (
				<div
					className="h-40 animate-pulse rounded-xl border border-border bg-muted"
					key={i}
				/>
			))}
		</div>
	);
}

const ALL_INTEGRATIONS = [
	{
		description:
			"Scheduling polls, session announcements, and recap delivery via Beny Bot.",
		href: "/campaign/integrations/discord",
		icon: <DiscordIcon />,
		meta: "Beny Bot · #party-planner",
		metaIcon: <ServerIcon className="h-3.5 w-3.5" />,
		name: "Discord",
		source: IntegrationSource.DISCORD,
	},
	{
		description:
			"Bidirectional sync — push world state in, receive combat events and encounter data out.",
		href: "/campaign/integrations/foundry-vtt",
		icon: <FoundryIcon />,
		meta: "Webhook-based sync",
		metaIcon: null,
		name: "Foundry VTT",
		source: null,
	},
	{
		description:
			"Sync scheduled sessions to player calendars and surface availability conflicts automatically.",
		href: "/campaign/integrations/google-calendar",
		icon: <CalendarIcon />,
		meta: "Calendar sync",
		metaIcon: null,
		name: "Google Calendar",
		source: null,
	},
] as const;

export function IntegrationsPage() {
	const { campaign, role } = useAuth();
	if (!campaign) return <div>Campaign Required</div>;
	const campaignId = campaign.campaign.id;
	const isDm = role === UserRole.DUNGEON_MASTER;

	// TODO Handle query failures before computing connected/available states.
	const { data, isLoading } = useQuery({
		queryFn: () =>
			client.campaignIntegration.listCampaignIntegrationsByCampaign({
				campaignId,
			}),
		queryKey: queryKeys.integrations.list(campaignId),
	});

	const connectedSources = new Set(
		data?.integrations.map((i) => i.source) ?? [],
	);

	const connected = ALL_INTEGRATIONS.filter(
		(i) => i.source !== null && connectedSources.has(i.source),
	);

	const available = ALL_INTEGRATIONS.filter(
		(i) => i.source === null || !connectedSources.has(i.source),
	);

	return (
		<div className="mx-auto max-w-4xl py-8">
			<div className="mb-8">
				<h1 className="text-xl font-medium">Integrations</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Connect external services to enhance your campaign workflow.
				</p>
			</div>

			{isLoading ? (
				<IntegrationsGridSkeleton />
			) : (
				<>
					{connected.length > 0 && (
						<section className="mb-8">
							<p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
								Connected
							</p>
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
								{connected.map((integration) => (
									<IntegrationCard
										description={integration.description}
										href={integration.href}
										icon={integration.icon}
										key={integration.name}
										meta={integration.meta}
										metaIcon={integration.metaIcon}
										name={integration.name}
										status="connected"
									/>
								))}
							</div>
						</section>
					)}

					{isDm && (
						<section>
							<p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
								Available
							</p>
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
								{available.map((integration) => (
									<IntegrationCard
										description={integration.description}
										href={integration.href}
										icon={integration.icon}
										key={integration.name}
										meta={integration.meta}
										metaIcon={integration.metaIcon}
										name={integration.name}
										status={
											integration.source !== null ? "available" : "coming_soon"
										}
									/>
								))}
							</div>
						</section>
					)}
				</>
			)}
		</div>
	);
}
