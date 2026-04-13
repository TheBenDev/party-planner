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
						<header className="flex justify-end items-center p-4 gap-4 h-16">
							<SignedOut>
								<SignInButton />
								<SignUpButton>
									<button
										className="bg-[#6c47ff] text-white rounded-full font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 cursor-pointer"
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
