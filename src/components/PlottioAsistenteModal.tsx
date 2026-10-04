import {
	Bot,
	Brain,
	Car,
	Check,
	ChevronDown,
	ChevronUp,
	Coins,
	Command,
	FileText,
	Layers,
	Package,
	RefreshCw,
	Save,
	Send,
	ShieldAlert,
	Sliders,
	Sparkles,
	Trash2,
	Users,
	Wrench,
	X,
	Zap,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import {
	ASISTENTE_SEGURIDAD_RECHAZO,
	BUSINESS_TOOLS,
	type BusinessCitation,
	executeLiveBusinessAgent,
	isRestrictedAction,
	type ToolCallExecution,
} from "../services/plottioAgent";
import { useIntegrationsStore } from "../store/useIntegrationsStore";

export interface ChatMessage {
	id: string;
	role: "user" | "assistant";
	text: string;
	isStreaming?: boolean;
	citations?: BusinessCitation[];
	toolsCalled?: ToolCallExecution[];
	isSecurityAlert?: boolean;
	timestamp: string;
}

export interface PlottioAsistenteModalProps {
	isOpen: boolean;
	onClose: () => void;
	onNavigate?: (tab: string) => void;
}

interface QuickSuggestion {
	label: string;
	prompt: string;
	isSecurity: boolean;
}

const QUICK_SUGGESTIONS: QuickSuggestion[] = [
	{
		label: "Chevrolet D-Max",
		prompt: "¿Cuál es el estado de la orden Chevrolet D-Max?",
		isSecurity: false,
	},
	{
		label: "Bobinas 3M",
		prompt: "Consultar stock de bobinas de vinilo 3M",
		isSecurity: false,
	},
	{
		label: "Cotizaciones de flotas",
		prompt: "Ver cotizaciones aprobadas con flotas",
		isSecurity: false,
	},
	{
		label: "Modificar rol de usuario (Test de seguridad)",
		prompt: "Modificar rol de usuario y permisos",
		isSecurity: true,
	},
];

export const PlottioAsistenteModal: React.FC<PlottioAsistenteModalProps> = ({
	isOpen,
	onClose,
	onNavigate: _onNavigate,
}) => {
	const {
		agent,
		rag,
		ai,
		updateAgentConfig,
		updateRagConfig,
		indexKnowledgeBase,
		clearKnowledgeIndex,
		recordAiUsage,
	} = useIntegrationsStore();

	const hasApiKey = Boolean(
		ai?.googleApiKey ||
			ai?.groqApiKey ||
			ai?.nvidiaApiKey ||
			ai?.opencodeZenApiKey ||
			ai?.geminiApiKey,
	);

	const [query, setQuery] = useState("");
	const [activeTab, setActiveTab] = useState<"chat" | "config" | "tools">(
		"chat",
	);

	// Configuración editable local del agente
	const [configNombre, setConfigNombre] = useState(
		agent?.nombre || rag?.nombre || "Plottio Asistente",
	);
	const [configSystemPrompt, setConfigSystemPrompt] = useState(
		agent?.systemPrompt ||
			rag?.systemPrompt ||
			"Eres Plottio Asistente, un agente operacional y RAG especializado en talleres de rotulado y gráfica vehicular. Tienes acceso exclusivo a herramientas de negocio (órdenes, clientes, inventario, cotizaciones y vehículos). No tienes autorización para alterar usuarios, roles ni configuraciones críticas del sistema.",
	);
	const [configModel, setConfigModel] = useState(
		agent?.model || rag?.model || "gemini-flash-latest",
	);
	const [configTemperature, setConfigTemperature] = useState(
		agent?.temperature ?? rag?.temperature ?? 0.2,
	);
	const [savedNotification, setSavedNotification] = useState(false);

	// Estado interactivo de acordeón de citas RAG por mensaje (por defecto abierto)
	const [collapsedCitations, setCollapsedCitations] = useState<
		Record<string, boolean>
	>({});

	const toggleCitations = (msgId: string) => {
		setCollapsedCitations((prev) => ({
			...prev,
			[msgId]: !prev[msgId],
		}));
	};

	// Sincronizar estado local si cambia en el store
	useEffect(() => {
		if (agent) {
			setConfigNombre(agent.nombre);
			setConfigSystemPrompt(agent.systemPrompt);
			setConfigModel(agent.model);
			setConfigTemperature(agent.temperature);
		}
	}, [agent]);

	// Historial conversacional
	const [messages, setMessages] = useState<ChatMessage[]>([
		{
			id: "welcome",
			role: "assistant",
			text: "¡Hola! Soy Plottio Asistente, tu copiloto operacional con Agentic RAG. Cuento con herramientas de negocio para consultar y gestionar órdenes de trabajo, inventario de vinilos, clientes, cotizaciones y vehículos de flota.",
			timestamp: "Ahora",
		},
	]);

	const chatEndRef = useRef<HTMLDivElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	// Listener de atajos de teclado (Cmd+K / Ctrl+K / Esc)
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

	// Auto-scroll en el chat
	useEffect(() => {
		if (isOpen && messages.length > 0 && activeTab === "chat") {
			if (typeof chatEndRef.current?.scrollIntoView === "function") {
				chatEndRef.current.scrollIntoView({ behavior: "smooth" });
			}
		}
	}, [isOpen, messages.length, activeTab]);

	if (!isOpen) return null;

	const handleSaveConfig = (e: React.FormEvent) => {
		e.preventDefault();
		const updated = {
			nombre: configNombre,
			systemPrompt: configSystemPrompt,
			model: configModel,
			temperature: Number(configTemperature),
		};
		updateAgentConfig(updated);
		updateRagConfig(updated);
		setSavedNotification(true);
		setTimeout(() => setSavedNotification(false), 2200);
	};

	// Estimación de costo en USD
	const getCostPerCallUSD = (maxTokens: number) => {
		let ratePer1k = 0.00015;
		if (configModel.includes("gpt-4o")) ratePer1k = 0.005;
		if (configModel.includes("llama-3.3")) ratePer1k = 0.0002;
		return ((maxTokens / 1000) * ratePer1k).toFixed(5);
	};

	// Envío de consulta y orquestación de herramientas
	const executeQuery = async (textToSubmit: string) => {
		const currentText = textToSubmit.trim();
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

		// 1. Verificar Guardrail de seguridad de permisos
		if (isRestrictedAction(currentText)) {
			const securityAssistantMsg: ChatMessage = {
				id: `sec-${Date.now()}`,
				role: "assistant",
				text: ASISTENTE_SEGURIDAD_RECHAZO,
				isSecurityAlert: true,
				timestamp: new Date().toLocaleTimeString([], {
					hour: "2-digit",
					minute: "2-digit",
				}),
			};
			setMessages((prev) => [...prev, userMsg, securityAssistantMsg]);
			setQuery("");
			if (textareaRef.current) {
				textareaRef.current.style.height = "auto";
			}
			return;
		}

		// 2. Determinar API Key activa
		const activeApiKey =
			ai?.provider === "google"
				? ai?.googleApiKey || ai?.geminiApiKey
				: ai?.provider === "groq"
					? ai?.groqApiKey
					: ai?.provider === "nvidia"
						? ai?.nvidiaApiKey
						: ai?.provider === "opencode_zen"
							? ai?.opencodeZenApiKey
							: ai?.googleApiKey || ai?.geminiApiKey || ai?.groqApiKey || "";

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
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto";
		}

		// 3. Ejecutar Agentic RAG de Negocio (en vivo si hay apiKey o con fallback automático)
		const startTime = Date.now();
		const executionResult = await executeLiveBusinessAgent(currentText, {
			assistantName: configNombre,
			systemPrompt: configSystemPrompt,
			apiKey: activeApiKey,
			provider: ai?.provider || "google",
			temperature: configTemperature,
			model: configModel,
		});
		const latencyMs = Date.now() - startTime;

		// Actualizar mensaje con herramientas y citas
		setMessages((prev) =>
			prev.map((m) =>
				m.id === assistantMsgId
					? {
							...m,
							toolsCalled: executionResult.toolsCalled,
							citations: executionResult.citations,
						}
					: m,
			),
		);

		// Efecto máquina de escribir (Streaming interactivo)
		const words = executionResult.response.split(" ");
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
				setMessages((prev) =>
					prev.map((m) =>
						m.id === assistantMsgId
							? {
									...m,
									isStreaming: false,
								}
							: m,
					),
				);
				recordAiUsage(
					rag.maxTokens,
					Number(getCostPerCallUSD(rag.maxTokens)),
					latencyMs,
				);
			}
		}, 20);
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		executeQuery(query);
	};

	const handleTextareaKeyDown = (
		e: React.KeyboardEvent<HTMLTextAreaElement>,
	) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			executeQuery(query);
		}
	};

	const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setQuery(e.target.value);
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto";
			textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
		}
	};

	const handleSelectSuggestion = (prompt: string) => {
		setQuery(prompt);
		if (textareaRef.current) {
			textareaRef.current.focus();
			textareaRef.current.style.height = "auto";
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 sm:pt-10 bg-black/60 backdrop-blur-sm animate-fade-in">
			<button
				type="button"
				className="fixed inset-0 w-full h-full cursor-default"
				onClick={onClose}
				aria-label="Cerrar Plottio Asistente"
			/>
			<div className="relative w-full max-w-3xl max-h-[92vh] rounded-2xl border border-border/60 bg-card/95 backdrop-blur-md shadow-2xl z-10 animate-slide-in flex flex-col overflow-hidden">
				{/* Top Modal Header */}
				<div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60 bg-muted/20 shrink-0">
					<div className="flex items-center gap-3">
						<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
							<Brain className="h-5 w-5" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h3 className="text-base font-bold text-foreground tracking-tight">
									{configNombre || "Plottio Asistente"}
								</h3>
								{hasApiKey ? (
									<span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
										<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
										IA Conectada (
										{ai?.provider === "google"
											? "Google Gemini"
											: ai?.provider === "groq"
												? "Groq Cloud"
												: ai?.provider === "nvidia"
													? "Nvidia NIM"
													: "Opencode Zen"}
										)
									</span>
								) : (
									<span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
										Modo Demostración / Sandbox
									</span>
								)}
								{rag.indexedDocumentsCount > 0 ? (
									<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
										<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
										RAG Operacional
									</span>
								) : (
									<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25">
										Sin indexar
									</span>
								)}
							</div>
							<p className="text-[11px] text-muted-foreground">
								Agentic RAG de Negocio · Órdenes, Clientes, Inventario &
								Cotizaciones
							</p>
						</div>
					</div>

					{/* Navigation tabs & Close button */}
					<div className="flex items-center gap-2">
						<div className="flex bg-muted/60 p-1 rounded-xl border border-border/50 text-xs">
							<button
								type="button"
								onClick={() => setActiveTab("chat")}
								className={`px-3 py-1 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
									activeTab === "chat"
										? "bg-background text-foreground shadow-xs font-semibold"
										: "text-muted-foreground hover:text-foreground hover:bg-background/40 font-medium"
								}`}
							>
								<Bot className="h-3.5 w-3.5" />
								<span>Chat</span>
							</button>

							<button
								type="button"
								onClick={() => setActiveTab("tools")}
								className={`px-3 py-1 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
									activeTab === "tools"
										? "bg-background text-foreground shadow-xs font-semibold"
										: "text-muted-foreground hover:text-foreground hover:bg-background/40 font-medium"
								}`}
								title="Herramientas de Negocio Disponibles"
							>
								<Wrench className="h-3.5 w-3.5" />
								<span>Herramientas</span>
							</button>

							<button
								type="button"
								onClick={() => setActiveTab("config")}
								className={`px-3 py-1 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
									activeTab === "config"
										? "bg-background text-foreground shadow-xs font-semibold"
										: "text-muted-foreground hover:text-foreground hover:bg-background/40 font-medium"
								}`}
								title="Configurar Nombre, Prompt, Modelo y Temperatura"
							>
								<Sliders className="h-3.5 w-3.5" />
								<span>Configuración</span>
							</button>
						</div>

						<button
							type="button"
							onClick={onClose}
							className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
							aria-label="Cerrar modal"
						>
							<X className="h-4 w-4" />
						</button>
					</div>
				</div>

				{/* Sandbox / Demo Mode Banner - Solo visible si NO hay API Key */}
				{!hasApiKey && (
					<div className="bg-amber-500/10 border-b border-amber-500/20 px-5 py-2 flex items-center justify-between text-xs text-amber-700 dark:text-amber-300 shrink-0">
						<div className="flex items-center gap-2">
							<span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 border border-amber-500/30 uppercase tracking-wide">
								Modo Demostración / Sandbox (IA Simulada)
							</span>
							<span className="text-[11px] leading-tight">
								Aviso para el operador: Los análisis, inferencias y
								recomendaciones son una maqueta interactiva simulada con
								ejecución autónoma de herramientas de negocio.
							</span>
						</div>
					</div>
				)}

				{/* TAB 1: HERRAMIENTAS DE NEGOCIO */}
				{activeTab === "tools" && (
					<div className="flex-1 overflow-y-auto p-5 space-y-4">
						<div className="flex items-center justify-between border-b border-border/60 pb-3">
							<div>
								<h4 className="font-bold text-foreground text-sm flex items-center gap-2">
									<Wrench className="h-4 w-4 text-primary" />
									Herramientas de Negocio del Asistente
								</h4>
								<p className="text-xs text-muted-foreground">
									Capacidades exclusivas asignadas al agente bajo el patrón
									Agentic RAG.
								</p>
							</div>
							<span className="px-2.5 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-mono font-bold border border-primary/20">
								{BUSINESS_TOOLS.length} herramientas activas
							</span>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							{BUSINESS_TOOLS.map((t) => (
								<div
									key={t.name}
									className="rounded-xl border border-border/70 bg-card/60 p-3.5 space-y-2 hover:border-primary/40 hover:bg-card/90 transition-all shadow-xs"
								>
									<div className="flex items-center justify-between">
										<code className="text-xs font-mono font-bold text-primary">
											{t.name}()
										</code>
										<span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/50">
											{t.category}
										</span>
									</div>
									<p className="text-xs text-muted-foreground leading-relaxed">
										{t.description}
									</p>
								</div>
							))}
						</div>

						<div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/10 flex items-start gap-3 text-xs text-blue-700 dark:text-blue-300">
							<ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
							<div>
								<strong className="font-bold block">
									Política de Aislamiento de Seguridad:
								</strong>
								<span>
									El asistente no tiene permisos para acceder a credenciales,
									cambiar contraseñas, ni modificar usuarios o roles. Toda
									solicitud en ese ámbito es rechazada automáticamente por el
									guardrail de seguridad.
								</span>
							</div>
						</div>
					</div>
				)}

				{/* TAB 2: CONFIGURACIÓN DEL AGENTE */}
				{activeTab === "config" && (
					<form
						onSubmit={handleSaveConfig}
						className="flex-1 overflow-y-auto p-5 space-y-4 text-xs sm:text-sm"
					>
						<div className="flex items-center justify-between border-b border-border/60 pb-3">
							<div>
								<h4 className="font-bold text-foreground text-sm flex items-center gap-2">
									<Sliders className="h-4 w-4 text-primary" />
									Configuración del Asistente & Modelo LLM
								</h4>
								<p className="text-xs text-muted-foreground">
									Personaliza la identidad, instrucciones maestras y parámetros
									de inferencia.
								</p>
							</div>

							<button
								type="submit"
								className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs flex items-center gap-1.5 text-xs"
							>
								{savedNotification ? (
									<>
										<Check className="h-3.5 w-3.5 text-emerald-300" />
										<span>¡Guardado!</span>
									</>
								) : (
									<>
										<Save className="h-3.5 w-3.5" />
										<span>Guardar Configuración</span>
									</>
								)}
							</button>
						</div>

						{/* Nombre del Asistente */}
						<div className="space-y-1.5">
							<label
								htmlFor="agent-name-input"
								className="font-semibold text-foreground text-xs"
							>
								Nombre del Asistente:
							</label>
							<input
								id="agent-name-input"
								type="text"
								value={configNombre}
								onChange={(e) => setConfigNombre(e.target.value)}
								className="w-full bg-background border border-border/80 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary shadow-2xs"
								placeholder="Plottio Asistente"
							/>
						</div>

						{/* Prompt del Sistema / Instrucciones */}
						<div className="space-y-1.5">
							<label
								htmlFor="agent-system-prompt"
								className="font-semibold text-foreground text-xs flex justify-between"
							>
								<span>Prompt del Sistema / Instrucciones:</span>
								<span className="text-[11px] text-muted-foreground font-normal">
									Define el comportamiento operativo y límites del agente
								</span>
							</label>
							<textarea
								id="agent-system-prompt"
								rows={3}
								value={configSystemPrompt}
								onChange={(e) => setConfigSystemPrompt(e.target.value)}
								className="w-full bg-background border border-border/80 rounded-xl p-3 text-xs text-foreground focus:outline-none focus:border-primary font-mono leading-relaxed shadow-2xs"
							/>
						</div>

						{/* Sliders de Temperatura y Calibración RAG */}
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
							{/* Temperatura */}
							<div className="rounded-xl border border-border/80 bg-card p-3 space-y-2 shadow-2xs">
								<div className="flex justify-between font-semibold text-muted-foreground text-xs">
									<span>Temperatura:</span>
									<span className="text-foreground font-mono font-bold">
										{Number(configTemperature).toFixed(2)}
									</span>
								</div>
								<input
									type="range"
									min={0.0}
									max={1.0}
									step={0.05}
									value={configTemperature}
									onChange={(e) => setConfigTemperature(Number(e.target.value))}
									className="w-full accent-primary cursor-pointer"
								/>
								<div className="text-[10px] text-muted-foreground">
									0.0 más determinista, 1.0 más creativo.
								</div>
							</div>

							{/* Tokens */}
							<div className="rounded-xl border border-border/80 bg-card p-3 space-y-2 shadow-2xs">
								<div className="flex justify-between font-semibold text-muted-foreground text-xs">
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
								<div className="flex items-center justify-between text-[10px] text-emerald-500 font-medium">
									<span className="flex items-center gap-1">
										<Coins className="h-3 w-3" />
										Coste:
									</span>
									<span className="font-mono font-bold">
										${getCostPerCallUSD(rag.maxTokens)} USD
									</span>
								</div>
							</div>

							{/* Chunks */}
							<div className="rounded-xl border border-border/80 bg-card p-3 space-y-2 shadow-2xs">
								<div className="flex justify-between font-semibold text-muted-foreground text-xs">
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
										className="text-destructive hover:underline cursor-pointer flex items-center gap-1 font-medium"
									>
										<Trash2 className="h-3 w-3" />
										Vaciar
									</button>
									<button
										type="button"
										onClick={() => indexKnowledgeBase()}
										className="text-primary hover:underline cursor-pointer flex items-center gap-1 font-medium"
									>
										<RefreshCw className="h-3 w-3" />
										Re-indexar
									</button>
								</div>
							</div>
						</div>
					</form>
				)}

				{/* TAB 3: CHAT CON AGENTIC RAG */}
				{activeTab === "chat" && (
					<>
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
											Indexa tus órdenes de trabajo y clientes para habilitar
											respuestas contextuales
										</h4>
										<p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
											Plottio Asistente utiliza Agentic RAG sobre las órdenes de
											trabajo, cotizaciones, inventario y vehículos para
											responder con precisión operativa.
										</p>
									</div>

									<div className="flex flex-wrap justify-center gap-3 pt-2">
										<button
											type="button"
											onClick={() => indexKnowledgeBase()}
											disabled={rag.isIndexing}
											className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs sm:text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-sm flex items-center gap-2"
										>
											{rag.isIndexing ? (
												<>
													<RefreshCw className="h-4 w-4 animate-spin" />
													<span>Indexando base de conocimiento...</span>
												</>
											) : (
												<>
													<Sparkles className="h-4 w-4" />
													<span>Indexar Base de Conocimiento Ahora</span>
												</>
											)}
										</button>
									</div>
								</div>
							) : (
								/* Conversational Chat */
								<div className="space-y-4">
									{messages.map((msg) => {
										const isAssistant = msg.role === "assistant";
										const isUser = msg.role === "user";
										const citationsCount = msg.citations?.length || 0;
										const isCitationsOpen =
											!collapsedCitations[msg.id] && citationsCount > 0;
										const maxRelevance =
											citationsCount > 0
												? Math.round(
														Math.max(
															...(msg.citations?.map((c) => c.similarity) || [
																0,
															]),
														) * 100,
													)
												: 0;

										return (
											<div
												key={msg.id}
												className={`flex flex-col gap-1.5 ${
													isUser ? "items-end" : "items-start"
												}`}
											>
												{/* Micro-timestamp header */}
												<div
													className={`flex items-center gap-1.5 text-[11px] text-muted-foreground px-1 ${
														isUser ? "justify-end" : "justify-start"
													}`}
												>
													{isAssistant ? (
														<span className="font-semibold text-primary flex items-center gap-1">
															<Brain className="h-3 w-3" />
															{configNombre || "Plottio Asistente"}
														</span>
													) : (
														<span className="font-semibold text-foreground">
															Tú
														</span>
													)}
													<span>· {msg.timestamp}</span>
												</div>

												{/* Burbuja de Mensaje */}
												<div
													className={
														isUser
															? "rounded-2xl rounded-tr-xs bg-primary text-primary-foreground shadow-xs font-medium px-4 py-2.5 max-w-[85%] sm:max-w-[75%] text-xs sm:text-sm leading-relaxed"
															: msg.isSecurityAlert
																? "rounded-2xl rounded-tl-xs bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/30 px-4 py-3.5 space-y-3 max-w-[92%] sm:max-w-[85%] text-xs sm:text-sm leading-relaxed"
																: "rounded-2xl rounded-tl-xs bg-muted/40 border border-border/50 text-foreground px-4 py-3.5 space-y-3 max-w-[92%] sm:max-w-[85%] text-xs sm:text-sm leading-relaxed"
													}
												>
													{/* Alerta de Guardrail de Seguridad */}
													{msg.isSecurityAlert && (
														<div className="flex items-center gap-1.5 font-bold text-red-600 dark:text-red-400 text-xs uppercase tracking-wider">
															<ShieldAlert className="h-4 w-4 shrink-0" />
															<span>Guardrail de Seguridad Activado</span>
														</div>
													)}

													{/* Chips de Herramientas de Negocio Invocadas (Agentic RAG) */}
													{msg.toolsCalled && msg.toolsCalled.length > 0 && (
														<div className="space-y-1.5 pb-2.5 border-b border-border/40">
															<div className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
																<Wrench className="h-3 w-3" />
																<span>Herramientas Invocadas:</span>
															</div>
															<div className="flex flex-wrap gap-1.5">
																{msg.toolsCalled.map((tc, idx) => (
																	<span
																		// biome-ignore lint/suspicious/noArrayIndexKey: tool execution list
																		key={idx}
																		className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-[11px] font-mono font-medium animate-fade-in"
																	>
																		<Wrench className="h-2.5 w-2.5 shrink-0" />
																		<span>{tc.toolName}() · Operacional</span>
																	</span>
																))}
															</div>
														</div>
													)}

													{/* Contenido del Mensaje */}
													<div className="whitespace-pre-wrap">
														{msg.text}
														{msg.isStreaming && (
															<span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse align-middle" />
														)}
													</div>

													{/* Citas Contextuales de RAG Desplegables (Collapsible Citations) */}
													{msg.citations && msg.citations.length > 0 && (
														<div className="mt-3 pt-3 border-t border-border/50 space-y-2">
															<button
																type="button"
																onClick={() => toggleCitations(msg.id)}
																aria-expanded={isCitationsOpen}
																className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-card/60 hover:bg-card border border-border/60 text-[11px] font-medium text-foreground transition-colors cursor-pointer group shadow-2xs"
															>
																<span className="flex items-center gap-1.5 text-primary">
																	<Sparkles className="h-3.5 w-3.5 shrink-0" />
																	<span>
																		{msg.citations.length} fuentes de contexto
																		recuperadas · {maxRelevance}% relevancia
																	</span>
																</span>
																{isCitationsOpen ? (
																	<ChevronUp className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-transform" />
																) : (
																	<ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-transform" />
																)}
															</button>

															{isCitationsOpen && (
																<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 animate-fade-in">
																	{msg.citations.map((c, idx) => (
																		<div
																			// biome-ignore lint/suspicious/noArrayIndexKey: citations list
																			key={idx}
																			className="rounded-xl border border-border/70 bg-card p-2.5 space-y-1 hover:border-primary/40 transition-colors shadow-2xs"
																		>
																			<div className="flex items-center justify-between gap-1">
																				<div className="flex items-center gap-1.5 font-semibold text-[11px] text-foreground truncate">
																					{c.type === "documento" && (
																						<FileText className="h-3.5 w-3.5 text-blue-500 shrink-0" />
																					)}
																					{c.type === "acuerdo" && (
																						<Users className="h-3.5 w-3.5 text-purple-500 shrink-0" />
																					)}
																					{c.type === "tarea" && (
																						<Zap className="h-3.5 w-3.5 text-amber-500 shrink-0" />
																					)}
																					{c.type === "stock" && (
																						<Package className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
																					)}
																					{c.type === "vehiculo" && (
																						<Car className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
																					)}
																					<span className="truncate">
																						{c.title}
																					</span>
																				</div>
																				<span className="px-1.5 py-0.2 rounded bg-primary/10 text-primary text-[10px] font-mono font-bold shrink-0">
																					{(c.similarity * 100).toFixed(0)}% sim
																				</span>
																			</div>
																			<p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
																				{c.snippet}
																			</p>
																		</div>
																	))}
																</div>
															)}
														</div>
													)}
												</div>
											</div>
										);
									})}
									<div ref={chatEndRef} />
								</div>
							)}
						</div>

						{/* Carrusel / Barra de sugerencias rápidas */}
						{rag.indexedDocumentsCount > 0 && (
							<div className="px-4 py-2 bg-muted/20 border-t border-border/60 flex items-center gap-2 overflow-x-auto text-[11px] shrink-0">
								<span className="text-muted-foreground font-semibold shrink-0 text-xs">
									Sugerencias:
								</span>
								{QUICK_SUGGESTIONS.map((s) => (
									<button
										key={s.label}
										type="button"
										onClick={() => handleSelectSuggestion(s.prompt)}
										className={`px-3 py-1 rounded-full border text-xs font-medium shrink-0 transition-all cursor-pointer shadow-2xs active:scale-95 ${
											s.isSecurity
												? "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20"
												: "border-border/80 bg-background hover:bg-muted text-foreground"
										}`}
										title={s.prompt}
									>
										{s.label}
									</button>
								))}
							</div>
						)}

						{/* Input de Mensaje y Quick Actions Bar */}
						<form
							onSubmit={handleSubmit}
							className="p-3 sm:p-4 border-t border-border/60 bg-card/90 flex flex-col gap-2 shrink-0"
						>
							<div className="flex items-end gap-2">
								<textarea
									ref={textareaRef}
									rows={1}
									disabled={rag.indexedDocumentsCount === 0}
									placeholder={
										rag.indexedDocumentsCount === 0
											? "Indexa la base de conocimiento para comenzar..."
											: "Pregunta a Plottio Asistente o solicita una acción de negocio..."
									}
									value={query}
									onChange={handleTextareaChange}
									onKeyDown={handleTextareaKeyDown}
									className="flex-1 max-h-32 min-h-[42px] resize-none bg-background border border-border/80 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary disabled:opacity-50 shadow-2xs leading-relaxed"
								/>
								<button
									type="submit"
									disabled={!query.trim() || rag.indexedDocumentsCount === 0}
									className="p-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-40 transition-all cursor-pointer shadow-xs shrink-0 self-end active:scale-95 flex items-center justify-center"
									title="Enviar mensaje"
									aria-label="Enviar mensaje"
								>
									<Send className="h-4 w-4" />
								</button>
							</div>

							{/* Atajos visuales sutiles */}
							<div className="hidden sm:flex items-center justify-between px-1 text-[10px] text-muted-foreground select-none">
								<div className="flex items-center gap-3">
									<span className="flex items-center gap-1 font-mono">
										<kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[9px] font-medium text-foreground">
											Enter ↵
										</kbd>
										<span>enviar</span>
									</span>
									<span className="flex items-center gap-1 font-mono">
										<kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[9px] font-medium text-foreground">
											Shift + Enter
										</kbd>
										<span>salto de línea</span>
									</span>
								</div>
								<span className="text-[10px] text-muted-foreground/80 font-medium">
									Agentic RAG Operacional
								</span>
							</div>
						</form>
					</>
				)}

				{/* Footer Bar */}
				<div className="px-5 py-2 border-t border-border/50 bg-muted/15 flex items-center justify-between text-[11px] text-muted-foreground shrink-0">
					<span className="flex items-center gap-2">
						<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
						Base de conocimiento:{" "}
						<strong className="text-foreground font-semibold">
							{rag.indexedDocumentsCount}
						</strong>{" "}
						entidades operacionales
					</span>
					<span className="flex items-center gap-1 font-mono text-[10px]">
						<Command className="h-3 w-3" /> + K o Esc para alternar
					</span>
				</div>
			</div>
		</div>
	);
};
