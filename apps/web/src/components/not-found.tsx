import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function RootNotFound() {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
			<h1 className="font-bold text-6xl text-muted-foreground">404</h1>
			<h2 className="mt-4 font-bold text-2xl">Page not found</h2>
			<p className="mt-2 max-w-sm text-muted-foreground">
				The page you're looking for doesn't exist.
			</p>
			<Button asChild className="mt-8">
				<Link to="/">Go home</Link>
			</Button>
		</div>
	);
}
