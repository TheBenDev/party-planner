import SidebarComponent from "@/components/sidebar";

export default function CampaignShell({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="flex min-h-screen">
			<SidebarComponent />
			<main className="flex-1 p-6">{children}</main>
		</div>
	);
}
