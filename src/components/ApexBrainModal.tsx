import { Brain, Command, Sliders, Sparkles, X } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useIntegrationsStore } from "../store/useIntegrationsStore";

interface ApexBrainModalProps {
	isOpen: boolean;
	onClose: () => void;
	onNavigate?: (tab: any) => void;
}

export const ApexBrainModal: React.FC<ApexBrainModalProps> = ({
	isOpen,
	onClose,
	onNavigate: _onNavigate,
}) => {
	const { rag, updateRagConfig, recordAiUsage } = useIntegrationsStore();
	const [query, setQuery] = useState("");
	const [showSettings, setShowSettings] = useState(false);
	const [isSearching, setIsSearching] = useState(false);
	const [aiAnswer, setAiAnswer] = useState<string | null>(null);

	// Keyboard listener for Cmd+K / Ctrl+K
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				if (isOpen) onClose();
			}
			if (e.key === "Escape" && isOpen) {
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		if (!query.trim()) return;

		setIsSearching(true);
		setAiAnswer(null);

		setTimeout(() => {
			setIsSearching(false);
			setAiAnswer(
				`Basado en el índice vectorial de PLOTTIO (similitud cosine: ${(rag.similarityThreshold * 100).toFixed(0)}%):\n\n• Se identificaron 3 proyectos relevantes de rotulado con características similares para "${query}".\n• El material óptimo en stock es Vinilo Polimérico Cast 3M Serie 1080/2080 (32 metros disponibles).\n• El tiempo estimado de instalación según órdenes previas es de 1.5 jornadas hábiles.\n• Margen de rentabilidad recomendado: 48%.`,
			);
			recordAiUsage(412, 0.0008);
		}, 900);
	};

	return (
		<div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 sm:pt-20 bg-black/65 backdrop-blur-sm animate-fade-in">
			<button
				type="button"
				className="fixed inset-0 w-full h-full cursor-default"
				onClick={onClose}
				aria-label="Cerrar APEX Brain"
			/>
			<div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl z-10 animate-slide-in flex flex-col">
				{/* Top Search Input Bar */}
				<form
					onSubmit={handleSearch}
					className="flex items-center px-4 py-3.5 border-b border-border gap-3 shrink-0"
				>
					<Brain className="h-5 w-5 text-primary shrink-0 animate-pulse" />
					<input
						type="text"
						placeholder="Pregunta a APEX Brain o busca semánticamente en el taller... (ej. 'camioneta dmax vinilo mate')"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						className="flex-1 bg-transparent text-sm sm:text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
					/>
					<button
						type="button"
						onClick={() => setShowSettings((v) => !v)}
						className={`p-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 shrink-0 ${
							showSettings
								? "border-primary bg-primary/10 text-primary"
								: "border-border bg-background text-muted-foreground hover:bg-secondary"
						}`}
						title="Calibración RAG"
					>
						<Sliders className="h-4 w-4" />
						<span className="hidden sm:inline">Calibración</span>
					</button>
					<button
						type="button"
						onClick={onClose}
						className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
					>
						<X className="h-5 w-5" />
					</button>
				</form>

				{/* Token Calibration Slider Drawer */}
				{showSettings && (
					<div className="p-4 bg-secondary/20 border-b border-border grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs animate-fade-in">
						<div>
							<div className="flex justify-between font-semibold text-muted-foreground mb-1">
								<span>Umbral Similitud:</span>
								<span className="text-foreground font-mono font-bold">
									{rag.similarityThreshold}
								</span>
							</div>
							<input
								type="range"
								min={0.5}
								max={0.95}
								step={0.01}
								value={rag.similarityThreshold}
								onChange={(e) =>
									updateRagConfig({
										similarityThreshold: Number(e.target.value),
									})
								}
								className="w-full accent-primary cursor-pointer"
							/>
						</div>

						<div>
							<div className="flex justify-between font-semibold text-muted-foreground mb-1">
								<span>Fragmentos (Chunks):</span>
								<span className="text-foreground font-mono font-bold">
									{rag.maxContextChunks}
								</span>
							</div>
							<input
								type="range"
								min={2}
								max={12}
								step={1}
								value={rag.maxContextChunks}
								onChange={(e) =>
									updateRagConfig({ maxContextChunks: Number(e.target.value) })
								}
								className="w-full accent-primary cursor-pointer"
							/>
						</div>

						<div>
							<div className="flex justify-between font-semibold text-muted-foreground mb-1">
								<span>Temperatura:</span>
								<span className="text-foreground font-mono font-bold">
									{rag.temperature}
								</span>
							</div>
							<input
								type="range"
								min={0}
								max={1}
								step={0.05}
								value={rag.temperature}
								onChange={(e) =>
									updateRagConfig({ temperature: Number(e.target.value) })
								}
								className="w-full accent-primary cursor-pointer"
							/>
						</div>
					</div>
				)}

				{/* Body Content */}
				<div className="p-5 overflow-y-auto space-y-4">
					{isSearching && (
						<div className="py-8 flex flex-col items-center justify-center gap-3 text-muted-foreground">
							<Sparkles className="h-6 w-6 text-primary animate-spin" />
							<span className="text-xs font-semibold">
								Consultando vectores de pgvector y generando síntesis...
							</span>
						</div>
					)}

					{aiAnswer && !isSearching && (
						<div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
							<div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
								<Sparkles className="h-4 w-4" />
								<span>Respuesta Asistida por APEX Brain (RAG)</span>
							</div>
							<p className="text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap">
								{aiAnswer}
							</p>
						</div>
					)}

					{/* Quick Suggestions & Index Status */}
					<div className="pt-2">
						<div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5">
							Consultas Rápidas de Taller
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
							{[
								"¿Qué vinilo rinde mejor en buses urbanos?",
								"Buscar cotizaciones pendientes de clientes corporativos",
								"Verificar stock de vinilo reflectivo microprismático",
								"Historial de mantenimiento para flota Chevrolet",
							].map((s) => (
								<button
									key={s}
									type="button"
									onClick={() => {
										setQuery(s);
									}}
									className="p-2.5 rounded-lg border border-border bg-secondary/15 hover:bg-secondary text-foreground text-left transition-colors cursor-pointer"
								>
									{s}
								</button>
							))}
						</div>
					</div>

					{/* Footer Index Info */}
					<div className="pt-4 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
						<span>
							Base de conocimiento: {rag.indexedDocumentsCount} entidades
							indexadas con pgvector
						</span>
						<span className="flex items-center gap-1 font-mono">
							<Command className="h-3 w-3" /> + K para abrir
						</span>
					</div>
				</div>
			</div>
		</div>
	);
};
