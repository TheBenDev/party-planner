import { SignInButton, SignUpButton } from "@clerk/clerk-react";
import ThemeSwitch from "./ThemeSwitch";

export default function AuthButton() {
	return (
		<div className="flex items-center gap-3">
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
			<ThemeSwitch id="theme-auth" />
		</div>
	);
}
