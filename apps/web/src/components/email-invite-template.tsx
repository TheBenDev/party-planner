import {
	Body,
	Button,
	Container,
	Head,
	Heading,
	Html,
	pixelBasedPreset,
	Section,
	Tailwind,
} from "@react-email/components";
import type * as React from "react";

interface DndInviteEmailProps {
	campaignName: string;
	dmName: string;
	acceptLink: string;
}

export const DndInviteEmail: React.FC<Readonly<DndInviteEmailProps>> = ({
	campaignName,
	dmName,
	acceptLink,
}) => (
	<Html>
		<Head />
		<Tailwind
			config={{
				presets: [pixelBasedPreset],
				theme: {
					extend: {
						colors: {
							crimson: "#8b0000",
							gold: "#ffd700",
						},
					},
				},
			}}
		>
			<Body className="bg-[#0f0f0f] font-sans py-10 px-5">
				<Container className="max-w-[500px] mx-auto bg-[#1a1a1a] rounded-xl overflow-hidden border-2 border-crimson">
					{/* Header Icon */}
					<Section className="bg-crimson py-10 text-center">
						<div className="text-6xl m-0 leading-none">🎲</div>
					</Section>

					{/* Main Content */}
					<Section className="py-10 px-8 text-center">
						<Heading className="text-gold text-[28px] font-bold m-0 mb-8">
							You've been invited!
						</Heading>

						<p className="text-[#b0b0b0] text-base m-0 mb-5">
							You've been invited to join
						</p>

						<Section className="bg-[#2a2a2a] border-2 border-crimson rounded-lg p-5 mb-6">
							<div className="text-gold text-2xl font-bold m-0">
								{campaignName}
							</div>
						</Section>

						<p className="text-[#b0b0b0] text-base m-0 mb-9">
							Campaign run by{" "}
							<span className="text-gold font-bold">{dmName}</span>
						</p>

						{/* Accept Button */}
						<Section className="text-center mb-8">
							<div className="bg-crimson inline-block py-4 px-12 rounded-lg border-2 border-gold">
								<Button href={acceptLink}>
									<span className="text-gold text-lg font-bold no-underline">
										Accept Invitation
									</span>
								</Button>
							</div>
						</Section>

						<p className="text-[#808080] text-sm italic m-0">
							Ready your dice and prepare for adventure!
						</p>
					</Section>
				</Container>
			</Body>
		</Tailwind>
	</Html>
);

export default DndInviteEmail;
