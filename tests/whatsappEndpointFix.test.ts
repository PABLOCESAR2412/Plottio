// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import whatsappHandler, {
	CORS_HEADERS as WHA_CORS,
	GET as whaGet,
	OPTIONS as whaOptions,
	POST as whaPost,
} from "../api/webhook/wha";
import generalWebhooksHandler, {
	CORS_HEADERS as GEN_CORS,
	OPTIONS as genOptions,
	POST as genPost,
} from "../api/webhooks";
import convexHttpRouter from "../convex/http";
import { WhatsAppConfigModal } from "../src/components/WhatsAppConfigModal";
import { useIntegrationsStore } from "../src/store/useIntegrationsStore";

describe("Tarea 31 (P0 - Fase 6): Endpoint Webhook WhatsApp en Vercel y Bloqueo Activo de Onrender", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		useIntegrationsStore.setState(useIntegrationsStore.getInitialState(), true);
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	// =========================================================================
	// 1. VERCEL SERVERLESS HANDLER: api/webhook/wha.ts
	// =========================================================================
	describe("1. Vercel Serverless Function: api/webhook/wha.ts", () => {
		it("exporta cabeceras CORS requeridas", () => {
			expect(WHA_CORS["Access-Control-Allow-Origin"]).toBe("*");
			expect(WHA_CORS["Access-Control-Allow-Methods"]).toContain("POST");
			expect(WHA_CORS["Access-Control-Allow-Methods"]).toContain("OPTIONS");
			expect(WHA_CORS["Access-Control-Allow-Headers"]).toContain(
				"x-webhook-secret",
			);
		});

		it("responde 204 No Content ante petición OPTIONS (Web API)", async () => {
			const req = new Request("https://plottio.vercel.app/api/webhook/wha", {
				method: "OPTIONS",
			});
			const res = (await whaOptions(req)) as Response;
			expect(res.status).toBe(204);
			expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
			expect(res.headers.get("Access-Control-Allow-Headers")).toContain(
				"x-webhook-secret",
			);
		});

		it("responde 200 OK ante petición GET con gateway oficial", async () => {
			const req = new Request("https://plottio.vercel.app/api/webhook/wha", {
				method: "GET",
			});
			const res = (await whaGet(req)) as Response;
			expect(res.status).toBe(200);
			const data = await res.json();
			expect(data.status).toBe("ok");
			expect(data.gateway).toBe("Plottio WhatsApp Gateway");
			expect(data.timestamp).toBeDefined();
		});

		it("responde 200 OK ante POST connection.test devolviendo evento y status ok", async () => {
			const payload = {
				event: "connection.test",
				instance: "plottio-central",
				timestamp: new Date().toISOString(),
			};
			const req = new Request("https://plottio.vercel.app/api/webhook/wha", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-webhook-secret": "test_secret_123",
				},
				body: JSON.stringify(payload),
			});

			const res = (await whaPost(req)) as Response;
			expect(res.status).toBe(200);
			const data = await res.json();
			expect(data.status).toBe("ok");
			expect(data.gateway).toBe("Plottio WhatsApp Gateway");
			expect(data.event).toBe("connection.test");
			expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
		});

		it("soporta el runtime Node.js Serverless tradicional (req, res)", async () => {
			const headersSet: Record<string, string> = {};
			let statusCode = 0;
			let jsonBody: any = null;

			const mockReq = {
				method: "POST",
				body: { event: "connection.test", instance: "node-test" },
			};
			const mockRes = {
				setHeader: (k: string, v: string) => {
					headersSet[k] = v;
				},
				status: (code: number) => {
					statusCode = code;
					return {
						json: (b: any) => {
							jsonBody = b;
						},
						end: () => {},
					};
				},
			};

			await whatsappHandler(mockReq, mockRes);
			expect(statusCode).toBe(200);
			expect(headersSet["Access-Control-Allow-Origin"]).toBe("*");
			expect(jsonBody.status).toBe("ok");
			expect(jsonBody.gateway).toBe("Plottio WhatsApp Gateway");
			expect(jsonBody.event).toBe("connection.test");
		});
	});

	// =========================================================================
	// 2. VERCEL SERVERLESS HANDLER: api/webhooks.ts
	// =========================================================================
	describe("2. Vercel Serverless Function: api/webhooks.ts (General Webhooks)", () => {
		it("exporta cabeceras CORS requeridas", () => {
			expect(GEN_CORS["Access-Control-Allow-Origin"]).toBe("*");
			expect(GEN_CORS["Access-Control-Allow-Methods"]).toContain("POST");
		});

		it("responde 204 No Content ante petición OPTIONS", async () => {
			const req = new Request("https://plottio.vercel.app/api/webhooks", {
				method: "OPTIONS",
			});
			const res = (await genOptions(req)) as Response;
			expect(res.status).toBe(204);
			expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
		});

		it("responde 200 OK con received: true ante peticiones POST de CRM/leads", async () => {
			const req = new Request("https://plottio.vercel.app/api/webhooks", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ lead: "John Doe", phone: "+593999999999" }),
			});
			const res = (await genPost(req)) as Response;
			expect(res.status).toBe(200);
			const data = await res.json();
			expect(data.status).toBe("ok");
			expect(data.gateway).toBe("Plottio General Webhooks");
			expect(data.received).toBe(true);
		});

		it("soporta el runtime Node.js Serverless tradicional (req, res)", async () => {
			let statusCode = 0;
			let jsonBody: any = null;

			const mockReq = {
				method: "GET",
			};
			const mockRes = {
				setHeader: () => {},
				status: (code: number) => {
					statusCode = code;
					return {
						json: (b: any) => {
							jsonBody = b;
						},
						end: () => {},
					};
				},
			};

			await generalWebhooksHandler(mockReq, mockRes);
			expect(statusCode).toBe(200);
			expect(jsonBody.gateway).toBe("Plottio General Webhooks");
		});
	});

	// =========================================================================
	// 3. CONVEX HTTP ROUTER: convex/http.ts
	// =========================================================================
	describe("3. Convex HTTP Router (convex/http.ts)", () => {
		it("el router HTTP de Convex está instanciado y exportado", () => {
			expect(convexHttpRouter).toBeDefined();
			// Convex httpRouter expone sus métodos y especificaciones de rutas
			expect(typeof convexHttpRouter.route).toBe("function");
		});
	});

	// =========================================================================
	// 4. BLOQUEO PREVENTIVO DE ONRENDER EN WhatsAppConfigModal
	// =========================================================================
	describe("4. Intercepción Preventiva de Onrender en WhatsAppConfigModal", () => {
		it("bloquea preventivamente URL con onrender.com SIN ejecutar fetch y sin error 404 en consola", async () => {
			const fetchMock = vi.fn();
			globalThis.fetch = fetchMock;

			// Abrir el modal en modo edición
			useIntegrationsStore.setState({
				whatsapp: {
					...useIntegrationsStore.getState().whatsapp,
					instanceName: "",
					serverUrl: "",
					apiKey: "",
					status: "disconnected",
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

			// Usuario ingresa la URL residual u obsoleta de onrender
			fireEvent.change(instanceInput, { target: { value: "plottio-central" } });
			fireEvent.change(urlInput, {
				target: { value: "https://evolution-api-0q39.onrender.com/" },
			});
			fireEvent.change(keyInput, { target: { value: "my-secret-key" } });

			// Click en Probar Conexión
			fireEvent.click(testBtn);

			await waitFor(() => {
				expect(screen.getByText(/Prueba de Conexión Fallida/i)).toBeDefined();
				expect(
					screen.getByText(
						/La URL ingresada pertenece a una instancia descontinuada \(Onrender\)\. La pasarela oficial del sistema es https:\/\/plottio\.vercel\.app\/api\/webhook\/wha/i,
					),
				).toBeDefined();
			});

			// CRÍTICO: NO debe haberse disparado ninguna petición de red fetch
			expect(fetchMock).not.toHaveBeenCalled();

			// El estado debe permanecer desconectado
			expect(useIntegrationsStore.getState().whatsapp.status).toBe(
				"disconnected",
			);
		});

		it("bloquea preventivamente URLs que contengan 'evolution' sin llamar a fetch", async () => {
			const fetchMock = vi.fn();
			globalThis.fetch = fetchMock;

			useIntegrationsStore.setState({
				whatsapp: {
					...useIntegrationsStore.getState().whatsapp,
					instanceName: "",
					serverUrl: "",
					apiKey: "",
					status: "disconnected",
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

			fireEvent.change(instanceInput, { target: { value: "mi-instancia" } });
			fireEvent.change(urlInput, {
				target: { value: "https://evolution-api-host.com/webhook" },
			});
			fireEvent.change(keyInput, { target: { value: "key_123" } });

			fireEvent.click(testBtn);

			await waitFor(() => {
				expect(
					screen.getByText(
						/La URL ingresada pertenece a una instancia descontinuada \(Onrender\)/i,
					),
				).toBeDefined();
			});

			expect(fetchMock).not.toHaveBeenCalled();
		});

		it("prueba de conexión contra https://plottio.vercel.app/api/webhook/wha resulta exitosa al responder 200 OK", async () => {
			const fetchMock = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({
					status: "ok",
					gateway: "Plottio WhatsApp Gateway",
					event: "connection.test",
					timestamp: new Date().toISOString(),
				}),
			});
			globalThis.fetch = fetchMock;

			useIntegrationsStore.setState({
				whatsapp: {
					...useIntegrationsStore.getState().whatsapp,
					instanceName: "",
					serverUrl: "",
					apiKey: "",
					status: "disconnected",
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

			fireEvent.change(instanceInput, { target: { value: "taller-central" } });
			fireEvent.change(urlInput, {
				target: { value: "https://plottio.vercel.app/api/webhook/wha" },
			});
			fireEvent.change(keyInput, { target: { value: "plottio_secret_token" } });

			fireEvent.click(testBtn);

			await waitFor(() => {
				expect(screen.getByText(/Prueba de Conexión Exitosa/i)).toBeDefined();
				expect(
					screen.getByText(
						/Conexión exitosa con la pasarela de WhatsApp\. HTTP 200 OK/i,
					),
				).toBeDefined();
			});

			// SÍ debió llamar a fetch exactamente con la URL canónica y los headers correspondientes
			expect(fetchMock).toHaveBeenCalledTimes(1);
			expect(fetchMock).toHaveBeenCalledWith(
				"https://plottio.vercel.app/api/webhook/wha",
				expect.objectContaining({
					method: "POST",
					headers: expect.objectContaining({
						"x-webhook-secret": "plottio_secret_token",
						"Content-Type": "application/json",
					}),
				}),
			);

			// Status en el store pasa a 'connected'
			expect(useIntegrationsStore.getState().whatsapp.status).toBe("connected");
		});
	});
});
