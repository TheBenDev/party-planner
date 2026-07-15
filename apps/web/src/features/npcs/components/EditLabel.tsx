import type { ReactNode } from "react";
import { Label } from "@/shared/components/ui/label";
import { cn } from "@/shared/lib/utils";

export default function EditLabel({
	className,
	children,
}: {
	className?: string;
	children?: ReactNode;
}) {
	return <Label className={cn("mt-4", className)}>{children}</Label>;
}
