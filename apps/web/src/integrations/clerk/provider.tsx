import { ClerkProvider } from "@clerk/clerk-react";
import { env } from "@/env";

function getPublishableKey(): string {
	const key = env.VITE_CLERK_PUBLISHABLE_KEY;
	if (!key) {
		throw new Error("Add VITE_CLERK_PUBLISHABLE_KEY to your environment.");
	}
	return key;
}

export default function AppClerkProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const publishableKey = getPublishableKey();

	return (
		<ClerkProvider afterSignOutUrl="/" publishableKey={publishableKey}>
			{children}
		</ClerkProvider>
	);
}
