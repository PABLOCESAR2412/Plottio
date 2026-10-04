import {
	AlertTriangle,
	Bot,
	Brain,
	Check,
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
	executeBusinessAgent,
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

export const PlottioAsistenteModal: React.FC<PlottioAsistenteModalProps> = ({
	isOpen,
	onClose,
	onNavigate: _onNavigate,
}) => {
	const {
		agent,
		rag,
		updateAgentConfig,
		updateRagConfig,
		indexKnowledgeBase,
		clearKnowledgeIndex,
		recordAiUsage,
	} = useIntegrationsStore();

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
		agent?.model || rag?.model || "gemini-1.5-pro",
	);
	const [configTemperature, setConfigTemperature] = useState(
		agent?.temperature ?? rag?.temperature ?? 0.2,
	);
	const [savedNotification, setSavedNotification] = useState(false);

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
			chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
			return;
		}

		// 2. Ejecutar Agentic RAG de Negocio
		const executionResult = executeBusinessAgent(currentText, {
			assistantName: configNombre,
			model: configModel,
			temperature: configTemperature,
		});

		const assistantMsgId = `assistant-${Date.now()}`;
		const assistantMsg: ChatMessage = {
			id: assistantMsgId,
			role: "assistant",
			text: "",
			isStreaming: true,
			toolsCalled: executionResult.toolsCalled,
			timestamp: new Date().toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit",
			}),
		};

		setMessages((prev) => [...prev, userMsg, assistantMsg]);
		setQuery("");

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
									citations: executionResult.citations,
									toolsCalled: executionResult.toolsCalled,
								}
							: m,
					),
				);
				recordAiUsage(rag.maxTokens, Number(getCostPerCallUSD(rag.maxTokens)));
			}
		}, 25);
	};

	return (
		<div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 sm:pt-12 bg-black/70 backdrop-blur-sm animate-fade-in">
			<button
				type="button"
				className="fixed inset-0 w-full h-full cursor-default"
				onClick={onClose}
				aria-label="Cerrar Plottio Asistente"
			/>
			<div className="relative w-full max-w-3xl max-h-[92vh] rounded-2xl border border-border bg-card shadow-2xl z-10 animate-slide-in flex flex-col overflow-hidden">
				{/* Top Modal Header */}
				<div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-secondary/15 shrink-0">
					<div className="flex items-center gap-3">
						<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
							<Brain className="h-5 w-5" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h3 className="text-base font-bold text-foreground">
									{configNombre || "Plottio Asistente"}
								</h3>
								<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
									Modo Demostración / Sandbox (IA Simulada)
								</span>
								{rag.indexedDocumentsCount > 0 ? (
									<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
										<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
										RAG Operacional
									</span>
								) : (
									<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
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
					<div className="flex items-center gap-1.5">
						<div className="flex bg-secondary/60 p-0.5 rounded-lg border border-border/60">
							<button
								type="button"
								onClick={() => setActiveTab("chat")}
								className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
									activeTab === "chat"
										? "bg-card text-foreground shadow-xs font-bold"
										: "text-muted-foreground hover:text-foreground"
								}`}
							>
								<Bot className="h-3.5 w-3.5" />
								<span>Chat</span>
							</button>

							<button
								type="button"
								onClick={() => setActiveTab("tools")}
								className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
									activeTab === "tools"
										? "bg-card text-foreground shadow-xs font-bold"
										: "text-muted-foreground hover:text-foreground"
								}`}
								title="Herramientas de Negocio Disponibles"
							>
								<Wrench className="h-3.5 w-3.5" />
								<span>Herramientas</span>
							</button>

							<button
								type="button"
								onClick={() => setActiveTab("config")}
								className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
									activeTab === "config"
										? "bg-card text-foreground shadow-xs font-bold"
										: "text-muted-foreground hover:text-foreground"
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
							className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer ml-1"
							aria-label="Cerrar modal"
						>
							<X className="h-5 w-5" />
						</button>
					</div>
				</div>

				{/* Sandbox / Demo Mode Banner */}
				<div className="bg-amber-500/10 border-b border-amber-500/20 px-5 py-2 flex items-center justify-between text-xs text-amber-700 dark:text-amber-300 shrink-0">
					<div className="flex items-center gap-2">
						<span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 border border-amber-500/30 uppercase tracking-wide">
							Modo Demostración / Sandbox (IA Simulada)
						</span>
						<span className="text-[11px] leading-tight">
							Aviso para el operador: Los análisis, inferencias y
							recomendaciones son una maqueta interactiva simulada con ejecución
							autónoma de herramientas de negocio.
						</span>
					</div>
				</div>

				{/* TAB 1: HERRAMIENTAS DE NEGOCIO */}
				{activeTab === "tools" && (
					<div className="flex-1 overflow-y-auto p-5 space-y-4">
						<div className="flex items-center justify-between border-b border-border pb-3">
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
							<span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-mono font-bold">
								{BUSINESS_TOOLS.length} herramientas activas
							</span>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							{BUSINESS_TOOLS.map((t) => (
								<div
									key={t.name}
									className="rounded-xl border border-border bg-secondary/15 p-3 space-y-2 hover:border-primary/40 transition-colors"
								>
									<div className="flex items-center justify-between">
										<code className="text-xs font-mono font-bold text-primary">
											{t.name}()
										</code>
										<span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
											{t.category}
										</span>
									</div>
									<p className="text-xs text-muted-foreground leading-relaxed">
										{t.description}
									</p>
								</div>
							))}
						</div>

						<div className="p-3 rounded-xl border border-blue-500/30 bg-blue-500/10 flex items-start gap-2.5 text-xs text-blue-700 dark:text-blue-300">
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
						<div className="flex items-center justify-between border-b border-border pb-3">
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
								className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-sm flex items-center gap-1.5 text-xs"
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

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							{/* Nombre del Asistente */}
							<div className="space-y-1.5">
								<label
									htmlFor="agent-name-input"
									className="font-bold text-foreground text-xs"
								>
									Nombre del Asistente:
								</label>
								<input
									id="agent-name-input"
									type="text"
									value={configNombre}
									onChange={(e) => setConfigNombre(e.target.value)}
									className="w-full bg-secondary/20 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
									placeholder="Plottio Asistente"
								/>
							</div>

							{/* Modelo LLM */}
							<div className="space-y-1.5">
								<label
									htmlFor="agent-model-select"
									className="font-bold text-foreground text-xs"
								>
									Modelo LLM Asignado:
								</label>
								<select
									id="agent-model-select"
									value={configModel}
									onChange={(e) => setConfigModel(e.target.value)}
									className="w-full bg-secondary/20 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
								>
									<option value="gemini-1.5-pro">Google Gemini 1.5 Pro</option>
									<option value="gemini-1.5-flash">
										Google Gemini 1.5 Flash
									</option>
									<option value="llama-3.3-70b-versatile">
										Groq Llama 3.3 70B
									</option>
									<option value="gpt-4o">OpenAI GPT-4o</option>
									<option value="gpt-4o-mini">OpenAI GPT-4o Mini</option>
								</select>
							</div>
						</div>

						{/* Prompt del Sistema / Instrucciones */}
						<div className="space-y-1.5">
							<label
								htmlFor="agent-system-prompt"
								className="font-bold text-foreground text-xs flex justify-between"
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
								className="w-full bg-secondary/20 border border-border rounded-xl p-3 text-xs text-foreground focus:outline-none focus:border-primary font-mono leading-relaxed"
							/>
						</div>

						{/* Sliders de Temperatura y Calibración RAG */}
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
							{/* Temperatura */}
							<div className="rounded-xl border border-border bg-card p-3 space-y-2">
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
							<div className="rounded-xl border border-border bg-card p-3 space-y-2">
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
							<div className="rounded-xl border border-border bg-card p-3 space-y-2">
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
										className="text-destructive hover:underline cursor-pointer flex items-center gap-0.5"
									>
										<Trash2 className="h-3 w-3" />
										Vaciar
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
											className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs sm:text-sm font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-sm flex items-center gap-2"
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
														<Brain className="h-3 w-3" /> {configNombre}
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
														: msg.isSecurityAlert
															? "bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/30 rounded-tl-xs"
															: "bg-secondary/30 text-foreground border border-border rounded-tl-xs"
												}`}
											>
												{/* Security alert header */}
												{msg.isSecurityAlert && (
													<div className="flex items-center gap-1.5 mb-2 font-bold text-red-600 dark:text-red-400 text-xs uppercase tracking-wider">
														<ShieldAlert className="h-4 w-4 shrink-0" />
														<span>Guardrail de Seguridad Activado</span>
													</div>
												)}

												{/* Tools Called Visualizer (Agentic RAG) */}
												{msg.toolsCalled && msg.toolsCalled.length > 0 && (
													<div className="mb-3 space-y-1.5 border-b border-border/50 pb-2.5">
														<span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
															<Wrench className="h-3 w-3" /> Herramientas
															Invocadas:
														</span>
														<div className="flex flex-wrap gap-1.5">
															{msg.toolsCalled.map((tc, idx) => (
																<span
																	// biome-ignore lint/suspicious/noArrayIndexKey: tool calls list
																	key={idx}
																	className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary text-[10px] font-mono font-semibold"
																>
																	<Check className="h-2.5 w-2.5" />
																	{tc.toolName}()
																</span>
															))}
														</div>
													</div>
												)}

												{/* Message content */}
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
															<span>Datos de Contexto Recuperados (RAG):</span>
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
																			{c.type === "vehiculo" && (
																				<AlertTriangle className="h-3 w-3 text-indigo-500 shrink-0" />
																			)}
																			<span className="truncate">
																				{c.title}
																			</span>
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

						{/* Quick Suggestions */}
						{rag.indexedDocumentsCount > 0 && (
							<div className="px-4 py-2 bg-secondary/10 border-t border-border flex items-center gap-2 overflow-x-auto text-[11px] shrink-0">
								<span className="text-muted-foreground font-semibold shrink-0">
									Sugerencias:
								</span>
								{[
									"¿Cuál es el estado de la orden Chevrolet D-Max?",
									"Consultar stock de bobinas de vinilo 3M",
									"Ver cotizaciones aprobadas con flotas",
									"Modificar rol de usuario y permisos",
								].map((s) => (
									<button
										key={s}
										type="button"
										onClick={() => setQuery(s)}
										className={`px-2.5 py-1 rounded-full border text-xs shrink-0 transition-colors cursor-pointer ${
											s.includes("rol")
												? "border-red-500/30 bg-red-500/10 text-red-600 hover:bg-red-500/20"
												: "border-border bg-background hover:bg-secondary text-foreground"
										}`}
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
										? "Indexa la base de conocimiento para comenzar..."
										: "Pregunta a Plottio Asistente con Agentic RAG... (ej. 'estado de la orden Chevrolet D-Max o stock de vinilo')"
								}
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								className="flex-1 bg-secondary/20 border border-border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary disabled:opacity-50"
							/>
							<button
								type="submit"
								disabled={!query.trim() || rag.indexedDocumentsCount === 0}
								className="p-2.5 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer shadow-xs shrink-0"
								title="Enviar consulta"
							>
								<Send className="h-4 w-4" />
							</button>
						</form>
					</>
				)}

				{/* Footer Bar */}
				<div className="px-4 py-2 border-t border-border/50 bg-secondary/5 flex items-center justify-between text-[11px] text-muted-foreground shrink-0">
					<span className="flex items-center gap-1.5">
						<span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
						Base de conocimiento:{" "}
						<strong className="text-foreground">
							{rag.indexedDocumentsCount}
						</strong>{" "}
						entidades operacionales
					</span>
					<span className="flex items-center gap-1 font-mono">
						<Command className="h-3 w-3" /> + K para alternar
					</span>
				</div>
			</div>
		</div>
	);
};
