import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
	component: Page,
});

function Page() {
	return (
		<div className="min-h-screen w-full bg-background">
			{/* Hero */}
			<section className="flex flex-col items-center text-center py-24 px-4">
				<h1 className="text-4xl font-bold max-w-2xl">
					Welcome to Party Planner. Where running a D&D campaign becomes easy!
				</h1>
				<p className="text-lg text-muted-foreground mt-4 max-w-xl">
					Schedule sessions, manage NPCs, sync with Foundry, and keep your party
					in the loop — all in one place.
				</p>
				<Button className="mt-6">Start building for free</Button>
			</section>

			{/* How it works */}
			<section className="flex flex-col items-center text-center py-16 px-4 bg-muted">
				<h2 className="text-2xl font-bold">How it works</h2>
				<div className="flex flex-col md:flex-row gap-8 mt-8 max-w-3xl w-full justify-center">
					<div className="flex-1">
						<p className="font-semibold">1. Create your campaign</p>
						<p className="text-muted-foreground text-sm mt-1">
							Set up your world, players, and NPCs in minutes.
						</p>
					</div>
					<div className="flex-1">
						<p className="font-semibold">2. Invite via Discord</p>
						<p className="text-muted-foreground text-sm mt-1">
							The bot handles scheduling, reminders, and recap publishing.
						</p>
					</div>
					<div className="flex-1">
						<p className="font-semibold">3. Run your session</p>
						<p className="text-muted-foreground text-sm mt-1">
							Get an AI-generated brief before every session with full context.
						</p>
					</div>
				</div>
			</section>

			{/* Features */}
			<section className="flex flex-col items-center text-center py-16 px-4">
				<h2 className="text-2xl font-bold">Everything a DM needs</h2>
				<div className="flex flex-col md:flex-row gap-8 mt-8 max-w-4xl w-full">
					<div className="flex-1">
						<p className="font-semibold">Session Scheduling</p>
						<p className="text-muted-foreground text-sm mt-1">
							Create sessions, poll your party for availability, and send
							automatic reminders.
						</p>
					</div>
					<div className="flex-1">
						<p className="font-semibold">NPC & Lore Management</p>
						<p className="text-muted-foreground text-sm mt-1">
							Track relationships, factions, locations, and plot arcs across
							your entire campaign.
						</p>
					</div>
					<div className="flex-1">
						<p className="font-semibold">Foundry VTT Sync</p>
						<p className="text-muted-foreground text-sm mt-1">
							Keep your game data in sync between Party Planner and Foundry
							automatically.
						</p>
					</div>
				</div>
			</section>

			{/* Discord callout */}
			<section className="flex flex-col items-center text-center py-16 px-4 bg-muted">
				<h2 className="text-2xl font-bold">Built around Discord</h2>
				<p className="text-muted-foreground mt-4 max-w-xl">
					Party Planner's bot lives in your server. It schedules sessions,
					publishes recaps, and keeps your players informed without them ever
					needing to open the app.
				</p>
			</section>

			{/* AI callout */}
			<section className="flex flex-col items-center text-center py-16 px-4">
				<h2 className="text-2xl font-bold">AI that knows your campaign</h2>
				<p className="text-muted-foreground mt-4 max-w-xl">
					Generate NPC backstories, get a pre-session brief of open plot
					threads, and publish AI-assisted recaps after every session.
				</p>
			</section>

			{/* Bottom CTA */}
			<section className="flex flex-col items-center text-center py-24 px-4 bg-muted">
				<h2 className="text-2xl font-bold">Ready to run a better campaign?</h2>
				<p className="text-muted-foreground mt-4">
					Free to get started. No credit card required.
				</p>
				<Button className="mt-6">Start building for free</Button>
			</section>
		</div>
	);
}
