import {
	SignedIn,
	SignedOut,
	SignInButton,
	SignUpButton,
} from "@clerk/clerk-react";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import ProfileButtonComponent from "@/components/profile-button";
import AppClerkProvider from "@/integrations/clerk/provider";
import TanStackQueryProvider from "@/integrations/tanstack-query/root-provider";
import appCss from "@/styles.css?url";

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
			</head>
			<body className="antialiased">
				<AppClerkProvider>
					<TanStackQueryProvider>
						<header className="flex justify-end items-center px-4 py-1 gap-4 h-14 border-b border-muted-foreground/20">
							<SignedOut>
								<SignInButton>
									<button
										className="h-8 px-3 text-sm font-medium border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
										type="button"
									>
										Sign In
									</button>
								</SignInButton>
								<SignUpButton>
									<button
										className="h-8 px-3 text-sm font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-md hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors cursor-pointer"
										type="button"
									>
										Sign Up
									</button>
								</SignUpButton>
							</SignedOut>
							<SignedIn>
								<ProfileButtonComponent />
							</SignedIn>
						</header>
						<Outlet />
					</TanStackQueryProvider>
				</AppClerkProvider>
				<Scripts />
			</body>
		</html>
	);
}
