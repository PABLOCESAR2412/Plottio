import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WhatsAppMessage {
	id: string;
	sender: "client" | "agent";
	text: string;
	timestamp: string;
	status: "sent" | "delivered" | "read";
}

export interface SocialPost {
	id: string;
	content: string;
	channels: ("tiktok" | "instagram" | "linkedin" | "youtube")[];
	mediaUrl?: string;
	scheduledFor?: string;
	status: "published" | "scheduled" | "draft";
	tags: string[];
	createdAt: string;
}

export interface EmailMessage {
	id: string;
	subject: string;
	from: string;
	to: string;
	date: string;
	body: string;
	hasAttachment?: boolean;
	attachmentName?: string;
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
}

interface IntegrationsState {
	// 1. WhatsApp Evolution API
	whatsapp: {
		instanceName: string;
		apiUrl: string;
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

	// 3. Buffer GraphQL / APEX Sync
	buffer: {
		connected: boolean;
		channels: {
			id: "tiktok" | "instagram" | "linkedin" | "youtube";
			name: string;
			handle: string;
			active: boolean;
		}[];
		posts: SocialPost[];
	};
	toggleSocialChannel: (
		id: "tiktok" | "instagram" | "linkedin" | "youtube",
	) => void;
	addSocialPost: (post: Omit<SocialPost, "id" | "createdAt">) => void;
	deleteSocialPost: (id: string) => void;

	// 4. Correo Corporativo
	email: {
		smtpHost: string;
		smtpPort: number;
		smtpUser: string;
		smtpPass: string;
		senderName: string;
		provider: "smtp" | "gmail" | "outlook";
		status: "connected" | "disconnected";
		threads: Record<string, EmailMessage[]>; // keyed by client email
	};
	updateEmailConfig: (config: Partial<IntegrationsState["email"]>) => void;
	sendEmailMessage: (
		to: string,
		subject: string,
		body: string,
		attachmentName?: string,
	) => void;

	// 5. Modelos de IA & FinOps
	ai: {
		provider: "gemini" | "openai" | "custom";
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
		tokenUsageHourly: { hour: string; tokens: number; costUSD: number }[];
	};
	updateAiConfig: (config: Partial<IntegrationsState["ai"]>) => void;
	recordAiUsage: (tokens: number, costUSD: number) => void;

	// 6. APEX Brain (RAG / pgvector)
	rag: {
		similarityThreshold: number;
		maxContextChunks: number;
		temperature: number;
		indexedDocumentsCount: number;
		lastCalibrationDate: string;
	};
	updateRagConfig: (config: Partial<IntegrationsState["rag"]>) => void;

	// 7. Central Webhooks Hub
	webhooks: WebhookConfig[];
	inboundLogs: InboundWebhookLog[];
	addWebhook: (name: string, url: string, events: string[]) => void;
	toggleWebhook: (id: string) => void;
	deleteWebhook: (id: string) => void;
	simulateInboundLead: (lead: {
		nombre: string;
		telefono: string;
		servicio: string;
		vehiculo: string;
	}) => void;
}

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
				apiUrl: "https://api.evolution.plottio.com",
				apiKey: "evo_live_8f3a92b97c414d5e89a",
				status: "connected",
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
				set((state) => ({
					whatsapp: { ...state.whatsapp, ...config },
				})),
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
				botToken: "7193849102:AAE9xYp4mQzKlRt-91Xj8b2Qw",
				botUsername: "@PlottioOpsBot",
				chatId: "-10023489102",
				status: "connected",
				webhookUrl: "https://plottio.com/api/telegram-webhook",
				enableChatOps: true,
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

			// 3. Buffer
			buffer: {
				connected: true,
				channels: [
					{
						id: "instagram",
						name: "Instagram",
						handle: "@plottio.wrapping",
						active: true,
					},
					{
						id: "tiktok",
						name: "TikTok",
						handle: "@plottio_oficial",
						active: true,
					},
					{
						id: "linkedin",
						name: "LinkedIn",
						handle: "Plottio Vehicle Branding",
						active: false,
					},
					{
						id: "youtube",
						name: "YouTube",
						handle: "Plottio TV",
						active: true,
					},
				],
				posts: [
					{
						id: "post-1",
						content:
							"Transformación total de este Chevrolet D-Max con vinilo mate satinado y corte computarizado. ¡Listo para rodar! 🔥🚗 #wrapping #carwrap #tuning #plottio",
						channels: ["instagram", "tiktok"],
						status: "published",
						tags: ["#wrapping", "#chevrolet", "#dmax"],
						createdAt: "Ayer 18:30",
					},
					{
						id: "post-2",
						content:
							"Rotulación de flota comercial de 5 furgonetas Hyundai H1 entregadas en tiempo récord. Calidad que resiste todo clima.",
						channels: ["linkedin", "instagram"],
						status: "scheduled",
						scheduledFor: "Mañana 10:00 AM",
						tags: ["#flotas", "#branding", "#empresas"],
						createdAt: "Hoy 09:00",
					},
				],
			},
			toggleSocialChannel: (id) =>
				set((state) => ({
					buffer: {
						...state.buffer,
						channels: state.buffer.channels.map((c) =>
							c.id === id ? { ...c, active: !c.active } : c,
						),
					},
				})),
			addSocialPost: (post) =>
				set((state) => ({
					buffer: {
						...state.buffer,
						posts: [
							{
								...post,
								id: `post-${Date.now()}`,
								createdAt: "Justo ahora",
							},
							...state.buffer.posts,
						],
					},
				})),
			deleteSocialPost: (id) =>
				set((state) => ({
					buffer: {
						...state.buffer,
						posts: state.buffer.posts.filter((p) => p.id !== id),
					},
				})),

			// 4. Correo Corporativo
			email: {
				smtpHost: "smtp.office365.com",
				smtpPort: 587,
				smtpUser: "contacto@plottio.com",
				smtpPass: "••••••••••••",
				senderName: "Plottio Taller Central",
				provider: "outlook",
				status: "connected",
				threads: {
					default: [
						{
							id: "mail-1",
							subject: "Cotización de Servicio de Rotulado #COT-9182",
							from: "contacto@plottio.com",
							to: "cliente@empresa.com",
							date: "08 Jun 2026, 11:20",
							body: "Estimado cliente, adjuntamos la propuesta técnica y económica para la rotulación vehicular solicitada.",
							hasAttachment: true,
							attachmentName: "Presupuesto_PLOTTIO_9182.pdf",
						},
					],
				},
			},
			updateEmailConfig: (config) =>
				set((state) => ({
					email: { ...state.email, ...config },
				})),
			sendEmailMessage: (to, subject, body, attachmentName) =>
				set((state) => {
					const existing = state.email.threads[to] ?? [];
					const newMail: EmailMessage = {
						id: `mail-${Date.now()}`,
						subject,
						from: state.email.smtpUser,
						to,
						date: new Date().toLocaleString([], {
							dateStyle: "medium",
							timeStyle: "short",
						}),
						body,
						hasAttachment: Boolean(attachmentName),
						attachmentName,
					};
					return {
						email: {
							...state.email,
							threads: {
								...state.email.threads,
								[to]: [...existing, newMail],
							},
						},
					};
				}),

			// 5. IA & FinOps
			ai: {
				provider: "gemini",
				geminiApiKey: "AIzaSyD-98124_plottio_gemini_pro_flash",
				openaiApiKey: "sk-proj-491829...",
				customEndpoint: "https://ai.internal.plottio.com/v1",
				activeModel: "gemini-1.5-flash",
				monthlyBudgetUSD: 150.0,
				currentSpendUSD: 42.85,
				tokensToday: 218500,
				totalRequests: 1420,
				tps: 84.6,
				latencyMs: 380,
				tokenUsageHourly: initialHourlyUsage,
			},
			updateAiConfig: (config) =>
				set((state) => ({
					ai: { ...state.ai, ...config },
				})),
			recordAiUsage: (tokens, costUSD) =>
				set((state) => ({
					ai: {
						...state.ai,
						tokensToday: state.ai.tokensToday + tokens,
						currentSpendUSD: +(state.ai.currentSpendUSD + costUSD).toFixed(4),
						totalRequests: state.ai.totalRequests + 1,
					},
				})),

			// 6. APEX Brain
			rag: {
				similarityThreshold: 0.78,
				maxContextChunks: 6,
				temperature: 0.2,
				indexedDocumentsCount: 489,
				lastCalibrationDate: "Hoy, 04:00 AM",
			},
			updateRagConfig: (config) =>
				set((state) => ({
					rag: { ...state.rag, ...config },
				})),

			// 7. Webhooks
			webhooks: [
				{
					id: "wh-1",
					name: "Sincronizador CRM Hubspot",
					url: "https://api.hubapi.com/webhooks/v1/leads/plottio",
					secret: "sec_live_9a8b7c6d5e",
					events: ["cliente.nuevo", "cotizacion.aprobada"],
					active: true,
					createdAt: "2026-05-12",
				},
				{
					id: "wh-2",
					name: "Alerta Slack Taller",
					url: "https://hooks.slack.com/services/T00/B00/X00",
					secret: "sec_slack_12345",
					events: ["orden.creada", "orden.terminada"],
					active: true,
					createdAt: "2026-05-20",
				},
			],
			inboundLogs: [
				{
					id: "log-1",
					event: "lead.facebook_ads",
					payload: JSON.stringify({
						nombre: "Mario Andrade",
						telefono: "0991234567",
						interes: "Rotulado Taxi",
					}),
					receivedAt: "10:14 AM",
					status: "success",
					responseCode: 200,
				},
				{
					id: "log-2",
					event: "landing.cotizador_web",
					payload: JSON.stringify({
						nombre: "Logística Express",
						ruc: "1792983192001",
						flota: 4,
					}),
					receivedAt: "09:45 AM",
					status: "success",
					responseCode: 200,
				},
			],
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
			simulateInboundLead: (lead) =>
				set((state) => ({
					inboundLogs: [
						{
							id: `log-${Date.now()}`,
							event: "lead.simulado_test",
							payload: JSON.stringify(lead, null, 2),
							receivedAt: new Date().toLocaleTimeString([], {
								hour: "2-digit",
								minute: "2-digit",
								second: "2-digit",
							}),
							status: "success",
							responseCode: 200,
						},
						...state.inboundLogs,
					],
				})),
		}),
		{
			name: "plottio_integrations_store_v1",
		},
	),
);
