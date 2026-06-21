import { Link } from "@tanstack/react-router";

export function TermsPage() {
	return (
		<div className="mx-auto max-w-2xl px-4 py-12">
			<Link
				className="mb-8 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
				to="/campaign/integrations/discord"
			>
				← Back to Discord integration
			</Link>
			<h1 className="text-2xl font-bold mb-2">Beny Bot — Terms of Service</h1>
			<p className="text-sm text-muted-foreground mb-8">
				Last updated: June 2026
			</p>

			<section className="space-y-4 mb-8">
				<h2 className="text-lg font-semibold">1. Acceptance</h2>
				<p className="text-sm text-muted-foreground">
					By adding Beny Bot to your Discord server, you agree to these terms.
					If you do not agree, do not authorize the bot.
				</p>
			</section>

			<section className="space-y-4 mb-8">
				<h2 className="text-lg font-semibold">2. What Beny Bot does</h2>
				<p className="text-sm text-muted-foreground">
					Beny Bot is a Discord bot built for tabletop RPG campaigns. Once
					authorized, it posts session scheduling polls, session announcements,
					reminders, and post-session recaps to a channel you configure in your
					Party Planner campaign settings.
				</p>
			</section>

			<section className="space-y-4 mb-8">
				<h2 className="text-lg font-semibold">3. Acceptable use</h2>
				<p className="text-sm text-muted-foreground">
					Beny Bot may only be used for its intended purpose: coordinating
					tabletop RPG sessions within your Discord server. You agree not to
					exploit or misuse the bot to send unsolicited messages, harass server
					members, or violate Discord's own Terms of Service. You are
					responsible for all bot activity in servers you authorize.
				</p>
			</section>

			<section className="space-y-4 mb-8">
				<h2 className="text-lg font-semibold">4. Bot availability</h2>
				<p className="text-sm text-muted-foreground">
					Beny Bot is provided as-is. We do not guarantee uninterrupted
					availability. The bot may be updated, modified, or taken offline at
					any time without notice. You can remove it from your server at any
					time.
				</p>
			</section>

			<section className="space-y-4 mb-8">
				<h2 className="text-lg font-semibold">5. Limitation of liability</h2>
				<p className="text-sm text-muted-foreground">
					To the fullest extent permitted by law, we are not liable for any
					indirect, incidental, or consequential damages arising from Beny Bot's
					presence in or actions on your Discord server.
				</p>
			</section>

			<section className="space-y-4 mb-8">
				<h2 className="text-lg font-semibold">6. Changes</h2>
				<p className="text-sm text-muted-foreground">
					These terms may be updated at any time. Continued use of Beny Bot
					after changes are posted constitutes acceptance of the updated terms.
				</p>
			</section>

			<section className="space-y-4">
				<h2 className="text-lg font-semibold">7. Contact</h2>
				<p className="text-sm text-muted-foreground">
					Questions about these terms can be sent to{" "}
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
