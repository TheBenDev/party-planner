import { SignIn } from "@clerk/clerk-react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/sign-in")({
	component: SignInPage,
});

function SignInPage() {
	return (
		<div className="flex w-full min-h-9/12 justify-center items-center">
			<SignIn />
		</div>
	);
}
