import { useNavigate } from "@tanstack/react-router";
import { Calendar, type LucideIcon, Shield, Star, User } from "lucide-react";

const features: { description: string; label: string; Icon: LucideIcon }[] = [
	{
		description: "Schedule & recap every session",
		Icon: Calendar,
		label: "Sessions",
	},
	{
		description: "Track party & NPC lore",
		Icon: User,
		label: "Characters",
	},
	{
		description: "Map open plot threads",
		Icon: Shield,
		label: "Quests",
	},
];

export function EmptyCampaignDashboard() {
	const navigate = useNavigate();

	return (
		<div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-8 text-center">
			<div className="w-24 h-24 rounded-full border border-border flex items-center justify-center mb-8 relative bg-muted">
				<div className="absolute inset-1.5 rounded-full border border-border/40" />
				<Star className="w-10 h-10 text-foreground/30" />
			</div>

			<h1 className="font-cinzel text-2xl font-medium tracking-wide mb-2">
				No campaign active
			</h1>
			<p className="text-muted-foreground italic text-lg font-light mb-10 max-w-sm leading-relaxed">
				Your adventure awaits. Create a new campaign or join one to begin your
				chronicle.
			</p>

			<div className="flex gap-3 flex-wrap justify-center mb-12">
				<button
					className="font-cinzel text-sm tracking-widest px-6 py-2.5 rounded-md bg-foreground text-background hover:opacity-80 transition-opacity"
					onClick={() => navigate({ to: "/campaign/create" })}
					type="button"
				>
					Create campaign
				</button>
				<button
					className="font-cinzel text-sm tracking-widest px-6 py-2.5 rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
					type="button"
				>
					Join with code
				</button>
			</div>

			<div className="flex items-center gap-4 w-full max-w-md mb-8">
				<div className="flex-1 h-px bg-border" />
				<span className="font-cinzel text-[11px] tracking-widest text-muted-foreground uppercase">
					What awaits you
				</span>
				<div className="flex-1 h-px bg-border" />
			</div>

			<div className="grid grid-cols-3 gap-3 w-full max-w-lg">
				{features.map((f) => (
					<div
						className="bg-muted/50 border border-border rounded-xl p-4 text-center"
						key={f.label}
					>
						<f.Icon className="w-6 h-6 mx-auto mb-2 text-foreground/40" />
						<p className="font-cinzel text-[11px] tracking-wide text-muted-foreground mb-1">
							{f.label}
						</p>
						<p className="text-xs italic text-muted-foreground/70 leading-snug">
							{f.description}
						</p>
					</div>
				))}
			</div>
		</div>
	);
}
