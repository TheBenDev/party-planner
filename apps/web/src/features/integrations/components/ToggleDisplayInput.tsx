import { EyeIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

interface ToggleDisplayInputProps {
	initialValue: string;
	value: string;
	onChange: (value: string) => void;
	disabled?: boolean;
	placeholder?: string;
	toggleLabel?: string;
}

export function ToggleDisplayInput({
	initialValue,
	value,
	onChange,
	disabled = false,
	placeholder,
	toggleLabel = "Edit",
}: ToggleDisplayInputProps) {
	const [isEditing, setIsEditing] = useState(false);

	return (
		<div className="flex items-center gap-2">
			{isEditing ? (
				<Input
					className="h-7 w-48 font-mono text-xs"
					onChange={(e) => onChange(e.target.value)}
					placeholder={placeholder}
					readOnly={disabled}
					value={value}
				/>
			) : (
				<span className="flex h-7 w-48 items-center px-3 font-mono text-xs">
					{initialValue}
				</span>
			)}
			<Button
				className="h-6 w-6 rounded-md border border-border p-1 text-muted-foreground hover:text-foreground"
				onClick={() => setIsEditing((prev) => !prev)}
				size="sm"
				title={toggleLabel}
				type="button"
				variant="ghost"
			>
				<EyeIcon className="h-3.5 w-3.5" />
			</Button>
		</div>
	);
}
