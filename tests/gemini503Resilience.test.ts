// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type BusinessDataContext,
	executeLiveBusinessAgent,
} from "../src/services/plottioAgent";
import {
	AI_MODELS_BY_PROVIDER,
	useIntegrationsStore,
} from "../src/store/useIntegrationsStore";

describe("Tarea 33 (P0 - Fase 6): Resiliencia ante HTTP 503 / 429 en Google AI Studio (Fallback Inteligente a Gemini 3.8 Flash y Degeneración Transparente)", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		localStorage.clear();
		useIntegrationsStore.setState(useIntegrationsStore.getInitialState(), true);
	});

	afterEach(() => {
		vi.restoreAllMocks();
		localStorage.clear();
	});

	// =========================================================================
	// 1. FALLBACK INTELIGENTE ANTE HTTP 503 / 429 / 404
	// =========================================================================
	describe("1. Conmutación inteligente ante HTTP 503 y 429", () => {
		it("ante HTTP 503 en gemini-flash-latest, reintenta inmediatamente con gemini-3.8-flash y responde 200 OK", async () => {
			const mockFetch = vi
				.fn()
				// Intento 1: gemini-flash-latest responde 503 (Service Unavailable)
				.mockResolvedValueOnce({
					ok: false,
					status: 503,
					statusText: "Service Unavailable",
					json: async () => ({
						error: {
							code: 503,
							message: "The model is overloaded. Please try again later.",
						},
					}),
				})
				// Intento 2: gemini-3.8-flash responde 200 OK rápidamente
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => ({
						candidates: [
							{
								content: {
									parts: [
										{
											text: "Respuesta exitosa generada por gemini-3.8-flash tras saturación 503.",
										},
									],
								},
							},
						],
						usageMetadata: {
							promptTokenCount: 140,
							candidatesTokenCount: 45,
							totalTokenCount: 185,
						},
					}),
				});
			vi.stubGlobal("fetch", mockFetch);

			const result = await executeLiveBusinessAgent("Consultar órdenes activas", {
				assistantName: "Plottio Asistente",
				apiKey: "AQ.live_key_google",
				provider: "google",
				model: "gemini-flash-latest",
			});

			expect(mockFetch).toHaveBeenCalledTimes(2);

			const firstUrl = mockFetch.mock.calls[0][0] as string;
			expect(firstUrl).toContain("models/gemini-flash-latest:generateContent");

			const secondUrl = mockFetch.mock.calls[1][0] as string;
			expect(secondUrl).toContain("models/gemini-3.8-flash:generateContent");

			expect(result.allowed).toBe(true);
			expect(result.response).toBe(
				"Respuesta exitosa generada por gemini-3.8-flash tras saturación 503.",
			);
			expect(result.telemetry?.model).toBe("gemini-3.8-flash");
			expect(result.telemetry?.provider).toBe("Google Gemini");
			expect(result.telemetry?.totalTokens).toBe(185);
		});

		it("ante HTTP 429 (Rate Limit) en gemini-flash-latest, conmuta a gemini-3.8-flash", async () => {
			const mockFetch = vi
				.fn()
				.mockResolvedValueOnce({
					ok: false,
					status: 429,
					statusText: "Too Many Requests",
					json: async () => ({
						error: { code: 429, message: "Resource has been exhausted" },
					}),
				})
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => ({
						candidates: [
							{
								content: {
									parts: [
										{
											text: "Respuesta recuperada tras HTTP 429 con gemini-3.8-flash.",
										},
									],
								},
							},
						],
					}),
				});
			vi.stubGlobal("fetch", mockFetch);

			const result = await executeLiveBusinessAgent("Stock vinilo 3M", {
				assistantName: "Plottio Asistente",
				apiKey: "AQ.live_key_google",
				provider: "google",
				model: "gemini-flash-latest",
			});

			expect(mockFetch).toHaveBeenCalledTimes(2);
			expect(result.response).toBe(
				"Respuesta recuperada tras HTTP 429 con gemini-3.8-flash.",
			);
			expect(result.telemetry?.model).toBe("gemini-3.8-flash");
		});

		it("si el modelo configurado es gemini-3.8-flash y falla con 503, reintenta con gemini-3.7-flash", async () => {
			const mockFetch = vi
				.fn()
				// Fallo inicial en gemini-3.8-flash
				.mockResolvedValueOnce({
					ok: false,
					status: 503,
					statusText: "Service Unavailable",
				})
				// Fallback a gemini-3.7-flash responde 200 OK
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => ({
						candidates: [
							{
								content: {
									parts: [
										{
											text: "Respuesta de respaldo con gemini-3.7-flash.",
										},
									],
								},
							},
						],
					}),
				});
			vi.stubGlobal("fetch", mockFetch);

			const result = await executeLiveBusinessAgent("Vehículos en taller", {
				assistantName: "Plottio Asistente",
				apiKey: "AQ.live_key_google",
				provider: "google",
				model: "gemini-3.8-flash",
			});

			expect(mockFetch).toHaveBeenCalledTimes(2);

			const firstUrl = mockFetch.mock.calls[0][0] as string;
			expect(firstUrl).toContain("models/gemini-3.8-flash:generateContent");

			const secondUrl = mockFetch.mock.calls[1][0] as string;
			expect(secondUrl).toContain("models/gemini-3.7-flash:generateContent");

			expect(result.response).toBe(
				"Respuesta de respaldo con gemini-3.7-flash.",
			);
			expect(result.telemetry?.model).toBe("gemini-3.7-flash");
		});
	});

	// =========================================================================
	// 2. DEGENERACIÓN TRANSPARENTE ANTE 503 PERSISTENTE / CAÍDA DE RED
	// =========================================================================
	describe("2. Degeneración transparente a datos operacionales del taller", () => {
		const sampleBusinessData: BusinessDataContext = {
			empresas: [
				{
					id: "emp-1",
					nombre: "Transmer S.A.",
					ruc: "1790011223001",
					telefono: "0991234567",
					activa: true,
				},
			],
			clientes: [
				{
					id: "cli-1",
					nombre: "Carlos Andrade",
					identificacion: "1710034567",
					telefono: "0987654321",
				},
			],
			ordenes: [
				{
					id: "OT-101",
					placa: "PBX-4567",
					clienteNombre: "Transmer S.A.",
					estado: "En Proceso",
				},
			],
		};

		it("ante HTTP 503 persistente en Google, degrada a respuesta determinista con aviso de respaldo y telemetría adecuada sin crashear", async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 503,
				statusText: "Service Unavailable",
				json: async () => ({
					error: {
						code: 503,
						message: "Google AI Studio service is currently unavailable.",
					},
				}),
			});
			vi.stubGlobal("fetch", mockFetch);

			const result = await executeLiveBusinessAgent("Empresas registradas", {
				assistantName: "Plottio Asistente",
				apiKey: "AQ.live_key_google",
				provider: "google",
				model: "gemini-3.8-flash",
				businessData: sampleBusinessData,
			});

			expect(result.allowed).toBe(true);

			// Aviso de disponibilidad en la respuesta
			expect(result.response).toContain(
				"(Aviso de disponibilidad: El servicio de Google AI Studio se encuentra temporalmente saturado [HTTP 503]. Respuesta generada a partir de los datos operacionales de tu taller:)",
			);
			// Contenido operacional real de la BD
			expect(result.response).toContain("Transmer S.A.");
			expect(result.response).toContain("1790011223001");

			// Telemetría de respaldo local
			expect(result.telemetry).toBeDefined();
			expect(result.telemetry?.provider).toBe(
				"Google Gemini (Respaldo Local Plottio)",
			);
			expect(result.telemetry?.model).toContain(
				"(Google 503 -> Respaldo Local)",
			);
			expect(result.telemetry?.totalTokens).toBeGreaterThan(0);
			expect(result.telemetry?.latencyMs).toBeGreaterThanOrEqual(25);
			expect(result.telemetry?.tps).toBeGreaterThan(0);
		});

		it("ante fallo total de red (TypeError: fetch failed / timeout), activa la degeneración transparente sin crashear", async () => {
			const mockFetch = vi
				.fn()
				.mockRejectedValue(new Error("fetch failed: connection timeout"));
			vi.stubGlobal("fetch", mockFetch);

			const result = await executeLiveBusinessAgent("Consultar órdenes activas", {
				assistantName: "Plottio Asistente",
				apiKey: "AQ.live_key_google",
				provider: "google",
				businessData: sampleBusinessData,
			});

			expect(result.allowed).toBe(true);
			expect(result.response).toContain(
				"(Aviso de disponibilidad: El servicio de Google AI Studio se encuentra temporalmente saturado [HTTP 503]. Respuesta generada a partir de los datos operacionales de tu taller:)",
			);
			expect(result.response).toContain("PBX-4567");
			expect(result.telemetry?.provider).toBe(
				"Google Gemini (Respaldo Local Plottio)",
			);
			expect(result.telemetry?.model).toContain(
				"(Google 503 -> Respaldo Local)",
			);
		});
	});

	// =========================================================================
	// 3. CATÁLOGO OFICIAL Y PARÁMETROS CANÓNICOS
	// =========================================================================
	describe("3. Catálogo oficial de Google y configuración canónica", () => {
		it("AI_MODELS_BY_PROVIDER.google contiene el catálogo canónico actualizado", () => {
			expect(AI_MODELS_BY_PROVIDER.google).toEqual([
				"Gemini 3.8 Flash (Recomendado · Rápido y Económico)",
				"Gemini 3.7 Flash",
				"Gemini Flash Lite",
				"Gemini Flash Latest",
			]);
		});

		it("el store useIntegrationsStore inicia con Gemini 3.8 Flash por defecto", () => {
			const state = useIntegrationsStore.getState();
			expect(state.ai.activeModel).toBe(
				"Gemini 3.8 Flash (Recomendado · Rápido y Económico)",
			);
			expect(state.agent.model).toBe("gemini-3.8-flash");
			expect(state.rag.model).toBe("gemini-3.8-flash");
		});

		it("executeLiveBusinessAgent utiliza gemini-3.8-flash por defecto cuando no se pasa modelo", async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({
					candidates: [
						{
							content: {
								parts: [{ text: "Respuesta con modelo por defecto" }],
							},
						},
					],
				}),
			});
			vi.stubGlobal("fetch", mockFetch);

			await executeLiveBusinessAgent("Stock bobinas", {
				assistantName: "Plottio Asistente",
				apiKey: "AQ.default_key",
				provider: "google",
			});

			expect(mockFetch).toHaveBeenCalledTimes(1);
			const requestedUrl = mockFetch.mock.calls[0][0] as string;
			expect(requestedUrl).toContain("models/gemini-3.8-flash:generateContent");
		});
	});
});
