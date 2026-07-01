import { UserRole } from "@planner/enums/user";
import { Link } from "@tanstack/react-router";
import { BotIcon, ExternalLinkIcon, HashIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { DiscordIntegrationSettings } from "@/features/integrations/components/DiscordIntegrationSettings";
import { ToggleDisplayInput } from "@/features/integrations/components/ToggleDisplayInput";
import { useDiscordIntegration } from "@/features/integrations/hooks/useDiscordIntegration";
import type { CampaignIntegration } from "@/features/integrations/types";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { useAuth } from "@/shared/hooks/auth";
import { env } from "@/shared/lib/env";

// VIEW_CHANNEL (1024) + SEND_MESSAGES (2048) + EMBED_LINKS (16384) +
// READ_MESSAGE_HISTORY (65536) + MANAGE_EVENTS (8589934592)
const DISCORD_PERMISSIONS = "8590019584";
const DISCORD_SCOPES = "bot applications.commands";

function buildDiscordOAuthUrl(campaignId: string) {
	const redirectUri = `${env.VITE_APP_URL}/campaign/integrations/discord/callback`;
	const oauthState = crypto.randomUUID();
	sessionStorage.setItem("discord_oauth_state", oauthState);
	const state = btoa(JSON.stringify({ campaignId, oauthState }));
	const params = new URLSearchParams({
		client_id: env.VITE_DISCORD_CLIENT_ID,
		integration_type: "0",
		permissions: DISCORD_PERMISSIONS,
		redirect_uri: redirectUri,
		response_type: "code",
		scope: DISCORD_SCOPES,
		state,
	});
	return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export function DiscordIntegrationPage() {
	const { campaign, role } = useAuth();
	const isDm = role === UserRole.DUNGEON_MASTER;
	const campaignId = campaign?.campaign.id ?? "";

	const { integration, isConnected, isLoading, remove, isRemoving } =
		useDiscordIntegration({ campaignId });

	const handleAddBot = () => {
		window.location.assign(buildDiscordOAuthUrl(campaignId));
	};

	const handleRemove = () => {
		remove();
	};

	if (isLoading) {
		return (
			<div className="mx-auto max-w-2xl py-8">
				<PageHeader isLoading />
				<div className="space-y-3">
					{Array.from({ length: 2 }).map((_, i) => (
						<div
							className="h-28 animate-pulse rounded-xl border border-border bg-muted"
							key={i}
						/>
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-2xl py-8">
			<PageHeader isConnected={isConnected} />

			{integration ? (
				<ConnectedState
					campaignId={campaignId}
					integration={integration}
					isDm={isDm}
					isRemoving={isRemoving}
					onRemove={handleRemove}
				/>
			) : (
				<DisconnectedState isDm={isDm} onAddBot={handleAddBot} />
			)}

			<p className="mt-8 text-xs text-muted-foreground text-center">
				By adding Beny Bot, you agree to our{" "}
				<Link
					className="underline underline-offset-4 hover:text-foreground"
					to="/discord/terms"
				>
					Terms of Service
				</Link>{" "}
				and{" "}
				<Link
					className="underline underline-offset-4 hover:text-foreground"
					to="/discord/privacy"
				>
					Privacy Policy
				</Link>
				.
			</p>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Page header
// ---------------------------------------------------------------------------

function PageHeader({
	isConnected,
	isLoading,
}: {
	isConnected?: boolean;
	isLoading?: boolean;
}) {
	return (
		<div className="mb-8 flex items-center gap-4">
			<div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted">
				<DiscordIcon />
			</div>
			<div>
				<div className="flex items-center gap-2">
					<h1 className="text-xl font-medium">Discord</h1>
					{!isLoading && (
						<Badge
							className={
								isConnected
									? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
									: ""
							}
							variant={isConnected ? "default" : "secondary"}
						>
							{isConnected ? "Connected" : "Not connected"}
						</Badge>
					)}
				</div>
				<p className="text-sm text-muted-foreground">
					Scheduling polls, session announcements, and recap delivery via Beny
					Bot.
				</p>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Connected state
// ---------------------------------------------------------------------------

function ConnectedState({
	integration,
	isRemoving,
	onRemove,
	isDm,
	campaignId,
}: {
	integration: CampaignIntegration;
	campaignId: string;
	isDm: boolean;
	isRemoving: boolean;
	onRemove: () => void;
}) {
	const [serverId, setServerId] = useState(integration.externalId);

	return (
		<div className="space-y-4">
			{isDm && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Connection</CardTitle>
						<CardDescription>
							Beny Bot is active in your Discord server.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="flex items-center justify-between text-sm">
							<div className="flex items-center gap-2 text-muted-foreground">
								<HashIcon className="h-4 w-4" />
								<span>Server</span>
							</div>
							<ToggleDisplayInput
								disabled
								initialValue={integration.metaData.serverName}
								onChange={setServerId}
								toggleLabel="View ID"
								value={serverId}
							/>
						</div>
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader>
					<CardTitle className="text-base">
						{isDm ? "What Beny Bot does" : "Active features"}
					</CardTitle>
					{!isDm && (
						<CardDescription>
							Beny Bot is active in this campaign's Discord server.
						</CardDescription>
					)}
				</CardHeader>
				<CardContent>
					<ul className="space-y-2 text-sm text-muted-foreground">
						{CAPABILITIES.map((c) => (
							<li className="flex items-center gap-2" key={c}>
								<span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
								{c}
							</li>
						))}
					</ul>
					{!isDm && (
						<p className="mt-4 text-xs text-muted-foreground">
							Only the Dungeon Master can manage integrations.
						</p>
					)}
				</CardContent>
			</Card>

			{isDm && <DiscordIntegrationSettings campaignId={campaignId} />}

			{isDm && (
				<Card className="border-destructive/40">
					<CardHeader>
						<CardTitle className="text-base text-destructive">
							Danger zone
						</CardTitle>
						<CardDescription>
							Removing this integration will stop Beny Bot from posting to your
							server.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button
									className="hover:opacity-80"
									disabled={isRemoving}
									size="sm"
									variant="destructive"
								>
									<Trash2Icon className="mr-2 h-4 w-4" />
									{isRemoving ? "Removing…" : "Remove integration"}
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>
										Remove Discord integration?
									</AlertDialogTitle>
									<AlertDialogDescription>
										Beny Bot will stop sending session announcements, reminders,
										and recaps to your server. You can reconnect at any time.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel className="hover:opacity-80">
										Cancel
									</AlertDialogCancel>
									<AlertDialogAction
										className="hover:opacity-80"
										onClick={onRemove}
									>
										Remove
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Disconnected state
// ---------------------------------------------------------------------------

function DisconnectedState({
	onAddBot,
	isDm,
}: {
	onAddBot: () => void;
	isDm: boolean;
}) {
	if (!isDm) {
		return (
			<div className="space-y-4">
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Not connected</CardTitle>
						<CardDescription>
							This campaign hasn't connected Discord yet.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ul className="space-y-2 text-sm text-muted-foreground">
							{CAPABILITIES.map((c) => (
								<li className="flex items-center gap-2" key={c}>
									<span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-muted-foreground/50" />
									{c}
								</li>
							))}
						</ul>
						<p className="mt-4 text-xs text-muted-foreground">
							Only the Dungeon Master can connect integrations.
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle className="text-base">
						Add Beny Bot to your server
					</CardTitle>
					<CardDescription>
						Authorize Beny Bot on your Discord server to enable scheduling,
						reminders, and session recaps directly in your party's channel.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<ul className="space-y-2 text-sm text-muted-foreground">
						{CAPABILITIES.map((c) => (
							<li className="flex items-center gap-2" key={c}>
								<span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-muted-foreground/50" />
								{c}
							</li>
						))}
					</ul>
					<Button
						className="gap-2 hover:opacity-80"
						onClick={onAddBot}
					>
						<BotIcon className="h-4 w-4" />
						Add Beny Bot to Discord
						<ExternalLinkIcon className="h-3.5 w-3.5 opacity-60" />
					</Button>
				</CardContent>
			</Card>

			<Card className="border-dashed">
				<CardHeader>
					<CardTitle className="text-sm font-normal text-muted-foreground">
						How it works
					</CardTitle>
				</CardHeader>
				<CardContent>
					<ol className="list-none space-y-2 text-sm text-muted-foreground">
						{HOW_IT_WORKS.map((step, i) => (
							<li className="flex items-start gap-3" key={step}>
								<span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-border text-xs">
									{i + 1}
								</span>
								{step}
							</li>
						))}
					</ol>
				</CardContent>
			</Card>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Static content
// ---------------------------------------------------------------------------

const CAPABILITIES = [
	"Session scheduling polls sent directly to your party",
	"Automated reminders before each session",
	"Post-session recaps published to your channel",
	"Real-time notifications for campaign updates",
];

const HOW_IT_WORKS = [
	'Click "Add Beny Bot to Discord" and authorize it on your server.',
	"Discord redirects back here with your server ID.",
	"Party Planner links your campaign to that server.",
	"Beny Bot is ready — configure which channel to use in settings.",
];
