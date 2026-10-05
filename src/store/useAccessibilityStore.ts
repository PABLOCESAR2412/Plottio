import { create } from "zustand";
import { persist } from "zustand/middleware";

export type FontSizeLevel =
	| "compact" // 14px (1 nivel por debajo del estándar)
	| "normal" // 16px (estándar por defecto)
	| "medium" // 18px (+1 nivel)
	| "large" // 20px (+2 niveles)
	| "xlarge"; // 22px (+3 niveles)

export interface FontSizeOption {
	level: FontSizeLevel;
	label: string;
	px: number;
	percentage: string;
	description: string;
}

export const FONT_SIZE_OPTIONS: FontSizeOption[] = [
	{
		level: "compact",
		label: "A-",
		px: 14,
		percentage: "87.5%",
		description: "Compacto (14px)",
	},
	{
		level: "normal",
		label: "A",
		px: 16,
		percentage: "100%",
		description: "Estándar (16px)",
	},
	{
		level: "medium",
		label: "A+",
		px: 18,
		percentage: "112.5%",
		description: "Mediano (18px)",
	},
	{
		level: "large",
		label: "A++",
		px: 20,
		percentage: "125%",
		description: "Grande (20px)",
	},
	{
		level: "xlarge",
		label: "A+++",
		px: 22,
		percentage: "137.5%",
		description: "Extra grande (22px)",
	},
];

export function applyRootFontSize(level: FontSizeLevel): void {
	if (typeof document === "undefined") return;
	const opt = FONT_SIZE_OPTIONS.find((o) => o.level === level);
	if (opt) {
		document.documentElement.style.fontSize = opt.percentage;
	}
}

interface AccessibilityState {
	fontSizeLevel: FontSizeLevel;
	setFontSizeLevel: (level: FontSizeLevel) => void;
	increaseFontSize: () => void;
	decreaseFontSize: () => void;
	resetFontSize: () => void;
}

const ORDER: FontSizeLevel[] = [
	"compact",
	"normal",
	"medium",
	"large",
	"xlarge",
];

export const useAccessibilityStore = create<AccessibilityState>()(
	persist(
		(set, get) => ({
			fontSizeLevel: "normal",
			setFontSizeLevel: (level: FontSizeLevel) => {
				applyRootFontSize(level);
				set({ fontSizeLevel: level });
			},
			increaseFontSize: () => {
				const current = get().fontSizeLevel;
				const idx = ORDER.indexOf(current);
				if (idx < ORDER.length - 1) {
					const next = ORDER[idx + 1];
					applyRootFontSize(next);
					set({ fontSizeLevel: next });
				}
			},
			decreaseFontSize: () => {
				const current = get().fontSizeLevel;
				const idx = ORDER.indexOf(current);
				if (idx > 0) {
					const next = ORDER[idx - 1];
					applyRootFontSize(next);
					set({ fontSizeLevel: next });
				}
			},
			resetFontSize: () => {
				applyRootFontSize("normal");
				set({ fontSizeLevel: "normal" });
			},
		}),
		{
			name: "plottio-accessibility",
			onRehydrateStorage: () => (state) => {
				if (state?.fontSizeLevel) {
					applyRootFontSize(state.fontSizeLevel);
				}
			},
		},
	),
);
