import {
	BookOpen,
	Brain,
	Check,
	Coins,
	Command,
	Copy,
	FileText,
	Layers,
	Package,
	RefreshCw,
	Send,
	Sliders,
	Sparkles,
	Trash2,
	Users,
	X,
	Zap,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useIntegrationsStore } from "../store/useIntegrationsStore";

interface Citation {
	type: "documento" | "acuerdo" | "tarea" | "stock";
	title: string;
	similarity: number;
	snippet: string;
}

interface ChatMessage {
	id: string;
	role: "user" | "assistant";
	text: string;
	isStreaming?: boolean;
	citations?: Citation[];
	timestamp: string;
}

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
	const {
		rag,
		ai,
		updateRagConfig,
		indexKnowledgeBase,
		clearKnowledgeIndex,
		recordAiUsage,
	} = useIntegrationsStore();

	const [query, setQuery] = useState("");
	const [showSettings, setShowSettings] = useState(false);
	const [showDeploymentGuide, setShowDeploymentGuide] = useState(false);
	const [copiedCode, setCopiedCode] = useState<string | null>(null);

	// Conversational chat history
	const [messages, setMessages] = useState<ChatMessage[]>([
		{
			id: "welcome",
			role: "assistant",
			text: "¡Hola! Soy APEX Brain, tu asistente operacional contextualizado con pgvector. Pregúntame sobre órdenes de trabajo, acuerdos comerciales con clientes, disponibilidad de vinilos o especificaciones técnicas de instalación.",
			timestamp: "Ahora",
		},
	]);

	const chatEndRef = useRef<HTMLDivElement>(null);

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

	// Auto-scroll when messages change
	useEffect(() => {
		if (isOpen && messages.length > 0) {
			chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
		}
	}, [isOpen, messages.length]);

	if (!isOpen) return null;

	const handleCopy = (text: string, id: string) => {
		navigator.clipboard.writeText(text);
		setCopiedCode(id);
		setTimeout(() => setCopiedCode(null), 2000);
	};

	// Token cost estimation in real-time
	const getCostPerCallUSD = (maxTokens: number) => {
		let ratePer1k = 0.00015; // Gemini Flash default
		if (ai.provider === "openai") ratePer1k = 0.005; // GPT-4o
		if (ai.provider === "custom") ratePer1k = 0.0002;
		return ((maxTokens / 1000) * ratePer1k).toFixed(5);
	};

	// Contextual citations generator
	const getCitationsForQuery = (_userQuery: string): Citation[] => [
		{
			type: "documento",
			title: "Cotización #COT-1082 - Vinilo Arlon DPF",
			similarity: 0.94,
			snippet:
				"Rotulado integral para flota comercial. Material recomendado: Vinilo fundido de alta conformabilidad y laminado UV brillante.",
		},
		{
			type: "acuerdo",
			title: "Acuerdo de Servicio: SLA 48h con Flotas Corporativas",
			similarity: 0.89,
			snippet:
				"Cláusula 4.2: Todo vehículo comercial entregado antes de las 09:00 AM debe finalizarse en un plazo máximo de 48 horas hábiles.",
		},
		{
			type: "tarea",
			title: "Tarea #OT-4912: Rotulado Chevrolet D-Max",
			similarity: 0.92,
			snippet:
				"Desmonte de accesorios, limpieza con alcohol isopropílico e instalación de vinilo microperforado en luneta trasera.",
		},
		{
			type: "stock",
			title: "Stock Vinilo 3M Serie 1080/2080 Negro Mate",
			similarity: 0.96,
			snippet:
				"Almacén Central: 32 metros lineales disponibles. Ancho de bobina 1.52m.",
		},
	];

	// Handle Submit with Real-Time Streaming (Typewriter Effect)
	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const currentText = query.trim();
		if (!currentText || rag.indexedDocumentsCount === 0) return;

		const userMsg: ChatMessage = {
			id: `user-${Date.now()}`,
			role: "user",
			text: currentText,
			timestamp: new Date().toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit",
			}),
		};

		const assistantMsgId = `assistant-${Date.now()}`;
		const assistantMsg: ChatMessage = {
			id: assistantMsgId,
			role: "assistant",
			text: "",
			isStreaming: true,
			timestamp: new Date().toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit",
			}),
		};

		setMessages((prev) => [...prev, userMsg, assistantMsg]);
		setQuery("");

		// Full synthesized text to stream
		const fullResponse = `Basado en el índice vectorial de PLOTTIO (similitud cosine: ${(rag.similarityThreshold * 100).toFixed(0)}% con vectores 768d):\n\n• Análisis semántico para "${currentText}": Identificamos antecedentes operativos en el historial de órdenes y cotizaciones registradas.\n• En el inventario se verifica compatibilidad con Vinilo Polimérico Cast 3M Serie 1080/2080 y Arlon DPF con 32 metros útiles.\n• Tiempo de ejecución calibrado: 1.5 jornadas según métricas de taller.\n• Para asegurar rentabilidad, se recomienda aplicar el margen acordado del 48% según las políticas corporativas.`;

		const words = fullResponse.split(" ");
		let currentWordIdx = 0;

		const streamInterval = setInterval(() => {
			currentWordIdx++;
			const partialText = words.slice(0, currentWordIdx).join(" ");

			setMessages((prev) =>
				prev.map((m) =>
					m.id === assistantMsgId ? { ...m, text: partialText } : m,
				),
			);

			if (currentWordIdx >= words.length) {
				clearInterval(streamInterval);
				// Attach citations once streaming completes
				const citations = getCitationsForQuery(currentText);
				setMessages((prev) =>
					prev.map((m) =>
						m.id === assistantMsgId
							? { ...m, isStreaming: false, citations }
							: m,
					),
				);
				recordAiUsage(rag.maxTokens, Number(getCostPerCallUSD(rag.maxTokens)));
			}
		}, 30);
	};

	return (
		<div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 sm:pt-14 bg-black/70 backdrop-blur-sm animate-fade-in">
			<button
				type="button"
				className="fixed inset-0 w-full h-full cursor-default"
				onClick={onClose}
				aria-label="Cerrar APEX Brain"
			/>
			<div className="relative w-full max-w-3xl max-h-[90vh] rounded-2xl border border-border bg-card shadow-2xl z-10 animate-slide-in flex flex-col overflow-hidden">
				{/* Top Modal Header */}
				<div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-secondary/15 shrink-0">
					<div className="flex items-center gap-3">
						<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
							<Brain className="h-5 w-5" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h3 className="text-base font-bold text-foreground">
									APEX Brain
								</h3>
								{rag.indexedDocumentsCount > 0 ? (
									<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
										<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
										Activo (pgvector 768d)
									</span>
								) : (
									<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
										Sin indexar
									</span>
								)}
							</div>
							<p className="text-[11px] text-muted-foreground">
								Motor RAG sobre PostgreSQL & embeddings de tareas, cotizaciones
								y acuerdos
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => setShowDeploymentGuide((v) => !v)}
							className={`p-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
								showDeploymentGuide
									? "border-primary bg-primary/10 text-primary"
									: "border-border bg-background text-muted-foreground hover:bg-secondary"
							}`}
							title="Guía de despliegue pgvector"
						>
							<BookOpen className="h-3.5 w-3.5" />
							<span className="hidden sm:inline">Guía pgvector</span>
						</button>

						<button
							type="button"
							onClick={() => setShowSettings((v) => !v)}
							className={`p-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
								showSettings
									? "border-primary bg-primary/10 text-primary"
									: "border-border bg-background text-muted-foreground hover:bg-secondary"
							}`}
							title="Calibración de tokens y similitud"
						>
							<Sliders className="h-3.5 w-3.5" />
							<span className="hidden sm:inline">Calibración</span>
						</button>

						<button
							type="button"
							onClick={onClose}
							className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
						>
							<X className="h-5 w-5" />
						</button>
					</div>
				</div>

				{/* Token & RAG Calibration Drawer */}
				{showSettings && (
					<div className="p-4 bg-secondary/30 border-b border-border space-y-4 text-xs animate-fade-in shrink-0">
						<div className="flex items-center justify-between font-bold text-foreground">
							<span className="flex items-center gap-1.5">
								<Sliders className="h-4 w-4 text-primary" />
								Calibración de Inferencia & Estimación de Costes
							</span>
							<span className="text-[11px] font-mono text-muted-foreground">
								Modelo Activo:{" "}
								<strong className="text-foreground">{ai.activeModel}</strong>
							</span>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
							{/* Token Slider with Real-Time Dollar Cost */}
							<div className="rounded-xl border border-border bg-card p-3 space-y-2">
								<div className="flex justify-between font-semibold text-muted-foreground">
									<span>Nivel de Tokens:</span>
									<span className="text-foreground font-mono font-bold">
										{rag.maxTokens} tok
									</span>
								</div>
								<input
									type="range"
									min={256}
									max={4096}
									step={256}
									value={rag.maxTokens}
									onChange={(e) =>
										updateRagConfig({ maxTokens: Number(e.target.value) })
									}
									className="w-full accent-primary cursor-pointer"
								/>
								<div className="flex items-center justify-between text-[11px] text-emerald-500 font-medium">
									<span className="flex items-center gap-1">
										<Coins className="h-3 w-3" />
										Coste por llamada:
									</span>
									<span className="font-mono font-bold">
										${getCostPerCallUSD(rag.maxTokens)} USD
									</span>
								</div>
							</div>

							{/* Similarity Threshold Slider */}
							<div className="rounded-xl border border-border bg-card p-3 space-y-2">
								<div className="flex justify-between font-semibold text-muted-foreground">
									<span>Umbral Similitud Coseno:</span>
									<span className="text-foreground font-mono font-bold">
										{(rag.similarityThreshold * 100).toFixed(0)}%
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
								<div className="text-[10px] text-muted-foreground">
									Filtra documentos con score inferior al umbral.
								</div>
							</div>

							{/* Context Chunks & Actions */}
							<div className="rounded-xl border border-border bg-card p-3 space-y-2">
								<div className="flex justify-between font-semibold text-muted-foreground">
									<span>Fragmentos (Chunks):</span>
									<span className="text-foreground font-mono font-bold">
										{rag.maxContextChunks} chunks
									</span>
								</div>
								<input
									type="range"
									min={2}
									max={12}
									step={1}
									value={rag.maxContextChunks}
									onChange={(e) =>
										updateRagConfig({
											maxContextChunks: Number(e.target.value),
										})
									}
									className="w-full accent-primary cursor-pointer"
								/>
								<div className="flex justify-between items-center pt-1 text-[10px]">
									<button
										type="button"
										onClick={clearKnowledgeIndex}
										className="text-destructive hover:underline cursor-pointer flex items-center gap-0.5"
									>
										<Trash2 className="h-3 w-3" />
										Vaciar Índice
									</button>
									<button
										type="button"
										onClick={() => indexKnowledgeBase()}
										className="text-primary hover:underline cursor-pointer flex items-center gap-0.5"
									>
										<RefreshCw className="h-3 w-3" />
										Re-indexar
									</button>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* pgvector Deployment Guide Drawer */}
				{showDeploymentGuide && (
					<div className="p-4 bg-secondary/30 border-b border-border space-y-3 text-xs animate-fade-in shrink-0 max-h-60 overflow-y-auto">
						<div className="flex items-center justify-between font-bold text-foreground">
							<span className="flex items-center gap-1.5">
								<BookOpen className="h-4 w-4 text-primary" />
								Guía Oficial: Base de Datos con pgvector (APEX Brain RAG)
							</span>
							<button
								type="button"
								onClick={() => setShowDeploymentGuide(false)}
								className="text-muted-foreground hover:text-foreground cursor-pointer"
							>
								✕
							</button>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
							<div className="rounded-lg border border-border bg-card p-3 space-y-1.5">
								<div className="font-bold text-foreground flex items-center justify-between">
									<span>Opción A: Supabase (Nube Gratuita)</span>
									<button
										type="button"
										onClick={() =>
											handleCopy(
												"CREATE EXTENSION IF NOT EXISTS vector;",
												"supasql",
											)
										}
										className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
										title="Copiar SQL"
									>
										{copiedCode === "supasql" ? (
											<Check className="h-3 w-3 text-emerald-500" />
										) : (
											<Copy className="h-3 w-3" />
										)}
									</button>
								</div>
								<p className="text-[11px] text-muted-foreground">
									1. Entra a supabase.com y abre el SQL Editor.
									<br />
									2. Ejecuta la extensión de vectores:
								</p>
								<pre className="p-2 rounded bg-background border border-border font-mono text-[10px] text-primary">
									CREATE EXTENSION IF NOT EXISTS vector;
								</pre>
							</div>

							<div className="rounded-lg border border-border bg-card p-3 space-y-1.5">
								<div className="font-bold text-foreground flex items-center justify-between">
									<span>Opción B: PostgreSQL en Docker (VPS)</span>
									<button
										type="button"
										onClick={() =>
											handleCopy(
												"docker run -d --name apex-postgres -e POSTGRES_PASSWORD=tu_password_seguro -e POSTGRES_DB=apex_db -p 5432:5432 pgvector/pgvector:pg16",
												"dockercmd",
											)
										}
										className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
										title="Copiar Comando Docker"
									>
										{copiedCode === "dockercmd" ? (
											<Check className="h-3 w-3 text-emerald-500" />
										) : (
											<Copy className="h-3 w-3" />
										)}
									</button>
								</div>
								<p className="text-[11px] text-muted-foreground">
									Contenedor oficial con soporte de vectores:
								</p>
								<pre className="p-2 rounded bg-background border border-border font-mono text-[10px] text-foreground overflow-x-auto">
									docker run -d --name apex-postgres -e
									POSTGRES_PASSWORD=tu_password_seguro -e POSTGRES_DB=apex_db -p
									5432:5432 pgvector/pgvector:pg16
								</pre>
							</div>
						</div>
					</div>
				)}

				{/* Modal Body */}
				<div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
					{/* ZERO-STATE: Antes de la Conexión */}
					{rag.indexedDocumentsCount === 0 ? (
						<div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 sm:p-8 text-center space-y-4 my-auto">
							<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
								<Layers className="h-7 w-7" />
							</div>
							<div className="max-w-md mx-auto space-y-2">
								<h4 className="text-lg font-bold text-foreground">
									Indexa tus tareas o clientes para habilitar respuestas
									contextuales
								</h4>
								<p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
									APEX Brain requiere calcular embeddings semánticos (768d)
									sobre las órdenes de trabajo, cotizaciones, acuerdos y stock
									para ofrecer respuestas hipercontextualizadas.
								</p>
							</div>

							<div className="flex flex-wrap justify-center gap-3 pt-2">
								<button
									type="button"
									onClick={() => indexKnowledgeBase()}
									disabled={rag.isIndexing}
									className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs sm:text-sm font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-sm flex items-center gap-2"
								>
									{rag.isIndexing ? (
										<>
											<RefreshCw className="h-4 w-4 animate-spin" />
											<span>Indexando en pgvector (768d)...</span>
										</>
									) : (
										<>
											<Sparkles className="h-4 w-4" />
											<span>Indexar Tareas y Clientes Ahora</span>
										</>
									)}
								</button>
								<button
									type="button"
									onClick={() => setShowDeploymentGuide(true)}
									className="px-4 py-2.5 rounded-xl border border-border bg-card text-foreground text-xs sm:text-sm font-medium hover:bg-secondary transition-colors cursor-pointer"
								>
									Ver Guía de Despliegue pgvector
								</button>
							</div>
						</div>
					) : (
						/* CONNECTED STATE: Conversational Chat */
						<div className="space-y-4">
							{messages.map((msg) => (
								<div
									key={msg.id}
									className={`flex flex-col gap-1.5 ${
										msg.role === "user" ? "items-end" : "items-start"
									}`}
								>
									<div className="flex items-center gap-1.5 text-[11px] text-muted-foreground px-1">
										{msg.role === "assistant" ? (
											<span className="font-bold text-primary flex items-center gap-1">
												<Brain className="h-3 w-3" /> APEX Brain
											</span>
										) : (
											<span className="font-bold text-foreground">Tú</span>
										)}
										<span>· {msg.timestamp}</span>
									</div>

									<div
										className={`rounded-2xl p-4 text-xs sm:text-sm max-w-[90%] leading-relaxed ${
											msg.role === "user"
												? "bg-primary text-primary-foreground font-medium rounded-tr-xs"
												: "bg-secondary/30 text-foreground border border-border rounded-tl-xs"
										}`}
									>
										<div className="whitespace-pre-wrap">
											{msg.text}
											{msg.isStreaming && (
												<span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse align-middle" />
											)}
										</div>

										{/* Contextual Citations & Grounding References */}
										{msg.citations && msg.citations.length > 0 && (
											<div className="mt-4 pt-3 border-t border-border/60 space-y-2.5 animate-fade-in">
												<div className="flex items-center gap-1.5 text-[11px] font-bold text-primary uppercase tracking-wider">
													<Sparkles className="h-3.5 w-3.5" />
													<span>
														Citas y Acuerdos que sustentan esta respuesta:
													</span>
												</div>

												<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
													{msg.citations.map((c, idx) => (
														<div
															// biome-ignore lint/suspicious/noArrayIndexKey: citations array
															key={idx}
															className="rounded-xl border border-border bg-card/80 p-2.5 space-y-1 hover:border-primary/40 transition-colors"
														>
															<div className="flex items-center justify-between gap-1">
																<div className="flex items-center gap-1.5 font-bold text-[11px] text-foreground truncate">
																	{c.type === "documento" && (
																		<FileText className="h-3 w-3 text-blue-500 shrink-0" />
																	)}
																	{c.type === "acuerdo" && (
																		<Users className="h-3 w-3 text-purple-500 shrink-0" />
																	)}
																	{c.type === "tarea" && (
																		<Zap className="h-3 w-3 text-amber-500 shrink-0" />
																	)}
																	{c.type === "stock" && (
																		<Package className="h-3 w-3 text-emerald-500 shrink-0" />
																	)}
																	<span className="truncate">{c.title}</span>
																</div>
																<span className="px-1.5 py-0.2 rounded bg-primary/10 text-primary text-[10px] font-mono font-bold shrink-0">
																	{(c.similarity * 100).toFixed(0)}% sim
																</span>
															</div>
															<p className="text-[10px] text-muted-foreground line-clamp-2 leading-normal">
																{c.snippet}
															</p>
														</div>
													))}
												</div>
											</div>
										)}
									</div>
								</div>
							))}
							<div ref={chatEndRef} />
						</div>
					)}
				</div>

				{/* Quick Suggestions (when connected) */}
				{rag.indexedDocumentsCount > 0 && (
					<div className="px-4 py-2 bg-secondary/10 border-t border-border flex items-center gap-2 overflow-x-auto text-[11px] shrink-0">
						<span className="text-muted-foreground font-semibold shrink-0">
							Sugerencias:
						</span>
						{[
							"¿Qué vinilo rinde mejor en buses urbanos?",
							"Buscar cotizaciones pendientes de clientes corporativos",
							"Verificar stock de vinilo reflectivo microprismático",
							"SLA acordado con flotas de reparto",
						].map((s) => (
							<button
								key={s}
								type="button"
								onClick={() => setQuery(s)}
								className="px-2.5 py-1 rounded-full border border-border bg-background hover:bg-secondary text-foreground shrink-0 transition-colors cursor-pointer"
							>
								{s}
							</button>
						))}
					</div>
				)}

				{/* Chat Input Bar */}
				<form
					onSubmit={handleSubmit}
					className="p-3 sm:p-4 border-t border-border bg-card flex items-center gap-2 shrink-0"
				>
					<input
						type="text"
						disabled={rag.indexedDocumentsCount === 0}
						placeholder={
							rag.indexedDocumentsCount === 0
								? "Indexa tus tareas o clientes para comenzar..."
								: "Pregunta a APEX Brain con RAG contextual... (ej. 'camioneta dmax vinilo mate')"
						}
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						className="flex-1 bg-secondary/20 border border-border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary disabled:opacity-50"
					/>
					<button
						type="submit"
						disabled={!query.trim() || rag.indexedDocumentsCount === 0}
						className="p-2.5 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer shadow-xs shrink-0"
						title="Enviar pregunta"
					>
						<Send className="h-4 w-4" />
					</button>
				</form>

				{/* Footer Bar */}
				<div className="px-4 py-2 border-t border-border/50 bg-secondary/5 flex items-center justify-between text-[11px] text-muted-foreground shrink-0">
					<span className="flex items-center gap-1.5">
						<span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
						Base de conocimiento:{" "}
						<strong className="text-foreground">
							{rag.indexedDocumentsCount}
						</strong>{" "}
						entidades vectorizadas
					</span>
					<span className="flex items-center gap-1 font-mono">
						<Command className="h-3 w-3" /> + K para alternar
					</span>
				</div>
			</div>
		</div>
	);
};
