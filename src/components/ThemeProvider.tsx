import type React from "react";
import { createContext, useContext, useEffect } from "react";
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

	useEffect(() => {
		// Single source of truth: apply the store theme to the document element.
		// The store initializes from localStorage on load, so no re-sync loop here.
		const root = window.document.documentElement;
		if (theme === "dark") {
			root.classList.add("dark");
		} else {
			root.classList.remove("dark");
		}
	}, [theme]);

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
