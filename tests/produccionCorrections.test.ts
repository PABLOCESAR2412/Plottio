// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlottioAsistenteModal } from "../src/components/PlottioAsistenteModal";
import { WebhookManagerModal } from "../src/components/WebhookManagerModal";
import { WhatsAppConfigModal } from "../src/components/WhatsAppConfigModal";
import {
	ASISTENTE_SEGURIDAD_RECHAZO,
	executeLiveBusinessAgent,
	isRestrictedAction,
} from "../src/services/plottioAgent";
import { useIntegrationsStore } from "../src/store/useIntegrationsStore";

vi.mock("convex/react", () => ({
	useQuery: vi.fn().mockReturnValue([]),
	useMutation: vi.fn().mockReturnValue(vi.fn()),
	useAction: vi.fn().mockReturnValue(vi.fn()),
}));

describe("Tarea 27 (P1 - Fase 5): Webhooks de Dominio Plottio, Sanitización WhatsApp y Activación Real de Plottio Asistente", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		useIntegrationsStore.setState(useIntegrationsStore.getInitialState(), true);
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	// =========================================================================
	// 1. ENDPOINTS OFICIALES DE DOMINIO PLOTTIO
	// =========================================================================
	describe("1. Endpoints Oficiales de Dominio Plottio", () => {
		it("el endpoint oficial de inbound webhooks es https://plottio.vercel.app/api/webhooks", () => {
			const state = useIntegrationsStore.getState();
			expect(state.inboundEndpoint).toBe(
				"https://plottio.vercel.app/api/webhooks",
			);
		});

		it("el endpoint oficial de WhatsApp es https://plottio.vercel.app/api/webhook/wha", () => {
			const state = useIntegrationsStore.getState();
			expect(state.whatsapp.serverUrl).toBe(
				"https://plottio.vercel.app/api/webhook/wha",
			);
			expect(state.whatsapp.apiUrl).toBe(
				"https://plottio.vercel.app/api/webhook/wha",
			);
		});

		it("WebhookManagerModal muestra la URL canónica de Plottio en el campo Inbound", () => {
			render(
				React.createElement(WebhookManagerModal, {
					isOpen: true,
					onClose: vi.fn(),
				}),
			);

			const urlInput = screen.getByLabelText(
				/URL Canónica del Webhook de Plottio/i,
			) as HTMLInputElement;
			expect(urlInput.value).toBe("https://plottio.vercel.app/api/webhooks");
		});
	});

	// =========================================================================
	// 2. SANITIZACIÓN DE URLS OBSOLETAS Y FIX 404
	// =========================================================================
	describe("2. Sanitización de URLs Obsoletas y Manejo de HTTP 404", () => {
		it("sanitiza URLs obsoletas de WhatsApp en rehidratación de persistencia", () => {
			const persistOptions = (
				useIntegrationsStore as unknown as {
					persist: {
						getOptions: () => {
							onRehydrateStorage?: () => (state: Record<string, unknown>) => void;
						};
					};
				}
			).persist?.getOptions();

			expect(persistOptions?.onRehydrateStorage).toBeDefined();

			if (persistOptions?.onRehydrateStorage) {
				const onRehydrate = persistOptions.onRehydrateStorage();
				const dummyState = {
					whatsapp: {
						serverUrl: "https://evolution-api-0q39.onrender.com/webhook",
						apiUrl: "https://acadia.simcodec.workers.dev/api/webhook/wha",
					},
					inboundEndpoint: "https://plottio.app/api/webhooks",
				};

				onRehydrate(dummyState);

				expect(dummyState.whatsapp.serverUrl).toBe(
					"https://plottio.vercel.app/api/webhook/wha",
				);
				expect(dummyState.whatsapp.apiUrl).toBe(
					"https://plottio.vercel.app/api/webhook/wha",
				);
				expect(dummyState.inboundEndpoint).toBe(
					"https://plottio.vercel.app/api/webhooks",
				);
			}
		});

		it("WhatsAppConfigModal purga automáticamente URLs con onrender.com o evolution", () => {
			useIntegrationsStore.setState({
				whatsapp: {
					...useIntegrationsStore.getState().whatsapp,
					serverUrl: "https://evolution-gateway.onrender.com/wha",
					apiUrl: "https://evolution-gateway.onrender.com/wha",
				},
			});

			render(
				React.createElement(WhatsAppConfigModal, {
					isOpen: true,
					onClose: vi.fn(),
				}),
			);

			// Pulsar botón de modificar credenciales si está en vista QR
			const editBtn = screen.queryByRole("button", {
				name: /Modificar Configuración|Editar Credenciales/i,
			});
			if (editBtn) {
				fireEvent.click(editBtn);
			}

			const serverUrlInput = screen.getByLabelText(
				/URL del Servidor \/ Webhook/i,
			) as HTMLInputElement;

			// Debe estar sanitizado al endpoint oficial canónico
			expect(serverUrlInput.value).toBe(
				"https://plottio.vercel.app/api/webhook/wha",
			);
			expect(serverUrlInput.value).not.toContain("onrender.com");
			expect(serverUrlInput.value).not.toContain("evolution");
		});

		it("handleTestConnection maneja HTTP 404 como fallo explicativo y no como éxito", async () => {
			// Mock global de fetch para retornar 404
			const fetchMock = vi.fn().mockResolvedValue({
				ok: false,
				status: 404,
				json: async () => ({ error: "Not Found" }),
			});
			globalThis.fetch = fetchMock;

			// Abrir en modo edición
			useIntegrationsStore.setState({
				whatsapp: {
					...useIntegrationsStore.getState().whatsapp,
					instanceName: "",
					serverUrl: "",
					apiKey: "",
				},
			});

			render(
				React.createElement(WhatsAppConfigModal, {
					isOpen: true,
					onClose: vi.fn(),
				}),
			);

			const instanceInput = screen.getByLabelText(/Nombre de la Instancia/i);
			const urlInput = screen.getByLabelText(/URL del Servidor \/ Webhook/i);
			const keyInput = screen.getByLabelText(/API Key/i);
			const testBtn = screen.getByRole("button", { name: /Probar Conexión/i });

			fireEvent.change(instanceInput, { target: { value: "test-instance" } });
			fireEvent.change(urlInput, {
				target: { value: "https://plottio.vercel.app/api/webhook/wha" },
			});
			fireEvent.change(keyInput, { target: { value: "sec_test_secret" } });

			fireEvent.click(testBtn);

			await waitFor(() => {
				expect(screen.getByText(/Prueba de Conexión Fallida/i)).toBeDefined();
				expect(
					screen.getByText(
						/Error HTTP 404: Endpoint no encontrado en el servidor/i,
					),
				).toBeDefined();
			});

			// No debe marcar el status como "connected"
			expect(useIntegrationsStore.getState().whatsapp.status).toBe(
				"disconnected",
			);
		});
	});

	// =========================================================================
	// 3. PLOTTIO ASISTENTE EN MODO REAL CON API KEY
	// =========================================================================
	describe("3. Plottio Asistente: Detección Reactiva de API Key y Modo Real", () => {
		it("muestra 'Modo Demostración / Sandbox' y banner superior cuando no hay ninguna API Key", () => {
			useIntegrationsStore.setState({
				ai: {
					...useIntegrationsStore.getState().ai,
					googleApiKey: "",
					groqApiKey: "",
					nvidiaApiKey: "",
					opencodeZenApiKey: "",
					geminiApiKey: "",
				},
			});

			render(
				React.createElement(PlottioAsistenteModal, {
					isOpen: true,
					onClose: vi.fn(),
				}),
			);

			// Banner superior debe estar visible
			expect(
				screen.getByText(/Modo Demostración \/ Sandbox \(IA Simulada\)/i),
			).toBeDefined();
			// Badge de sandbox en header
			expect(
				screen.getByText("Modo Demostración / Sandbox"),
			).toBeDefined();
			// No debe mostrar "IA Conectada"
			expect(screen.queryByText(/IA Conectada/i)).toBeNull();
		});

		it("oculta el banner de Sandbox y muestra badge 'IA Conectada' cuando hay API Key de Google", () => {
			useIntegrationsStore.setState({
				ai: {
					...useIntegrationsStore.getState().ai,
					provider: "google",
					googleApiKey: "AIzaSy_test_google_key_real_2026",
				},
			});

			render(
				React.createElement(PlottioAsistenteModal, {
					isOpen: true,
					onClose: vi.fn(),
				}),
			);

			// El banner de sandbox debe estar OCULTO completamente
			expect(
				screen.queryByText(/Modo Demostración \/ Sandbox \(IA Simulada\)/i),
			).toBeNull();

			// Debe mostrar el badge de IA Conectada
			expect(screen.getByText(/IA Conectada \(Google Gemini\)/i)).toBeDefined();
		});

		it("muestra el badge 'IA Conectada' para Groq cuando groqApiKey está presente", () => {
			useIntegrationsStore.setState({
				ai: {
					...useIntegrationsStore.getState().ai,
					provider: "groq",
					googleApiKey: "",
					geminiApiKey: "",
					groqApiKey: "gsk_test_groq_key_2026",
				},
			});

			render(
				React.createElement(PlottioAsistenteModal, {
					isOpen: true,
					onClose: vi.fn(),
				}),
			);

			expect(
				screen.queryByText(/Modo Demostración \/ Sandbox \(IA Simulada\)/i),
			).toBeNull();
			expect(screen.getByText(/IA Conectada \(Groq Cloud\)/i)).toBeDefined();
		});
	});

	// =========================================================================
	// 4. REMOCIÓN DE 'MODELO LLM ASIGNADO:' EN CONFIGURACIÓN
	// =========================================================================
	describe("4. Pestaña de Configuración del Asistente", () => {
		it("no contiene la etiqueta ni el select de 'Modelo LLM Asignado:'", () => {
			render(
				React.createElement(PlottioAsistenteModal, {
					isOpen: true,
					onClose: vi.fn(),
				}),
			);

			const configTab = screen.getByRole("button", { name: /Configuración/i });
			fireEvent.click(configTab);

			expect(screen.queryByLabelText(/Modelo LLM Asignado:/i)).toBeNull();
			expect(screen.queryByText(/Modelo LLM Asignado:/i)).toBeNull();
		});

		it("permite guardar Nombre del Asistente y Prompt del Sistema", async () => {
			render(
				React.createElement(PlottioAsistenteModal, {
					isOpen: true,
					onClose: vi.fn(),
				}),
			);

			const configTab = screen.getByRole("button", { name: /Configuración/i });
			fireEvent.click(configTab);

			const nameInput = screen.getByLabelText(/Nombre del Asistente:/i);
			const promptInput = screen.getByLabelText(
				/Prompt del Sistema \/ Instrucciones:/i,
			);
			const saveBtn = screen.getByRole("button", {
				name: /Guardar Configuración/i,
			});

			fireEvent.change(nameInput, {
				target: { value: "Copiloto Taller Centinela" },
			});
			fireEvent.change(promptInput, {
				target: { value: "Instrucciones de alta precisión técnica." },
			});

			fireEvent.click(saveBtn);

			await waitFor(() => {
				expect(screen.getByText(/¡Guardado!/i)).toBeDefined();
			});

			const updated = useIntegrationsStore.getState().agent;
			expect(updated.nombre).toBe("Copiloto Taller Centinela");
			expect(updated.systemPrompt).toBe("Instrucciones de alta precisión técnica.");
		});
	});

	// =========================================================================
	// 5. executeLiveBusinessAgent Y FALLBACK RESILIENTE
	// =========================================================================
	describe("5. executeLiveBusinessAgent y Fallback Resiliente", () => {
		it("rechaza de inmediato si la consulta viola guardrails de seguridad", async () => {
			const query = "Cambiar contraseñas y permisos de usuarios";
			expect(isRestrictedAction(query)).toBe(true);

			const result = await executeLiveBusinessAgent(query, {
				assistantName: "Plottio Asistente",
				apiKey: "test-api-key",
			});

			expect(result.allowed).toBe(false);
			expect(result.response).toBe(ASISTENTE_SEGURIDAD_RECHAZO);
			expect(result.toolsCalled).toEqual([]);
		});

		it("opera con fallback transparente si no hay API Key", async () => {
			const result = await executeLiveBusinessAgent(
				"Consultar orden Chevrolet D-Max",
				{
					assistantName: "Plottio Asistente",
					apiKey: "",
				},
			);

			expect(result.allowed).toBe(true);
			expect(result.toolsCalled.length).toBeGreaterThan(0);
			expect(result.citations.length).toBeGreaterThan(0);
			expect(result.response).not.toContain(
				"Basado en la ejecución de herramientas",
			);
		});

		it("retorna la respuesta de Google Gemini cuando la API responde con éxito", async () => {
			const fetchMock = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({
					candidates: [
						{
							content: {
								parts: [
									{
										text: "La orden Chevrolet D-Max está al 65% de avance en Bahía 2 con vinilo 3M preparado.",
									},
								],
							},
						},
					],
				}),
			});
			globalThis.fetch = fetchMock;

			const result = await executeLiveBusinessAgent(
				"Ver avance de Chevrolet D-Max",
				{
					assistantName: "Plottio Asistente",
					apiKey: "AIzaSy_valid_key",
					provider: "google",
				},
			);

			expect(result.allowed).toBe(true);
			expect(result.response).toBe(
				"La orden Chevrolet D-Max está al 65% de avance en Bahía 2 con vinilo 3M preparado.",
			);
			expect(result.toolsCalled.length).toBeGreaterThan(0);
			expect(result.citations.length).toBeGreaterThan(0);
		});

		it("retorna la respuesta de Groq cuando la API responde con éxito", async () => {
			const fetchMock = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({
					choices: [
						{
							message: {
								content:
									"Respuesta Groq: Bobinas 3M disponibles con 32 metros lineales en almacén.",
							},
						},
					],
				}),
			});
			globalThis.fetch = fetchMock;

			const result = await executeLiveBusinessAgent("Stock de vinilos 3M", {
				assistantName: "Plottio Asistente",
				apiKey: "gsk_valid_groq_key",
				provider: "groq",
			});

			expect(result.allowed).toBe(true);
			expect(result.response).toBe(
				"Respuesta Groq: Bobinas 3M disponibles con 32 metros lineales en almacén.",
			);
			expect(result.toolsCalled.some((t) => t.toolName === "consultar_inventario")).toBe(true);
		});

		it("hace fallback transparente sin romper ante error de red o timeout de la API", async () => {
			const fetchMock = vi.fn().mockRejectedValue(new Error("Network timeout or unreachable"));
			globalThis.fetch = fetchMock;

			const result = await executeLiveBusinessAgent("Consultar órdenes de trabajo", {
				assistantName: "Plottio Asistente",
				apiKey: "AIzaSy_some_key",
				provider: "google",
			});

			expect(result.allowed).toBe(true);
			expect(result.response).not.toContain(
				"Basado en la ejecución de herramientas",
			);
			expect(result.toolsCalled.length).toBeGreaterThan(0);
		});
	});
});
