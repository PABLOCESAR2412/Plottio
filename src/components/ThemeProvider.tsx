import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { useSessionStore } from "../store/useSessionStore";

const ThemeContext = createContext<{
	theme: "light" | "dark";
	toggleTheme: () => void;
} | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const theme = useSessionStore((s) => s.theme);
	const toggleTheme = useSessionStore((s) => s.toggleTheme);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
		// Initialize theme on mount from localStorage or system preferences
		const storedTheme = localStorage.getItem("theme") as
			| "light"
			| "dark"
			| null;

		let activeTheme = "light";
		if (storedTheme) {
			activeTheme = storedTheme;
		}

		// Apply active theme class to document element
		const root = window.document.documentElement;
		if (activeTheme === "dark") {
			root.classList.add("dark");
		} else {
			root.classList.remove("dark");
		}

		// Make sure Zustand matches the loaded value
		if (activeTheme !== theme) {
			toggleTheme();
		}
	}, []);

	// To prevent hydration flashes, we render children, but apply class in useEffect
	return (
		<ThemeContext.Provider value={{ theme, toggleTheme }}>
			{children}
		</ThemeContext.Provider>
	);
};

export const useTheme = () => {
	const context = useContext(ThemeContext);
	if (!context) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}
	return context;
};
