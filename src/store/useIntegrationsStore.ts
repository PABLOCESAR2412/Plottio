import { create } from "zustand";
import { persist } from "zustand/middleware";

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

export const AI_MODELS_BY_PROVIDER: Record<AiProvider, string[]> = {
	google: ["Gemini 2.0 Flash", "Gemini 1.5 Pro", "Gemini 1.5 Flash"],
	groq: ["Llama 3.3 70B Versatile", "Llama 3.1 8B Instant", "Mixtral 8x7B"],
	opencode_zen: ["DeepSeek R1", "DeepSeek V3", "Qwen 2.5 Coder"],
	nvidia: ["Nemotron 70B", "Llama 3.1 Nemotron 70B Ultra", "Mistral NeMo"],
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
	recordAiUsage: (tokens: number, costUSD: number) => void;
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

const initialHourlyUsage = [
	{ hour: "08:00", tokens: 12400, costUSD: 0.024 },
	{ hour: "10:00", tokens: 28900, costUSD: 0.058 },
	{ hour: "12:00", tokens: 45200, costUSD: 0.091 },
	{ hour: "14:00", tokens: 38100, costUSD: 0.076 },
	{ hour: "16:00", tokens: 62000, costUSD: 0.124 },
	{ hour: "18:00", tokens: 31000, costUSD: 0.062 },
];

export const useIntegrationsStore = create<IntegrationsState>()(
	persist(
		(set, get) => ({
			// 1. WhatsApp
			whatsapp: {
				instanceName: "plottio-central",
				serverUrl: "https://acadia.simcodec.workers.dev/api/webhook/wha",
				apiUrl: "https://acadia.simcodec.workers.dev/api/webhook/wha",
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
						whatsapp: { ...state.whatsapp, status: "connected" },
					}));
				}, 1200);
			},
			disconnectWhatsApp: () =>
				set((state) => ({
					whatsapp: { ...state.whatsapp, status: "disconnected" },
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
				activeModel: "Gemini 2.0 Flash",
				monthlyBudgetUSD: 150.0,
				currentSpendUSD: 42.85,
				tokensToday: 218500,
				totalRequests: 1420,
				tps: 84.6,
				latencyMs: 380,
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
					return { ai: next };
				}),
			recordAiUsage: (tokens, costUSD) =>
				set((state) => ({
					ai: {
						...state.ai,
						tokensToday: state.ai.tokensToday + tokens,
						currentSpendUSD: +(state.ai.currentSpendUSD + costUSD).toFixed(4),
						totalRequests: state.ai.totalRequests + 1,
					},
				})),
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
				model: "gemini-1.5-pro",
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
				model: "gemini-1.5-pro",
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
			inboundEndpoint: "https://acadia.simcodec.workers.dev/api/webhook/wha",
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
		},
	),
);
