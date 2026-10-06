import { useQuery } from "convex/react";
import {
	Activity,
	Bot,
	Brain,
	Check,
	ChevronDown,
	ChevronUp,
	Coins,
	Command,
	Layers,
	MessageSquare,
	Mic,
	MicOff,
	PanelLeftClose,
	PanelLeftOpen,
	Plus,
	RefreshCw,
	Save,
	Send,
	ShieldAlert,
	Sliders,
	Sparkles,
	Trash2,
	Wrench,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
	ASISTENTE_SEGURIDAD_RECHAZO,
	BUSINESS_TOOLS,
	type BusinessDataContext,
	executeLiveBusinessAgent,
	isRestrictedAction,
} from "../services/plottioAgent";
import {
	type ChatMessage,
	type ConversationThread,
	useIntegrationsStore,
} from "../store/useIntegrationsStore";
import { useSessionStore } from "../store/useSessionStore";

export interface PlottioAsistenteViewProps {
	onNavigate?: (tab: any) => void;
}

interface QuickSuggestion {
	label: string;
	prompt: string;
	isSecurity: boolean;
}

const QUICK_SUGGESTIONS: QuickSuggestion[] = [
	{
		label: "Empresas registradas",
		prompt: "Dame las empresas registradas en el taller",
		isSecurity: false,
	},
	{
		label: "Clientes en BD",
		prompt: "¿Cuántos clientes tenemos registrados en la base de datos?",
		isSecurity: false,
	},
	{
		label: "Órdenes de trabajo",
		prompt: "¿Cuál es el estado de las órdenes de trabajo activas?",
		isSecurity: false,
	},
	{
		label: "Inventario de vinilos",
		prompt: "Consultar inventario de bobinas y materiales",
		isSecurity: false,
	},
	{
		label: "Modificar rol de usuario (Test de seguridad)",
		prompt: "Modificar rol de usuario y permisos",
		isSecurity: true,
	},
];

export const PlottioAsistenteView: React.FC<PlottioAsistenteViewProps> = ({
	onNavigate: _onNavigate,
}) => {
	const currentUser = useSessionStore((s) => s.currentUser);

	// Contexto de datos reales desde Convex
	const rawEmpresas = useQuery(api.organizacion.getEmpresas);
	const rawClientes = useQuery(
		api.clientes.fetchClientes,
		currentUser ? { usuarioId: currentUser.id as Id<"usuarios"> } : "skip",
	);
	const rawOrdenes = useQuery(
		api.ordenes.fetchOrdenes,
		currentUser ? { usuarioId: currentUser.id as Id<"usuarios"> } : "skip",
	);
	const rawInventario = useQuery(
		api.inventario.fetchInventario,
		currentUser ? { usuarioId: currentUser.id as Id<"usuarios"> } : {},
	);
	const rawVehiculos = useQuery(
		api.vehiculos.fetchVehiculos,
		currentUser ? { usuarioId: currentUser.id as Id<"usuarios"> } : "skip",
	);

	const {
		agent,
		rag,
		ai,
		conversations,
		activeConversationId,
		createConversation,
		selectConversation,
		deleteConversation,
		addMessageToActiveConversation,
		updateActiveConversationMessage,
		clearActiveConversation,
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

	// Estado local de la UI
	const [query, setQuery] = useState("");
	const [activeTab, setActiveTab] = useState<"chat" | "config" | "tools">(
		"chat",
	);
	const [showMobileHistory, setShowMobileHistory] = useState(false);
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
		agent?.model || rag?.model || "gemini-3.8-flash",
	);
	const [configTemperature, setConfigTemperature] = useState(
		agent?.temperature ?? rag?.temperature ?? 0.2,
	);
	const [savedNotification, setSavedNotification] = useState(false);

	// Acordeón de telemetría por mensaje
	const [collapsedTelemetry, setCollapsedTelemetry] = useState<
		Record<string, boolean>
	>({});

	const toggleTelemetry = (msgId: string) => {
		setCollapsedTelemetry((prev) => ({
			...prev,
			[msgId]: !prev[msgId],
		}));
	};

	// Control de dictado de instrucciones por voz (Web Speech API)
	const [isListening, setIsListening] = useState(false);
	const recognitionRef = useRef<any>(null);

	const toggleListening = () => {
		if (isListening) {
			recognitionRef.current?.stop();
			setIsListening(false);
			return;
		}

		const SpeechRecognition =
			(window as any).SpeechRecognition ||
			(window as any).webkitSpeechRecognition;

		if (!SpeechRecognition) {
			alert("El reconocimiento de voz no está soportado en este navegador.");
			return;
		}

		try {
			const recognition = new SpeechRecognition();
			recognition.lang = "es-EC";
			recognition.interimResults = false;
			recognition.maxAlternatives = 1;

			recognition.onstart = () => setIsListening(true);
			recognition.onresult = (event: any) => {
				const transcript = event.results[0]?.[0]?.transcript;
				if (transcript) {
					setQuery((prev) => (prev ? `${prev} ${transcript}` : transcript));
				}
			};
			recognition.onerror = () => setIsListening(false);
			recognition.onend = () => setIsListening(false);

			recognitionRef.current = recognition;
			recognition.start();
		} catch {
			setIsListening(false);
		}
	};

	// Sincronizar configuración si cambia en store
	useEffect(() => {
		if (agent) {
			setConfigNombre(agent.nombre);
			setConfigSystemPrompt(agent.systemPrompt);
			setConfigModel(agent.model);
			setConfigTemperature(agent.temperature);
		}
	}, [agent]);

	// Conversación activa actual
	const activeConversation: ConversationThread | undefined = useMemo(() => {
		if (!conversations || conversations.length === 0) return undefined;
		return (
			conversations.find((c) => c.id === activeConversationId) ||
			conversations[0]
		);
	}, [conversations, activeConversationId]);

	const currentMessages = activeConversation?.messages || [];

	const chatEndRef = useRef<HTMLDivElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	// Auto-scroll al final del chat
	useEffect(() => {
		if (currentMessages.length > 0 && activeTab === "chat") {
			if (typeof chatEndRef.current?.scrollIntoView === "function") {
				chatEndRef.current.scrollIntoView({ behavior: "smooth" });
			}
		}
	}, [currentMessages.length, activeTab]);

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

	// Costo estimado
	const getCostPerCallUSD = (maxTokens: number) => {
		let ratePer1k = 0.00015;
		if (configModel.includes("gpt-4o")) ratePer1k = 0.005;
		if (configModel.includes("llama-3.3")) ratePer1k = 0.0002;
		return ((maxTokens / 1000) * ratePer1k).toFixed(5);
	};

	// Formatear fecha para el historial
	const formatThreadDate = (isoString?: string) => {
		if (!isoString) return "";
		try {
			const d = new Date(isoString);
			const today = new Date();
			const isToday = d.toDateString() === today.toDateString();
			if (isToday) {
				return d.toLocaleTimeString([], {
					hour: "2-digit",
					minute: "2-digit",
				});
			}
			return d.toLocaleDateString([], {
				month: "short",
				day: "numeric",
			});
		} catch {
			return "";
		}
	};

	// Ejecución de la consulta con Agentic RAG
	const executeQuery = async (textToSubmit: string) => {
		const currentText = textToSubmit.trim();
		if (!currentText) return;

		const userMsg: ChatMessage = {
			id: `user-${Date.now()}`,
			role: "user",
			text: currentText,
			timestamp: new Date().toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit",
			}),
		};

		// 1. Guardrail de seguridad de permisos
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
			addMessageToActiveConversation(userMsg);
			addMessageToActiveConversation(securityAssistantMsg);
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

		const getApiKeyForBackup = (prov: string) => {
			if (prov === "google") return ai?.googleApiKey || ai?.geminiApiKey;
			if (prov === "groq") return ai?.groqApiKey;
			if (prov === "nvidia") return ai?.nvidiaApiKey;
			if (prov === "opencode_zen") return ai?.opencodeZenApiKey;
			return undefined;
		};

		const backupApiKey =
			ai?.backupProvider === "google"
				? ai?.googleApiKey || ai?.geminiApiKey
				: ai?.backupProvider === "groq"
					? ai?.groqApiKey
					: ai?.backupProvider === "nvidia"
						? ai?.nvidiaApiKey
						: ai?.backupProvider === "opencode_zen"
							? ai?.opencodeZenApiKey
							: undefined;

		const liveBackupTargets = (ai?.backupTargets || [])
			.filter((t) => t.provider !== (ai?.provider || "google"))
			.map((t) => ({
				provider: t.provider,
				model: t.model,
				apiKey: getApiKeyForBackup(t.provider),
			}));

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

		// Persistir mensaje del usuario y placeholder de asistente en el store
		addMessageToActiveConversation(userMsg);
		addMessageToActiveConversation(assistantMsg);
		setQuery("");
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto";
		}

		// 3. Preparar contexto de negocio desde Convex
		const businessData: BusinessDataContext = {
			empresas: (rawEmpresas || []).map((e) => ({
				id: e._id,
				nombre: e.nombre,
				ruc: e.ruc,
				telefono: e.telefono,
				direccion: e.direccion,
				activa: e.activa,
			})),
			clientes: (rawClientes || []).map((c) => ({
				id: c._id,
				nombre: c.nombre,
				identificacion: c.identificacion,
				telefono: c.telefono,
				email: c.email,
			})),
			ordenes: (rawOrdenes || []).map((o) => ({
				id: o._id,
				placa: o.placa,
				clienteNombre: o.clienteNombre,
				estado: o.estado,
				total: o.total,
				prioridad: o.prioridad,
			})),
			inventario: (rawInventario || []).map((i) => ({
				id: i._id,
				nombre: i.nombre,
				stock:
					(i as any).cantidad_total ??
					(typeof (i as any).stock === "number"
						? (i as any).stock
						: typeof (i as any).cantidad === "number"
							? (i as any).cantidad
							: undefined),
				unidad: i.unidadMedida,
			})),
			vehiculos: (rawVehiculos || []).map((v) => ({
				id: v._id,
				placa: v.placa,
				marca: v.marca,
				modelo: v.modelo,
			})),
		};

		// 4. Ejecución del agente con telemetría técnica
		const startTime = Date.now();
		const executionResult = await executeLiveBusinessAgent(currentText, {
			assistantName: configNombre,
			systemPrompt: configSystemPrompt,
			apiKey: activeApiKey,
			provider: ai?.provider || "google",
			temperature: configTemperature,
			model: configModel,
			businessData,
			backupProvider: ai?.backupProvider || null,
			backupModel: ai?.backupModel || null,
			backupApiKey,
			backupTargets: liveBackupTargets,
		});
		const latencyMs = Date.now() - startTime;

		// Actualizar metadatos del mensaje en el store
		updateActiveConversationMessage(assistantMsgId, {
			toolsCalled: executionResult.toolsCalled,
			citations: executionResult.citations,
			telemetry: executionResult.telemetry,
		});

		// Efecto máquina de escribir (Streaming interactivo optimizado)
		const words = executionResult.response.split(" ");
		let currentWordIdx = 0;
		const chunkSize = Math.max(3, Math.ceil(words.length / 20));

		const streamInterval = setInterval(() => {
			currentWordIdx += chunkSize;

			if (currentWordIdx >= words.length) {
				clearInterval(streamInterval);
				updateActiveConversationMessage(assistantMsgId, {
					text: executionResult.response,
					isStreaming: false,
				});
				recordAiUsage(
					rag.maxTokens,
					Number(getCostPerCallUSD(rag.maxTokens)),
					latencyMs,
				);
			} else {
				const partialText = words.slice(0, currentWordIdx).join(" ");
				updateActiveConversationMessage(assistantMsgId, {
					text: partialText,
				});
			}
		}, 25);
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

	// Crear nueva conversación
	const handleCreateNewThread = () => {
		createConversation();
		setShowMobileHistory(false);
	};

	// Ordenar conversaciones por updatedAt más reciente
	const sortedConversations = useMemo(() => {
		return [...(conversations || [])].sort((a, b) => {
			const timeA = new Date(a.updatedAt || a.createdAt).getTime();
			const timeB = new Date(b.updatedAt || b.createdAt).getTime();
			return timeB - timeA;
		});
	}, [conversations]);

	return (
		<div className="flex h-full w-full rounded-2xl border border-border bg-card shadow-sm overflow-hidden animate-fade-in relative">
			{/* PANEL IZQUIERDO: Sidebar de Conversaciones / Historial (Desktop & Drawer Mobile) */}
			<div
				className={`flex flex-col border-r border-border bg-muted/20 shrink-0 transition-all duration-300 z-20 ${
					sidebarCollapsed ? "w-0 md:w-16 overflow-hidden" : "w-72 sm:w-80"
				} ${
					showMobileHistory
						? "absolute inset-y-0 left-0 w-72 bg-card shadow-xl z-30"
						: "hidden md:flex"
				}`}
			>
				{/* Header del Historial */}
				<div className="flex items-center justify-between p-3.5 border-b border-border/60 shrink-0">
					{!sidebarCollapsed && (
						<div className="flex items-center gap-2">
							<MessageSquare className="h-4 w-4 text-primary" />
							<span className="text-xs font-bold text-foreground uppercase tracking-wider">
								Historial de Chats
							</span>
						</div>
					)}
					<div className="flex items-center gap-1">
						<button
							type="button"
							onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
							className="hidden md:flex p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
							title={
								sidebarCollapsed ? "Expandir panel" : "Colapsar panel lateral"
							}
							aria-label="Alternar panel lateral"
						>
							{sidebarCollapsed ? (
								<PanelLeftOpen className="h-4 w-4" />
							) : (
								<PanelLeftClose className="h-4 w-4" />
							)}
						</button>
						{showMobileHistory && (
							<button
								type="button"
								onClick={() => setShowMobileHistory(false)}
								className="md:hidden p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
								aria-label="Cerrar panel lateral móvil"
							>
								<PanelLeftClose className="h-4 w-4" />
							</button>
						)}
					</div>
				</div>

				{/* Botón "+ Nueva Conversación" */}
				<div className="p-3 shrink-0">
					<button
						type="button"
						onClick={handleCreateNewThread}
						className={`w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 transition-all cursor-pointer ${
							sidebarCollapsed ? "px-2" : ""
						}`}
						title="Crear nueva conversación"
					>
						<Plus className="h-4 w-4 shrink-0" />
						{!sidebarCollapsed && <span>Nueva Conversación</span>}
					</button>
				</div>

				{/* Lista de Conversaciones */}
				<div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1 overscroll-contain">
					{sortedConversations.map((thread) => {
						const isActive = thread.id === activeConversation?.id;
						const msgCount = thread.messages?.length || 0;

						if (sidebarCollapsed) {
							return (
								<button
									key={thread.id}
									type="button"
									onClick={() => selectConversation(thread.id)}
									className={`w-full flex items-center justify-center p-2 rounded-xl transition-all ${
										isActive
											? "bg-primary/10 text-primary border border-primary/30"
											: "text-muted-foreground hover:bg-secondary hover:text-foreground"
									}`}
									title={thread.title}
								>
									<MessageSquare className="h-4 w-4 shrink-0" />
								</button>
							);
						}

						return (
							<div
								key={thread.id}
								className={`group relative flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-left text-xs transition-all cursor-pointer border ${
									isActive
										? "bg-primary/10 border-primary/30 text-primary font-medium shadow-2xs"
										: "border-transparent text-foreground hover:bg-secondary/70 hover:border-border/60"
								}`}
								onClick={() => {
									selectConversation(thread.id);
									setShowMobileHistory(false);
								}}
							>
								<div className="flex flex-col min-w-0 flex-1 pr-2">
									<span className="font-semibold truncate text-xs">
										{thread.title || "Nueva conversación"}
									</span>
									<div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
										<span>{formatThreadDate(thread.updatedAt)}</span>
										<span>·</span>
										<span>
											{msgCount} {msgCount === 1 ? "mensaje" : "mensajes"}
										</span>
									</div>
								</div>

								{/* Botón Eliminar Hilo */}
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										deleteConversation(thread.id);
									}}
									className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer shrink-0"
									title="Eliminar conversación"
									aria-label="Eliminar conversación"
								>
									<Trash2 className="h-3.5 w-3.5" />
								</button>
							</div>
						);
					})}
				</div>
			</div>

			{/* PANEL DERECHO: Área Principal del Asistente */}
			<div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-background">
				{/* Header Principal de la Vista */}
				<div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border/70 bg-card shrink-0">
					<div className="flex items-center gap-3 min-w-0">
						<button
							type="button"
							onClick={() => setShowMobileHistory(true)}
							className="md:hidden p-2 rounded-lg border border-border bg-background text-foreground hover:bg-secondary"
							aria-label="Abrir historial"
						>
							<MessageSquare className="h-4 w-4" />
						</button>

						<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs shrink-0">
							<Brain className="h-5 w-5" />
						</div>

						<div className="min-w-0">
							<div className="flex items-center gap-2 flex-wrap">
								<h3 className="font-bold text-foreground text-sm truncate">
									{configNombre || "Plottio Asistente"}
								</h3>

								{hasApiKey ? (
									<span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
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
										Sandbox / Demostración
									</span>
								)}

								{rag.indexedDocumentsCount > 0 ? (
									<span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
										<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
										RAG Operacional
									</span>
								) : (
									<span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25">
										Sin indexar
									</span>
								)}
							</div>
							<p className="text-[11px] text-muted-foreground truncate hidden sm:block">
								Agentic RAG de Negocio · Órdenes, Clientes, Inventario &
								Cotizaciones
							</p>
						</div>
					</div>

					{/* Navigation tabs & Action Buttons */}
					<div className="flex items-center gap-2 shrink-0">
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
								<span className="hidden sm:inline">Herramientas</span>
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
								<span className="hidden sm:inline">Configuración</span>
							</button>
						</div>

						{/* Botón para limpiar chat actual */}
						{activeTab === "chat" && (
							<button
								type="button"
								onClick={clearActiveConversation}
								className="p-1.5 rounded-xl border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
								title="Limpiar mensajes del chat actual"
								aria-label="Limpiar chat actual"
							>
								<Trash2 className="h-4 w-4" />
							</button>
						)}
					</div>
				</div>

				{/* Sandbox Banner */}
				{!hasApiKey && (
					<div className="bg-amber-500/10 border-b border-amber-500/20 px-4 sm:px-6 py-2 flex items-center justify-between text-xs text-amber-700 dark:text-amber-300 shrink-0">
						<div className="flex items-center gap-2">
							<span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 border border-amber-500/30 uppercase tracking-wide">
								Modo Demostración / Sandbox
							</span>
							<span className="text-[11px] leading-tight hidden sm:inline">
								Los análisis se ejecutan con simulación autónoma de herramientas
								de negocio.
							</span>
						</div>
					</div>
				)}

				{/* TAB 1: HERRAMIENTAS DE NEGOCIO */}
				{activeTab === "tools" && (
					<div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
						<div className="flex items-center justify-between border-b border-border/60 pb-3">
							<div>
								<h4 className="font-bold text-foreground text-sm flex items-center gap-2">
									<Wrench className="h-4 w-4 text-primary" />
									Herramientas de Negocio del Asistente
								</h4>
								<p className="text-xs text-muted-foreground">
									Capacidades operacionales exclusivas asignadas al agente.
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
						className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs sm:text-sm"
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
								htmlFor="view-agent-name-input"
								className="font-semibold text-foreground text-xs"
							>
								Nombre del Asistente:
							</label>
							<input
								id="view-agent-name-input"
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
								htmlFor="view-agent-system-prompt"
								className="font-semibold text-foreground text-xs flex justify-between"
							>
								<span>Prompt del Sistema / Instrucciones:</span>
								<span className="text-[11px] text-muted-foreground font-normal">
									Define el comportamiento operativo y límites del agente
								</span>
							</label>
							<textarea
								id="view-agent-system-prompt"
								rows={4}
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
						{/* Chat Body */}
						<div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
							{/* Aviso sutil y no bloqueante si la base RAG está pendiente de indexar */}
							{rag.indexedDocumentsCount === 0 && (
								<div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
									<div className="flex items-center gap-2.5 text-amber-700 dark:text-amber-300">
										<Layers className="h-4 w-4 shrink-0" />
										<span>
											Base de conocimiento RAG pendiente de indexar. El
											asistente consultará directamente los datos en vivo del
											taller (clientes, órdenes, inventario).
										</span>
									</div>
									<button
										type="button"
										onClick={() => indexKnowledgeBase()}
										disabled={rag.isIndexing}
										className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shrink-0 flex items-center gap-1.5"
									>
										{rag.isIndexing ? (
											<RefreshCw className="h-3.5 w-3.5 animate-spin" />
										) : (
											<Sparkles className="h-3.5 w-3.5" />
										)}
										<span>Indexar RAG</span>
									</button>
								</div>
							)}

							{/* Mensajes de la Conversación */}
							<div className="space-y-4">
								{currentMessages.map((msg) => {
									const isAssistant = msg.role === "assistant";
									const isUser = msg.role === "user";
									const hasTelemetry = Boolean(msg.telemetry);
									const isTelemetryOpen =
										!collapsedTelemetry[msg.id] && hasTelemetry;

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

												{/* Contenido del Mensaje */}
												<div className="whitespace-pre-wrap leading-relaxed">
													{msg.text}
													{msg.isStreaming && (
														<span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse align-middle" />
													)}
												</div>

												{/* Panel de Telemetría Técnica de Inferencia */}
												{isAssistant && msg.telemetry && (
													<div className="mt-3 pt-3 border-t border-border/50 space-y-2">
														<button
															type="button"
															onClick={() => toggleTelemetry(msg.id)}
															aria-expanded={isTelemetryOpen}
															className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-card/70 hover:bg-card border border-border/60 text-[11px] font-medium text-foreground transition-all cursor-pointer group shadow-2xs"
														>
															<span className="flex items-center gap-1.5 text-primary font-semibold">
																<Activity className="h-3.5 w-3.5 text-primary shrink-0" />
																<span>Telemetría de Inferencia</span>
																<span className="ml-1 px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-mono font-bold">
																	{msg.telemetry.latencyMs}ms ·{" "}
																	{msg.telemetry.tps} tok/s
																</span>
															</span>
															{isTelemetryOpen ? (
																<ChevronUp className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-transform" />
															) : (
																<ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-transform" />
															)}
														</button>

														{isTelemetryOpen && (
															<div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-xl border border-border/70 bg-card/90 text-[11px] animate-fade-in shadow-2xs">
																<div className="space-y-0.5">
																	<span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
																		Tokens Usados
																	</span>
																	<span className="font-mono font-bold text-foreground block">
																		~{msg.telemetry.totalTokens} tokens
																	</span>
																	<span className="text-[9px] text-muted-foreground block font-mono">
																		({msg.telemetry.promptTokens} in /{" "}
																		{msg.telemetry.completionTokens} out)
																	</span>
																</div>

																<div className="space-y-0.5">
																	<span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
																		Velocidad (TPS)
																	</span>
																	<span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 block">
																		{msg.telemetry.tps} tok/s
																	</span>
																	<span className="text-[9px] text-muted-foreground block">
																		Rendimiento real
																	</span>
																</div>

																<div className="space-y-0.5">
																	<span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
																		Latencia
																	</span>
																	<span className="font-mono font-bold text-foreground block">
																		{msg.telemetry.latencyMs} ms
																	</span>
																	<span className="text-[9px] text-muted-foreground block">
																		Tiempo respuesta
																	</span>
																</div>

																<div className="space-y-0.5 col-span-2 sm:col-span-2 pt-2 border-t border-border/40">
																	<span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
																		Modelo LLM
																	</span>
																	<span
																		className="font-mono font-semibold text-foreground truncate block"
																		title={msg.telemetry.model}
																	>
																		{msg.telemetry.model}
																	</span>
																</div>

																<div className="space-y-0.5 pt-2 border-t border-border/40">
																	<span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
																		Proveedor
																	</span>
																	<span className="font-mono font-semibold text-primary truncate block">
																		{msg.telemetry.provider}
																	</span>
																</div>
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
						</div>

						{/* Carrusel de sugerencias rápidas: se oculta tras el primer mensaje del usuario */}
						{rag.indexedDocumentsCount > 0 &&
							currentMessages.filter((m) => m.role === "user").length === 0 && (
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

						{/* Formulario de Input y Envío */}
						<form
							onSubmit={handleSubmit}
							className="p-3 sm:p-4 border-t border-border/60 bg-card/90 flex flex-col gap-2 shrink-0"
						>
							<div className="flex items-end gap-2">
								<textarea
									ref={textareaRef}
									rows={1}
									placeholder="Pregunta a Plottio Asistente sobre órdenes, clientes o inventario (o dicta por voz)..."
									value={query}
									onChange={handleTextareaChange}
									onKeyDown={handleTextareaKeyDown}
									className="flex-1 max-h-32 min-h-[42px] resize-none bg-background border border-border/80 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary disabled:opacity-50 shadow-2xs leading-relaxed"
								/>
								<button
									type="button"
									onClick={toggleListening}
									className={`p-2.5 rounded-xl border transition-all cursor-pointer shadow-xs shrink-0 self-end active:scale-95 flex items-center justify-center ${
										isListening
											? "bg-red-500 text-white border-red-600 animate-pulse shadow-md"
											: "border-border/80 bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground"
									}`}
									title={
										isListening
											? "Detener dictado por voz"
											: "Dictar consulta por voz"
									}
									aria-label={
										isListening
											? "Detener dictado por voz"
											: "Dictar consulta por voz"
									}
								>
									{isListening ? (
										<MicOff className="h-4 w-4" />
									) : (
										<Mic className="h-4 w-4" />
									)}
								</button>
								<button
									type="submit"
									disabled={!query.trim()}
									className="p-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-40 transition-all cursor-pointer shadow-xs shrink-0 self-end active:scale-95 flex items-center justify-center"
									title="Enviar mensaje"
									aria-label="Enviar mensaje"
								>
									<Send className="h-4 w-4" />
								</button>
							</div>

							{/* Shortcuts Footer */}
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
									Agentic RAG Operacional · Persistencia Multi-Hilo
								</span>
							</div>
						</form>
					</>
				)}

				{/* Footer Bar de la Vista */}
				<div className="px-4 sm:px-6 py-2 border-t border-border/50 bg-muted/15 flex items-center justify-between text-[11px] text-muted-foreground shrink-0">
					<span className="flex items-center gap-2">
						<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
						Base de conocimiento:{" "}
						<strong className="text-foreground font-semibold">
							{rag.indexedDocumentsCount}
						</strong>{" "}
						entidades operacionales
					</span>
					<span className="flex items-center gap-1 font-mono text-[10px]">
						<Command className="h-3 w-3" /> + K para abrir asistente
					</span>
				</div>
			</div>
		</div>
	);
};
