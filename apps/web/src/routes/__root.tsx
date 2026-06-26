import { SignedIn, SignedOut } from "@clerk/clerk-react";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import appCss from "@/global.css?url";
import AuthButtonComponent from "@/shared/components/AuthButton";
import ProfileButtonComponent from "@/shared/components/ProfileButton";
import { FOUC_PREVENTION_SCRIPT, ThemeProvider } from "@/shared/hooks/theme";
import AppClerkProvider from "@/shared/lib/clerk-provider";
import TanStackQueryProvider from "@/shared/lib/tanstack-query-provider";

interface RouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
	head: () => ({
		links: [{ href: appCss, rel: "stylesheet" }],
		meta: [
			{ charSet: "utf-8" },
			{ content: "width=device-width, initial-scale=1", name: "viewport" },
			{ title: "Party Planner App" },
			{
				content: "Document and schedule D&D campaign",
				name: "description",
			},
		],
	}),
	shellComponent: RootDocument,
});

function RootDocument() {
	return (
		<html lang="en">
			<head>
				<HeadContent />
				{/* Blocking script — runs before React hydrates to prevent dark-mode flash */}
				<script dangerouslySetInnerHTML={{ __html: FOUC_PREVENTION_SCRIPT }} />
			</head>
			<body className="antialiased">
				<ThemeProvider>
					<AppClerkProvider>
						<TanStackQueryProvider>
							<header className="flex justify-start items-center px-4 py-1 gap-4 h-14 border-b border-muted-foreground/20">
								<SignedOut>
									<AuthButtonComponent />
								</SignedOut>
								<SignedIn>
									<ProfileButtonComponent />
								</SignedIn>
							</header>
							<Outlet />
						</TanStackQueryProvider>
					</AppClerkProvider>
				</ThemeProvider>
				<Scripts />
			</body>
		</html>
	);
}
