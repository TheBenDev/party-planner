import { Link } from "@tanstack/react-router";

export function PrivacyPage() {
	return (
		<div className="mx-auto max-w-2xl px-4 py-12">
			<Link
				className="mb-8 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
				to="/campaign/integrations/discord"
			>
				← Back to Discord integration
			</Link>
			<h1 className="text-2xl font-bold mb-2">Beny Bot — Privacy Policy</h1>
			<p className="text-sm text-muted-foreground mb-8">
				Last updated: June 2026
			</p>

			<section className="space-y-4 mb-8">
				<h2 className="text-lg font-semibold">1. What we collect</h2>
				<p className="text-sm text-muted-foreground">
					When you authorize Beny Bot on your Discord server, we collect and
					store your Discord server ID, server name, and the channel ID you
					configure for bot messages. Discord user IDs are used transiently for
					rate limiting bot commands and are never persisted to our database.
				</p>
			</section>

			<section className="space-y-4 mb-8">
				<h2 className="text-lg font-semibold">2. How we use it</h2>
				<p className="text-sm text-muted-foreground">
					Your server ID and channel ID are used solely to deliver Beny Bot
					messages — session scheduling polls, announcements, reminders, and
					recaps — to the correct server and channel. We do not read message
					history, monitor conversations, or share this data with third parties.
				</p>
			</section>

			<section className="space-y-4 mb-8">
				<h2 className="text-lg font-semibold">3. Data storage</h2>
				<p className="text-sm text-muted-foreground">
					Discord server and channel data is stored in a hosted Postgres
					database (Neon) in the United States, linked to your Party Planner
					campaign.
				</p>
			</section>

			<section className="space-y-4 mb-8">
				<h2 className="text-lg font-semibold">4. Data retention</h2>
				<p className="text-sm text-muted-foreground">
					Discord integration data is retained as long as the integration
					remains active. You can remove Beny Bot from your campaign at any time
					from the Discord integration settings page, which permanently deletes
					the stored server and channel data.
				</p>
			</section>

			<section className="space-y-4 mb-8">
				<h2 className="text-lg font-semibold">5. Discord's role</h2>
				<p className="text-sm text-muted-foreground">
					Beny Bot operates on Discord's platform and is subject to Discord's
					own privacy policy. We only receive the server and channel information
					you explicitly grant during authorization — we do not receive access
					to your DMs, other channels, or server member data beyond what Discord
					exposes during slash command interactions.
				</p>
			</section>

			<section className="space-y-4 mb-8">
				<h2 className="text-lg font-semibold">6. Changes</h2>
				<p className="text-sm text-muted-foreground">
					This policy may be updated at any time. The date at the top of this
					page reflects when it was last revised.
				</p>
			</section>

			<section className="space-y-4">
				<h2 className="text-lg font-semibold">7. Contact</h2>
				<p className="text-sm text-muted-foreground">
					Questions about this policy can be sent to{" "}
					<a
						className="underline underline-offset-4 hover:text-foreground"
						href="mailto:ben@benthedev.com"
					>
						ben@benthedev.com
					</a>
					.
				</p>
			</section>
		</div>
	);
}
