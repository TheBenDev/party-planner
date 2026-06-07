import Sidebar from "@/shared/components/Sidebar";

export default function CampaignShell({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="flex min-h-screen">
			<Sidebar />
			<main className="flex-1 p-6">{children}</main>
		</div>
	);
}
