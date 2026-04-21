import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RootErrorBoundary({ error, reset }: ErrorComponentProps) {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
			<AlertCircle className="size-12 text-destructive" />
			<h1 className="mt-4 font-bold text-3xl">Something went wrong</h1>
			{error?.message && (
				<p className="mt-2 max-w-sm text-muted-foreground">{error.message}</p>
			)}
			<div className="mt-8 flex gap-3">
				<Button onClick={reset} variant="default">
					Try again
				</Button>
				<Button asChild variant="outline">
					<Link to="/">Go home</Link>
				</Button>
			</div>
		</div>
	);
}
