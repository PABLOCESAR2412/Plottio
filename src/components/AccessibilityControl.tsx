import { Eye, Minus, Plus, RotateCcw } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import {
	FONT_SIZE_OPTIONS,
	useAccessibilityStore,
} from "../store/useAccessibilityStore";

export const AccessibilityControl: React.FC = () => {
	const {
		fontSizeLevel,
		setFontSizeLevel,
		increaseFontSize,
		decreaseFontSize,
		resetFontSize,
	} = useAccessibilityStore();

	const [isOpen, setIsOpen] = useState(false);
	const popoverRef = useRef<HTMLDivElement>(null);

	// Cerrar al hacer click fuera
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				popoverRef.current &&
				!popoverRef.current.contains(e.target as Node)
			) {
				setIsOpen(false);
			}
		};
		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isOpen]);

	const currentOption =
		FONT_SIZE_OPTIONS.find((o) => o.level === fontSizeLevel) ||
		FONT_SIZE_OPTIONS[1];

	return (
		<div className="relative inline-block" ref={popoverRef}>
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				aria-expanded={isOpen}
				aria-haspopup="true"
				aria-label="Ajustar accesibilidad y tamaño de letra"
				className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-border bg-background hover:bg-secondary text-xs text-foreground transition-all cursor-pointer shadow-xs"
				title="Ajustar tamaño de fuente (Accesibilidad)"
			>
				<Eye className="h-3.5 w-3.5 text-primary" />
				<span className="font-mono font-bold text-xs">
					{currentOption.label}
				</span>
			</button>

			{isOpen && (
				<div
					role="dialog"
					aria-label="Controles de accesibilidad tipográfica"
					className="absolute right-0 mt-2 w-64 p-3 bg-card border border-border rounded-xl shadow-xl z-50 animate-slide-in text-xs space-y-3"
				>
					<div className="flex items-center justify-between border-b border-border/70 pb-2">
						<span className="font-bold text-foreground flex items-center gap-1.5">
							<Eye className="h-3.5 w-3.5 text-primary" />
							Accesibilidad Visual
						</span>
						<button
							type="button"
							onClick={resetFontSize}
							className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer"
							title="Restablecer a 100%"
							aria-label="Restablecer tamaño normal"
						>
							<RotateCcw className="h-3 w-3" />
							<span>100%</span>
						</button>
					</div>

					<div className="space-y-1.5">
						<div className="flex justify-between text-[11px] text-muted-foreground">
							<span>Nivel activo:</span>
							<span className="font-semibold text-foreground">
								{currentOption.description}
							</span>
						</div>

						{/* 5 niveles interactivos */}
						<fieldset
							className="grid grid-cols-5 gap-1 pt-1 border-0 p-0 m-0"
							aria-label="Seleccionar tamaño de letra"
						>
							{FONT_SIZE_OPTIONS.map((opt) => {
								const isSelected = opt.level === fontSizeLevel;
								return (
									<button
										key={opt.level}
										type="button"
										onClick={() => setFontSizeLevel(opt.level)}
										aria-pressed={isSelected}
										aria-label={opt.description}
										title={opt.description}
										className={`py-1.5 px-1 rounded-lg text-center font-bold text-xs transition-all cursor-pointer border ${
											isSelected
												? "bg-primary text-primary-foreground border-primary shadow-xs"
												: "bg-secondary/40 hover:bg-secondary text-muted-foreground hover:text-foreground border-border/60"
										}`}
									>
										{opt.label}
									</button>
								);
							})}
						</fieldset>
					</div>

					{/* Botones de incremento / decremento rápido */}
					<div className="flex items-center justify-between pt-1 border-t border-border/60">
						<button
							type="button"
							onClick={decreaseFontSize}
							disabled={fontSizeLevel === "compact"}
							aria-label="Disminuir tamaño de letra"
							className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary text-foreground hover:bg-secondary/80 disabled:opacity-40 transition-all cursor-pointer font-medium text-[11px]"
						>
							<Minus className="h-3 w-3" />
							<span>Menor</span>
						</button>

						<button
							type="button"
							onClick={increaseFontSize}
							disabled={fontSizeLevel === "xlarge"}
							aria-label="Aumentar tamaño de letra"
							className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary text-foreground hover:bg-secondary/80 disabled:opacity-40 transition-all cursor-pointer font-medium text-[11px]"
						>
							<Plus className="h-3 w-3" />
							<span>Mayor</span>
						</button>
					</div>
				</div>
			)}
		</div>
	);
};
