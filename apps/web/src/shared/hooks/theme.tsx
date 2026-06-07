import { createContext, useContext, useEffect, useState } from "react";
import z from "zod";

const ThemeSchema = z.literal("light").or(z.literal("dark"));
type Theme = z.infer<typeof ThemeSchema>;
interface ThemeContextValue {
	theme: Theme;
	toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getInitialTheme(): Theme {
	if (typeof window === "undefined") return "light";
	const stored = localStorage.getItem("theme");
	const parsed = ThemeSchema.safeParse(stored);
	if (parsed.success) return parsed.data;
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
	const [theme, setTheme] = useState<Theme>(getInitialTheme);

	useEffect(() => {
		document.documentElement.classList.toggle("dark", theme === "dark");
	}, [theme]);

	useEffect(() => {
		const mq = window.matchMedia("(prefers-color-scheme: dark)");
		function handleChange(e: MediaQueryListEvent) {
			if (!ThemeSchema.safeParse(localStorage.getItem("theme")).success) {
				setTheme(e.matches ? "dark" : "light");
			}
		}
		mq.addEventListener("change", handleChange);
		return () => mq.removeEventListener("change", handleChange);
	}, []);

	function toggleTheme() {
		setTheme((prev) => {
			const next = prev === "dark" ? "light" : "dark";
			localStorage.setItem("theme", next);
			return next;
		});
	}

	return (
		<ThemeContext.Provider value={{ theme, toggleTheme }}>
			{children}
		</ThemeContext.Provider>
	);
}

export function useTheme() {
	const ctx = useContext(ThemeContext);
	if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
	return ctx;
}

export const FOUC_PREVENTION_SCRIPT = `(function(){var t=localStorage.getItem('theme');var d=t??(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.classList.toggle('dark',d==='dark');})();`;
