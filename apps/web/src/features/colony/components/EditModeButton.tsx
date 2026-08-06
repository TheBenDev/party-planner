import { Pencil, X } from "lucide-react";
export default function EditModeButton({
	className,
	isEditing,
	onClick,
	isDisabled,
	ariaLabel,
}: {
	className?: string;
	isEditing: boolean;
	onClick: () => void;
	isDisabled?: boolean;
	ariaLabel?: string;
}) {
	return (
		<button
			aria-label={ariaLabel}
			className={className}
			disabled={isDisabled}
			onClick={onClick}
			type="button"
		>
			{isEditing ? (
				<X className="w-3.5 h-3.5" />
			) : (
				<Pencil className="w-3.5 h-3.5" />
			)}
		</button>
	);
}
