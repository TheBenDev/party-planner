import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);
const isApiRoute = createRouteMatcher(["/api(.*)"]);

export default clerkMiddleware(async (auth, req) => {
	// Don't redirect api calls
	if (isApiRoute(req)) {
		return;
	}
	const { isAuthenticated, userId } = await auth();

	// Don't allow authenticated users to access public routes
	if (userId && isPublicRoute(req)) {
		return NextResponse.redirect(new URL("/dashboard", req.url));
	}

	// Redirect unauthenticated users to sign in
	if (!(isAuthenticated || isPublicRoute(req))) {
		return NextResponse.redirect(new URL("/sign-in", req.url));
	}

	return;
});
export const config = {
	matcher: [
		// Skip Next.js internals and all static files, unless found in search params
		"/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
		// Always run for API routes
		"/(api|trpc)(.*)",
	],
};
