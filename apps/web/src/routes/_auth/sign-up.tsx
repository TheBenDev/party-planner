import { SignUp } from "@clerk/clerk-react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/sign-up")({
	component: SignUpPage,
});

function SignUpPage() {
	return (
		<div className="flex w-full min-h-9/12 justify-center items-center">
			<SignUp />
		</div>
	);
}
