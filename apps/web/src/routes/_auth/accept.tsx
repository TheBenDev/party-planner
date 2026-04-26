import { SignIn, useAuth } from "@clerk/clerk-react";
import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/accept")({
	component: InviteAcceptPage,
	validateSearch: (search) => ({
		token: (search.token as string) ?? "",
	}),
});

export default function InviteAcceptPage() {
	const { token } = Route.useSearch();
	const { isLoaded, isSignedIn } = useAuth();
	if (!isLoaded) return <div>loading...</div>;
	const redirectUrl = token ? `/join?token=${token}` : "/join";
	if (isSignedIn) {
		return <Navigate to={redirectUrl} />;
	}

	const callbackUrl = token ? `/accept?token=${token}` : "/accept";

	return (
		<div className="flex w-full min-h-9/12 justify-center items-center">
			<SignIn
				afterSignOutUrl={callbackUrl}
				forceRedirectUrl={redirectUrl}
				signUpForceRedirectUrl={redirectUrl}
			/>
		</div>
	);
}
