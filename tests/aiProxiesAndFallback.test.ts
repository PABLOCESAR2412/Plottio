import { describe, it, expect, vi, beforeEach } from "vitest";
import opencodeHandler from "../api/opencode";
import groqHandler from "../api/groq";
import nvidiaHandler from "../api/nvidia";
import { executeLiveBusinessAgent } from "../src/services/plottioAgent";

describe("AI Proxies & Serverless Fallback Architecture", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	describe("1. api/opencode.ts (Proxy Serverless OpenCode Zen)", () => {
		it("responde 204 OK a peticiones OPTIONS con cabeceras CORS", async () => {
			const req = { method: "OPTIONS", headers: {} };
			const res = {
				setHeader: vi.fn(),
				status: vi.fn().mockReturnThis(),
				end: vi.fn(),
			};

			await opencodeHandler(req, res);

			expect(res.setHeader).toHaveBeenCalledWith("Access-Control-Allow-Origin", "*");
			expect(res.status).toHaveBeenCalledWith(204);
			expect(res.end).toHaveBeenCalled();
		});

		it("responde 401 si falta cabecera Authorization", async () => {
			const req = { method: "POST", headers: {} };
			const res = {
				setHeader: vi.fn(),
				status: vi.fn().mockReturnThis(),
				json: vi.fn(),
			};

			await opencodeHandler(req, res);

			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({ error: expect.stringContaining("Authorization") }),
			);
		});

		it("hace proxy de chat completions a OpenCode Zen y retorna 200 OK con CORS", async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				status: 200,
				text: async () => JSON.stringify({
					choices: [{ message: { content: "Respuesta de OpenCode Zen proxy" } }],
					usage: { total_tokens: 35 },
				}),
			});
			globalThis.fetch = mockFetch;

			const req = {
				method: "POST",
				headers: { authorization: "Bearer opencode_valid_key" },
				body: { model: "deepseek-ai/deepseek-v3", messages: [{ role: "user", content: "hola" }] },
			};
			const res = {
				setHeader: vi.fn(),
				status: vi.fn().mockReturnThis(),
				json: vi.fn(),
			};

			await opencodeHandler(req, res);

			expect(mockFetch).toHaveBeenCalledWith(
				"https://opencode.ai/zen/v1/chat/completions",
				expect.objectContaining({
					method: "POST",
					headers: expect.objectContaining({
						Authorization: "Bearer opencode_valid_key",
					}),
				}),
			);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({
					choices: expect.arrayContaining([
						expect.objectContaining({
							message: { content: "Respuesta de OpenCode Zen proxy" },
						}),
					]),
				}),
			);
		});
	});

	describe("2. api/groq.ts (Proxy Serverless Groq con Auto-Fallback)", () => {
		it("si el modelo solicitado retorna 404, reintenta automáticamente con llama-3.1-8b-instant y retorna 200", async () => {
			const mockFetch = vi.fn()
				// Primer intento: modelo retirado (404)
				.mockResolvedValueOnce({
					status: 404,
					text: async () => JSON.stringify({ error: { message: "model 'llama-3.3-70b-versatile' not found", code: "model_not_found" } }),
				})
				// Segundo intento: modelo fallback activo responde 200
				.mockResolvedValueOnce({
					status: 200,
					text: async () => JSON.stringify({
						choices: [{ message: { content: "Respuesta desde Llama 3.1 8B Instant" } }],
						usage: { prompt_tokens: 15, completion_tokens: 10, total_tokens: 25 },
					}),
				});
			globalThis.fetch = mockFetch;

			const req = {
				method: "POST",
				headers: { authorization: "Bearer gsk_valid_key" },
				body: { model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: "test" }] },
			};
			const res = {
				setHeader: vi.fn(),
				status: vi.fn().mockReturnThis(),
				json: vi.fn(),
			};

			await groqHandler(req, res);

			expect(mockFetch).toHaveBeenCalledTimes(2);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({
					choices: expect.arrayContaining([
						expect.objectContaining({
							message: { content: "Respuesta desde Llama 3.1 8B Instant" },
						}),
					]),
				}),
			);
		});
	});

	describe("3. api/nvidia.ts (Proxy Serverless Nvidia con Auto-Fallback)", () => {
		it("si el modelo solicitado retorna 410 (Gone / Fin de ciclo), reintenta automáticamente con nemotron activo", async () => {
			const mockFetch = vi.fn()
				// Primer intento: 410 Gone
				.mockResolvedValueOnce({
					status: 410,
					text: async () => JSON.stringify({ type: "about:blank", title: "Gone", status: 410, detail: "Model has reached end of life" }),
				})
				// Segundo intento: nemotron responde 200
				.mockResolvedValueOnce({
					status: 200,
					text: async () => JSON.stringify({
						choices: [{ message: { content: "Respuesta de Nemotron activo" } }],
						usage: { total_tokens: 40 },
					}),
				});
			globalThis.fetch = mockFetch;

			const req = {
				method: "POST",
				headers: { authorization: "Bearer nvapi_valid_key" },
				body: { model: "meta/llama-3.1-70b-instruct", messages: [{ role: "user", content: "test" }] },
			};
			const res = {
				setHeader: vi.fn(),
				status: vi.fn().mockReturnThis(),
				json: vi.fn(),
			};

			await nvidiaHandler(req, res);

			expect(mockFetch).toHaveBeenCalledTimes(2);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({
					choices: expect.arrayContaining([
						expect.objectContaining({
							message: { content: "Respuesta de Nemotron activo" },
						}),
					]),
				}),
			);
		});
	});

	describe("4. plottioAgent: Reintento ante 404 de Groq en cliente", () => {
		it("si Groq retorna 404, reintenta automáticamente con llama-3.1-8b-instant y completa la solicitud", async () => {
			const mockFetch = vi.fn()
				// Intento 1: 404
				.mockResolvedValueOnce({
					ok: false,
					status: 404,
					json: async () => ({ error: { message: "model_not_found" } }),
				})
				// Intento 2 con fallback: 200 OK
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => ({
						choices: [{ message: { content: "Respuesta operacional de taller vía Groq fallback" } }],
						usage: { prompt_tokens: 20, completion_tokens: 15, total_tokens: 35 },
					}),
				});
			globalThis.fetch = mockFetch;

			const res = await executeLiveBusinessAgent("Dame las órdenes", {
				assistantName: "Plottio Asistente",
				provider: "groq",
				apiKey: "gsk_test_key",
				model: "llama-3.3-70b-versatile",
				businessData: { ordenes: [] },
			});

			expect(mockFetch).toHaveBeenCalledTimes(2);
			expect(res.allowed).toBe(true);
			expect(res.response).toContain("Respuesta operacional de taller vía Groq fallback");
			expect(res.telemetry?.provider).toBe("Groq Cloud");
		});
	});
});
