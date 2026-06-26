import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/shared/hooks/theme";
import { Switch } from "./ui/switch";

export default function ThemeSwitch({ id }: { id: string }) {
	const { theme, toggleTheme } = useTheme();

	return (
		<Switch
			checked={theme === "light"}
			className="mr-1"
			id={id}
			onClick={toggleTheme}
		>
			{theme === "dark" ? (
				<Moon className="h-2.5 w-2.5 text-slate-800" />
			) : (
				<Sun className="h-2.5 w-2.5 text-amber-500" />
			)}
		</Switch>
	);
}
