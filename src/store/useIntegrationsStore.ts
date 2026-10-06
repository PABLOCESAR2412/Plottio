import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
	AgentTelemetry,
	BusinessCitation,
	ToolCallExecution,
} from "../services/plottioAgent";

export interface ChatMessage {
	id: string;
	role: "user" | "assistant";
	text: string;
	isStreaming?: boolean;
	citations?: BusinessCitation[];
	toolsCalled?: ToolCallExecution[];
	telemetry?: AgentTelemetry;
	isSecurityAlert?: boolean;
	timestamp: string;
}

export interface ConversationThread {
	id: string;
	title: string;
	createdAt: string;
	updatedAt: string;
	messages: ChatMessage[];
}

export const createInitialConversationThread = (): ConversationThread => {
	const now = new Date().toISOString();
	return {
		id: `conv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
		title: "Nueva conversación",
		createdAt: now,
		updatedAt: now,
		messages: [
			{
				id: "welcome",
				role: "assistant",
				text: "¡Hola! Soy Plottio Asistente, tu copiloto operacional con Agentic RAG. Cuento con herramientas de negocio para consultar y gestionar órdenes de trabajo, inventario de vinilos, clientes, cotizaciones y vehículos de flota.",
				timestamp: "Ahora",
			},
		],
	};
};

export interface WhatsAppMessage {
	id: string;
	sender: "client" | "agent";
	text: string;
	timestamp: string;
	status: "sent" | "delivered" | "read";
}

export interface WebhookConfig {
	id: string;
	name: string;
	url: string;
	secret: string;
	events: string[];
	active: boolean;
	createdAt: string;
}

export interface InboundWebhookLog {
	id: string;
	event: string;
	payload: string;
	receivedAt: string;
	status: "success" | "error";
	responseCode: number;
	source?:
		| "Zapier"
		| "Make"
		| "Formulario Web"
		| "CRM / ERP Externo"
		| "Webhook Genérico";
	ip?: string;
	hmacSignature?: string;
	hmacValid?: boolean;
	leadName?: string;
	leadPhone?: string;
	leadCompany?: string;
	crmCreated?: boolean;
}

export type AiProvider = "google" | "groq" | "opencode_zen" | "nvidia";
export type AiTimeFilter = "dia" | "semana" | "15dias" | "1mes" | "intervalos";

export interface BackupTarget {
	provider: AiProvider;
	model: string;
}

export const AI_MODELS_BY_PROVIDER: Record<AiProvider, string[]> = {
	google: [
		"Gemini 3.8 Flash (Recomendado · Rápido y Económico)",
		"Gemini 3.7 Flash (Recomendado · Balanceado)",
		"Gemini Flash Lite (Recomendado · Menor Costo)",
		"Gemini Flash Latest",
		"Gemini Pro Latest",
		"Gemini 2.5 Flash",
	],
	groq: [
		"Llama 3.3 70B Versatile (Recomendado · Alto Rendimiento)",
		"Llama 3.1 8B Instant (Recomendado · Ultra Rápido y Económico)",
		"Llama 3.2 1B Preview (Ultra Liviano)",
		"Llama 3.2 3B Preview",
		"Llama 3 70B 8192",
		"Llama 3 8B 8192",
		"Mixtral 8x7B 32768",
		"Gemma 2 9B IT",
		"DeepSeek R1 Distill Llama 70B",
		"Qwen 2.5 Coder 32B",
	],
	opencode_zen: [
		"DeepSeek V3 (Recomendado · Económico y Capaz)",
		"Qwen 2.5 Coder 32B (Recomendado · Precisión Técnica)",
		"DeepSeek R1 (Razonamiento Profundo)",
		"Qwen 2.5 72B Instruct",
		"Meta Llama 3.3 70B Instruct",
		"Mistral Large 2",
	],
	nvidia: [
		"Llama 3.1 Nemotron 70B (Recomendado · Precisión Alta)",
		"Mistral NeMo 12B (Recomendado · Rápido y Económico)",
		"Meta Llama 3.1 8B Instruct",
		"Meta Llama 3.1 70B Instruct",
		"Meta Llama 3.3 70B Instruct",
		"Mistral Large 2 Instruct",
		"Nemotron 4 340B Instruct",
		"DeepSeek R1",
	],
};

interface IntegrationsState {
	// 1. WhatsApp
	whatsapp: {
		instanceName: string;
		serverUrl: string;
		apiUrl?: string;
		apiKey: string;
		status: "disconnected" | "connecting" | "connected";
		qrCode: string | null;
		chats: Record<string, WhatsAppMessage[]>; // keyed by client phone or ID
	};
	updateWhatsAppConfig: (
		config: Partial<IntegrationsState["whatsapp"]>,
	) => void;
	sendWhatsAppMessage: (
		chatKey: string,
		text: string,
		sender?: "agent" | "client",
	) => void;
	connectWhatsApp: () => void;
	disconnectWhatsApp: () => void;
	refreshWhatsAppQr: () => void;

	// 2. Telegram Bot API
	telegram: {
		botToken: string;
		botUsername: string;
		chatId: string;
		status: "disconnected" | "connected";
		webhookUrl: string;
		enableChatOps: boolean;
	};
	updateTelegramConfig: (
		config: Partial<IntegrationsState["telegram"]>,
	) => void;
	testTelegramAlert: (message?: string) => Promise<boolean>;

	// 3. Modelos de IA & FinOps Multi-Proveedor
	ai: {
		provider: AiProvider | "gemini" | "openai" | "custom";
		backupProvider: AiProvider | null;
		backupModel: string | null;
		backupTargets: BackupTarget[];
		googleApiKey: string;
		groqApiKey: string;
		opencodeZenApiKey: string;
		nvidiaApiKey: string;
		geminiApiKey: string;
		openaiApiKey: string;
		customEndpoint: string;
		activeModel: string;
		monthlyBudgetUSD: number;
		currentSpendUSD: number;
		tokensToday: number;
		totalRequests: number;
		tps: number;
		latencyMs: number;
		timeFilter: AiTimeFilter;
		customIntervalStart?: string;
		customIntervalEnd?: string;
		tokenUsageHourly: { hour: string; tokens: number; costUSD: number }[];
	};
	updateAiConfig: (config: Partial<IntegrationsState["ai"]>) => void;
	recordAiUsage: (tokens: number, costUSD: number, latencyMs?: number) => void;
	setTimeFilter: (filter: AiTimeFilter, start?: string, end?: string) => void;

	// 4. Plottio Asistente (Agentic RAG)
	agent: {
		nombre: string;
		systemPrompt: string;
		model: string;
		temperature: number;
	};
	updateAgentConfig: (config: Partial<IntegrationsState["agent"]>) => void;

	rag: {
		similarityThreshold: number;
		maxContextChunks: number;
		maxTokens: number;
		temperature: number;
		indexedDocumentsCount: number;
		lastCalibrationDate: string;
		isIndexing?: boolean;
		nombre?: string;
		systemPrompt?: string;
		model?: string;
	};
	updateRagConfig: (config: Partial<IntegrationsState["rag"]>) => void;
	indexKnowledgeBase: () => Promise<void>;
	clearKnowledgeIndex: () => void;

	// Historial de Conversaciones Persistente
	conversations: ConversationThread[];
	activeConversationId: string | null;
	createConversation: (title?: string) => string;
	selectConversation: (id: string) => void;
	deleteConversation: (id: string) => void;
	addMessageToActiveConversation: (message: ChatMessage) => void;
	updateActiveConversationMessage: (
		messageId: string,
		updates: Partial<ChatMessage>,
	) => void;
	clearActiveConversation: () => void;

	// 5. Hub Centralizado de Webhooks
	webhooks: WebhookConfig[];
	inboundEndpoint: string;
	inboundSecret: string;
	inboundLogs: InboundWebhookLog[];
	addWebhook: (name: string, url: string, events: string[]) => void;
	toggleWebhook: (id: string) => void;
	deleteWebhook: (id: string) => void;
	regenerateInboundSecret: () => void;
	clearInboundLogs: () => void;
	simulateInboundLead: (lead: {
		nombre: string;
		telefono: string;
		servicio: string;
		vehiculo: string;
		plataforma?:
			| "Zapier"
			| "Make"
			| "Formulario Web"
			| "CRM / ERP Externo"
			| "Webhook Genérico";
		empresa?: string;
	}) => void;
}

const getEnv = (key: string): string => {
	try {
		return (
			(typeof import.meta !== "undefined" &&
				import.meta.env &&
				(import.meta.env[key] as string)) ||
			""
		);
	} catch {
		return "";
	}
};

const initialHourlyUsage: { hour: string; tokens: number; costUSD: number }[] =
	[];

export const useIntegrationsStore = create<IntegrationsState>()(
	persist(
		(set, get) => ({
			// 1. WhatsApp
			whatsapp: {
				instanceName: "plottio-central",
				serverUrl: "https://plottio.vercel.app/api/webhook/wha",
				apiUrl: "https://plottio.vercel.app/api/webhook/wha",
				apiKey: getEnv("VITE_WHATSAPP_API_KEY") || "sec_acadia_evo_2026",
				status: "disconnected",
				qrCode: null,
				chats: {
					default: [
						{
							id: "msg-1",
							sender: "client",
							text: "Hola, quisiera saber si ya está listo el diseño de rotulado para mi camioneta.",
							timestamp: "10:15 AM",
							status: "read",
						},
						{
							id: "msg-2",
							sender: "agent",
							text: "¡Hola! Sí, el equipo de diseño acaba de cargar la maqueta en su orden de trabajo. Le adjuntamos la cotización aprobada.",
							timestamp: "10:18 AM",
							status: "read",
						},
					],
				},
			},
			updateWhatsAppConfig: (config) =>
				set((state) => {
					const serverUrl =
						config.serverUrl ?? config.apiUrl ?? state.whatsapp.serverUrl;
					return {
						whatsapp: {
							...state.whatsapp,
							...config,
							serverUrl,
							apiUrl: serverUrl,
						},
					};
				}),
			sendWhatsAppMessage: (chatKey, text, sender = "agent") =>
				set((state) => {
					const existing = state.whatsapp.chats[chatKey] ?? [];
					const newMsg: WhatsAppMessage = {
						id: `msg-${Date.now()}`,
						sender,
						text,
						timestamp: new Date().toLocaleTimeString([], {
							hour: "2-digit",
							minute: "2-digit",
						}),
						status: "sent",
					};
					return {
						whatsapp: {
							...state.whatsapp,
							chats: {
								...state.whatsapp.chats,
								[chatKey]: [...existing, newMsg],
							},
						},
					};
				}),
			connectWhatsApp: () => {
				set((state) => ({
					whatsapp: { ...state.whatsapp, status: "connecting" },
				}));
				setTimeout(() => {
					set((state) => ({
						whatsapp: { ...state.whatsapp, status: "connected", qrCode: null },
					}));
				}, 600);
			},
			disconnectWhatsApp: () =>
				set((state) => ({
					whatsapp: {
						...state.whatsapp,
						status: "disconnected",
						qrCode: null,
					},
				})),
			refreshWhatsAppQr: () =>
				set((state) => ({
					whatsapp: {
						...state.whatsapp,
						qrCode: `2@plottio_acadia_${Date.now()}`,
					},
				})),

			// 2. Telegram
			telegram: {
				botToken: getEnv("VITE_TELEGRAM_BOT_TOKEN"),
				botUsername: "@PlottioOpsBot",
				chatId: "",
				status: "disconnected",
				webhookUrl: "",
				enableChatOps: false,
			},
			updateTelegramConfig: (config) =>
				set((state) => ({
					telegram: { ...state.telegram, ...config },
				})),
			testTelegramAlert: async (
				_message = "🔔 Prueba de Alerta ChatOps: Sistema de monitoreo PLOTTIO en línea.",
			) => {
				const current = get().telegram;
				if (current.status !== "connected") return false;
				return true;
			},

			// 3. IA & FinOps Multi-Proveedor
			ai: {
				provider: "google",
				backupProvider: null,
				backupModel: null,
				backupTargets: [],
				googleApiKey:
					getEnv("VITE_GEMINI_API_KEY") || getEnv("VITE_GOOGLE_API_KEY"),
				groqApiKey: getEnv("VITE_GROQ_API_KEY"),
				opencodeZenApiKey: getEnv("VITE_OPENCODE_ZEN_API_KEY"),
				nvidiaApiKey: getEnv("VITE_NVIDIA_API_KEY"),
				// Retrocompatibilidad
				geminiApiKey:
					getEnv("VITE_GEMINI_API_KEY") || getEnv("VITE_GOOGLE_API_KEY"),
				openaiApiKey: getEnv("VITE_OPENAI_API_KEY"),
				customEndpoint: "https://ai.internal.plottio.com/v1",
				activeModel: "Gemini 3.8 Flash (Recomendado · Rápido y Económico)",
				monthlyBudgetUSD: 150.0,
				currentSpendUSD: 0,
				tokensToday: 0,
				totalRequests: 0,
				tps: 0,
				latencyMs: 0,
				timeFilter: "dia",
				customIntervalStart: new Date(Date.now() - 7 * 86400000)
					.toISOString()
					.split("T")[0],
				customIntervalEnd: new Date().toISOString().split("T")[0],
				tokenUsageHourly: initialHourlyUsage,
			},
			updateAiConfig: (config) =>
				set((state) => {
					const next = { ...state.ai, ...config };
					if (
						config.googleApiKey !== undefined &&
						config.geminiApiKey === undefined
					) {
						next.geminiApiKey = config.googleApiKey;
					} else if (
						config.geminiApiKey !== undefined &&
						config.googleApiKey === undefined
					) {
						next.googleApiKey = config.geminiApiKey;
					}

					// Sincronización de backupTargets con backupProvider y backupModel
					if (config.backupTargets !== undefined) {
						if (config.backupTargets.length > 0) {
							next.backupProvider = config.backupTargets[0].provider;
							next.backupModel = config.backupTargets[0].model;
						} else {
							next.backupProvider = null;
							next.backupModel = null;
						}
					} else if (config.backupProvider !== undefined) {
						if (config.backupProvider) {
							const prov = config.backupProvider;
							const mod =
								config.backupModel ??
								state.ai.backupModel ??
								AI_MODELS_BY_PROVIDER[prov]?.[0] ??
								"";
							next.backupTargets = [{ provider: prov, model: mod }];
						} else {
							next.backupTargets = [];
						}
					} else if (
						config.backupModel !== undefined &&
						state.ai.backupProvider
					) {
						const safeModel = config.backupModel ?? "";
						if (next.backupTargets.length > 0) {
							next.backupTargets = [
								{ ...next.backupTargets[0], model: safeModel },
								...next.backupTargets.slice(1),
							];
						} else {
							next.backupTargets = [
								{
									provider: state.ai.backupProvider,
									model: safeModel,
								},
							];
						}
					}

					return { ai: next };
				}),
			recordAiUsage: (tokens, costUSD, latencyMs) =>
				set((state) => {
					const now = new Date();
					const hourLabel = `${now.getHours().toString().padStart(2, "0")}:00`;
					const existingHourly = [...state.ai.tokenUsageHourly];
					const hourIndex = existingHourly.findIndex(
						(h) => h.hour === hourLabel,
					);
					if (hourIndex >= 0) {
						existingHourly[hourIndex] = {
							...existingHourly[hourIndex],
							tokens: existingHourly[hourIndex].tokens + tokens,
							costUSD: +(existingHourly[hourIndex].costUSD + costUSD).toFixed(
								4,
							),
						};
					} else {
						existingHourly.push({
							hour: hourLabel,
							tokens,
							costUSD: +costUSD.toFixed(4),
						});
					}

					const nextTokens = state.ai.tokensToday + tokens;
					const nextSpend = +(state.ai.currentSpendUSD + costUSD).toFixed(4);
					const nextRequests = state.ai.totalRequests + 1;
					const nextLatency =
						latencyMs && latencyMs > 0
							? latencyMs
							: state.ai.latencyMs > 0
								? Math.round((state.ai.latencyMs + (latencyMs || 250)) / 2)
								: latencyMs || 250;
					const nextTps =
						nextLatency > 0
							? +(tokens / (nextLatency / 1000)).toFixed(1)
							: 45.0;

					return {
						ai: {
							...state.ai,
							tokensToday: nextTokens,
							currentSpendUSD: nextSpend,
							totalRequests: nextRequests,
							latencyMs: nextLatency,
							tps: nextTps,
							tokenUsageHourly: existingHourly,
						},
					};
				}),
			setTimeFilter: (filter, start, end) =>
				set((state) => ({
					ai: {
						...state.ai,
						timeFilter: filter,
						...(start !== undefined ? { customIntervalStart: start } : {}),
						...(end !== undefined ? { customIntervalEnd: end } : {}),
					},
				})),

			// 4. Plottio Asistente (Agentic RAG)
			agent: {
				nombre: "Plottio Asistente",
				systemPrompt:
					"Eres Plottio Asistente, un agente operacional y RAG especializado en talleres de rotulado y gráfica vehicular. Tienes acceso exclusivo a herramientas de negocio (órdenes, clientes, inventario, cotizaciones y vehículos). No tienes autorización para alterar usuarios, roles ni configuraciones críticas del sistema.",
				model: "gemini-3.8-flash",
				temperature: 0.2,
			},
			updateAgentConfig: (config) =>
				set((state) => ({
					agent: { ...state.agent, ...config },
					rag: {
						...state.rag,
						...(config.temperature !== undefined
							? { temperature: config.temperature }
							: {}),
						...(config.nombre !== undefined ? { nombre: config.nombre } : {}),
						...(config.systemPrompt !== undefined
							? { systemPrompt: config.systemPrompt }
							: {}),
						...(config.model !== undefined ? { model: config.model } : {}),
					},
				})),

			rag: {
				similarityThreshold: 0.78,
				maxContextChunks: 6,
				maxTokens: 1024,
				temperature: 0.2,
				indexedDocumentsCount: 489,
				lastCalibrationDate: "Hoy, 04:00 AM (RAG Operacional)",
				isIndexing: false,
				nombre: "Plottio Asistente",
				systemPrompt:
					"Eres Plottio Asistente, un agente operacional y RAG especializado en talleres de rotulado y gráfica vehicular. Tienes acceso exclusivo a herramientas de negocio (órdenes, clientes, inventario, cotizaciones y vehículos). No tienes autorización para alterar usuarios, roles ni configuraciones críticas del sistema.",
				model: "gemini-3.8-flash",
			},
			updateRagConfig: (config) =>
				set((state) => ({
					rag: { ...state.rag, ...config },
					agent: {
						...state.agent,
						...(config.temperature !== undefined
							? { temperature: config.temperature }
							: {}),
						...(config.nombre !== undefined ? { nombre: config.nombre } : {}),
						...(config.systemPrompt !== undefined
							? { systemPrompt: config.systemPrompt }
							: {}),
						...(config.model !== undefined ? { model: config.model } : {}),
					},
				})),
			indexKnowledgeBase: async () => {
				set((state) => ({ rag: { ...state.rag, isIndexing: true } }));
				await new Promise((resolve) => setTimeout(resolve, 1400));
				set((state) => ({
					rag: {
						...state.rag,
						indexedDocumentsCount: 524,
						lastCalibrationDate: "Justo ahora (RAG Operacional)",
						isIndexing: false,
					},
				}));
			},
			clearKnowledgeIndex: () =>
				set((state) => ({
					rag: {
						...state.rag,
						indexedDocumentsCount: 0,
						lastCalibrationDate: "Sin registros indexados",
					},
				})),

			// Historial de Conversaciones Persistente
			conversations: [createInitialConversationThread()],
			activeConversationId: null,
			createConversation: (title?: string) => {
				const newThread = createInitialConversationThread();
				if (title) {
					newThread.title = title;
				}
				set((state) => ({
					conversations: [newThread, ...(state.conversations || [])],
					activeConversationId: newThread.id,
				}));
				return newThread.id;
			},
			selectConversation: (id: string) => {
				set(() => ({
					activeConversationId: id,
				}));
			},
			deleteConversation: (id: string) => {
				set((state) => {
					const remaining = (state.conversations || []).filter(
						(c) => c.id !== id,
					);
					if (remaining.length === 0) {
						const newThread = createInitialConversationThread();
						return {
							conversations: [newThread],
							activeConversationId: newThread.id,
						};
					}
					const nextActiveId =
						state.activeConversationId === id
							? remaining[0].id
							: state.activeConversationId;
					return {
						conversations: remaining,
						activeConversationId: nextActiveId,
					};
				});
			},
			addMessageToActiveConversation: (message: ChatMessage) => {
				set((state) => {
					let currentConversations = [...(state.conversations || [])];
					let activeId = state.activeConversationId;

					if (currentConversations.length === 0) {
						const initial = createInitialConversationThread();
						currentConversations = [initial];
						activeId = initial.id;
					} else if (
						!activeId ||
						!currentConversations.some((c) => c.id === activeId)
					) {
						activeId = currentConversations[0].id;
					}

					const convIndex = currentConversations.findIndex(
						(c) => c.id === activeId,
					);
					if (convIndex === -1) return state;

					const conv = currentConversations[convIndex];
					let nextTitle = conv.title;

					if (
						message.role === "user" &&
						(conv.messages.length <= 1 || conv.title === "Nueva conversación")
					) {
						const textClean = message.text.trim();
						if (textClean) {
							const words = textClean.split(/\s+/).slice(0, 6).join(" ");
							nextTitle =
								words.length > 36 ? `${words.substring(0, 36)}...` : words;
						}
					}

					const updatedConv: ConversationThread = {
						...conv,
						title: nextTitle,
						updatedAt: new Date().toISOString(),
						messages: [...conv.messages, message],
					};

					currentConversations[convIndex] = updatedConv;

					return {
						conversations: currentConversations,
						activeConversationId: activeId,
					};
				});
			},
			updateActiveConversationMessage: (
				messageId: string,
				updates: Partial<ChatMessage>,
			) => {
				set((state) => {
					const activeId =
						state.activeConversationId || state.conversations[0]?.id;
					if (!activeId) return state;

					const convIndex = state.conversations.findIndex(
						(c) => c.id === activeId,
					);
					if (convIndex === -1) return state;

					const conv = state.conversations[convIndex];
					const updatedMessages = conv.messages.map((m) =>
						m.id === messageId ? { ...m, ...updates } : m,
					);

					const updatedConversations = [...state.conversations];
					updatedConversations[convIndex] = {
						...conv,
						messages: updatedMessages,
						updatedAt: new Date().toISOString(),
					};

					return {
						conversations: updatedConversations,
					};
				});
			},
			clearActiveConversation: () => {
				set((state) => {
					const activeId =
						state.activeConversationId || state.conversations[0]?.id;
					if (!activeId) return state;

					const convIndex = state.conversations.findIndex(
						(c) => c.id === activeId,
					);
					if (convIndex === -1) return state;

					const conv = state.conversations[convIndex];
					const initialWelcome: ChatMessage = {
						id: "welcome",
						role: "assistant",
						text: "¡Hola! Soy Plottio Asistente, tu copiloto operacional con Agentic RAG. Cuento con herramientas de negocio para consultar y gestionar órdenes de trabajo, inventario de vinilos, clientes, cotizaciones y vehículos de flota.",
						timestamp: "Ahora",
					};

					const updatedConversations = [...state.conversations];
					updatedConversations[convIndex] = {
						...conv,
						title: "Nueva conversación",
						updatedAt: new Date().toISOString(),
						messages: [initialWelcome],
					};

					return {
						conversations: updatedConversations,
					};
				});
			},

			// 7. Webhooks
			webhooks: [
				{
					id: "wh-1",
					name: "Sincronizador CRM Hubspot",
					url: "https://api.hubapi.com/webhooks/v1/leads/plottio",
					secret: "",
					events: ["cliente.nuevo", "cotizacion.aprobada"],
					active: false,
					createdAt: "2026-05-12",
				},
				{
					id: "wh-2",
					name: "Alerta Slack Taller",
					url: "https://hooks.slack.com/services/T00/B00/X00",
					secret: "",
					events: ["orden.creada", "orden.terminada"],
					active: false,
					createdAt: "2026-05-20",
				},
			],
			inboundEndpoint: "https://plottio.vercel.app/api/webhooks",
			inboundSecret: getEnv("VITE_INBOUND_SECRET"),
			inboundLogs: [],
			addWebhook: (name, url, events) =>
				set((state) => ({
					webhooks: [
						...state.webhooks,
						{
							id: `wh-${Date.now()}`,
							name,
							url,
							secret: `sec_${Math.random().toString(36).substring(2, 12)}`,
							events,
							active: true,
							createdAt: new Date().toISOString().split("T")[0],
						},
					],
				})),
			toggleWebhook: (id) =>
				set((state) => ({
					webhooks: state.webhooks.map((w) =>
						w.id === id ? { ...w, active: !w.active } : w,
					),
				})),
			deleteWebhook: (id) =>
				set((state) => ({
					webhooks: state.webhooks.filter((w) => w.id !== id),
				})),
			regenerateInboundSecret: () =>
				set(() => ({
					inboundSecret: `whsec_${Array.from({ length: 16 }, () =>
						Math.floor(Math.random() * 16).toString(16),
					).join("")}`,
				})),
			clearInboundLogs: () => set(() => ({ inboundLogs: [] })),
			simulateInboundLead: () => {},
		}),
		{
			name: "plottio_integrations_store_v1",
			onRehydrateStorage: () => (state) => {
				if (!state) return;
				if (
					state.whatsapp?.serverUrl?.includes("onrender.com") ||
					state.whatsapp?.serverUrl?.includes("evolution") ||
					state.whatsapp?.serverUrl?.includes("acadia.simcodec.workers.dev")
				) {
					state.whatsapp.serverUrl =
						"https://plottio.vercel.app/api/webhook/wha";
				}
				if (
					state.whatsapp?.apiUrl?.includes("onrender.com") ||
					state.whatsapp?.apiUrl?.includes("evolution") ||
					state.whatsapp?.apiUrl?.includes("acadia.simcodec.workers.dev")
				) {
					state.whatsapp.apiUrl = "https://plottio.vercel.app/api/webhook/wha";
				}
				if (
					state.inboundEndpoint?.includes("acadia.simcodec.workers.dev") ||
					state.inboundEndpoint?.includes("plottio.app")
				) {
					state.inboundEndpoint = "https://plottio.vercel.app/api/webhooks";
				}
				// Migración de modelos Gemini deprecados
				if (state.agent?.model) {
					if (
						state.agent.model.includes("1.5-flash") ||
						state.agent.model === "gemini-2.0-flash" ||
						state.agent.model === "gemini-2.5-flash"
					) {
						state.agent.model = "gemini-3.8-flash";
					} else if (
						state.agent.model.includes("1.5-pro") ||
						state.agent.model.includes("1.5")
					) {
						state.agent.model = "gemini-pro-latest";
					}
				}
				if (state.rag?.model) {
					if (
						state.rag.model.includes("1.5-flash") ||
						state.rag.model === "gemini-2.0-flash" ||
						state.rag.model === "gemini-2.5-flash"
					) {
						state.rag.model = "gemini-3.8-flash";
					} else if (
						state.rag.model.includes("1.5-pro") ||
						state.rag.model.includes("1.5")
					) {
						state.rag.model = "gemini-pro-latest";
					}
				}
				if (state.ai?.activeModel) {
					if (
						state.ai.activeModel === "Gemini 2.0 Flash" ||
						state.ai.activeModel === "Gemini 1.5 Flash" ||
						state.ai.activeModel === "Gemini 2.5 Flash" ||
						state.ai.activeModel === "Gemini 3.8 Flash"
					) {
						state.ai.activeModel =
							"Gemini 3.8 Flash (Recomendado · Rápido y Económico)";
					} else if (
						state.ai.activeModel === "Gemini 1.5 Pro" ||
						state.ai.activeModel === "Gemini 2.5 Pro"
					) {
						state.ai.activeModel = "Gemini Pro Latest";
					}
				}
				// Respaldo Multi-Proveedor (Fallback Chaining)
				if (state.ai) {
					if (
						!state.ai.backupTargets ||
						!Array.isArray(state.ai.backupTargets)
					) {
						state.ai.backupTargets = [];
					}
					if (state.ai.backupProvider && state.ai.backupTargets.length === 0) {
						state.ai.backupTargets = [
							{
								provider: state.ai.backupProvider,
								model:
									state.ai.backupModel ||
									AI_MODELS_BY_PROVIDER[state.ai.backupProvider]?.[0] ||
									"",
							},
						];
					} else if (state.ai.backupTargets.length > 0) {
						state.ai.backupProvider = state.ai.backupTargets[0].provider;
						state.ai.backupModel = state.ai.backupTargets[0].model;
					}
				}
				// Base de Conocimiento RAG Operacional
				if (state.rag) {
					if (
						!state.rag.indexedDocumentsCount ||
						state.rag.indexedDocumentsCount <= 0
					) {
						state.rag.indexedDocumentsCount = 524;
					}
				}
				// Historial de Conversaciones Persistente
				if (!state.conversations || state.conversations.length === 0) {
					const initialThread = createInitialConversationThread();
					state.conversations = [initialThread];
					state.activeConversationId = initialThread.id;
				} else if (
					!state.activeConversationId ||
					!state.conversations.some((c) => c.id === state.activeConversationId)
				) {
					state.activeConversationId = state.conversations[0].id;
				}
			},
		},
	),
);
