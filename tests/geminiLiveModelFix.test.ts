// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { purgeObsoleteEndpoints } from "../src/routes/__root";
import { executeLiveBusinessAgent } from "../src/services/plottioAgent";
import {
	AI_MODELS_BY_PROVIDER,
	useIntegrationsStore,
} from "../src/store/useIntegrationsStore";

describe("Tarea 28 (P0 - Fase 5): Corrección de Modelos Gemini (gemini-flash-latest / gemini-3.8-flash) y Eliminación de Error 404 en API de Google", () => {
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
	// 1. RESOLUCIÓN DINÁMICA DE MODELOS Y ELIMINACIÓN DE gemini-1.5-flash
	// =========================================================================
	describe("1. Resolución Dinámica de Modelos en executeLiveBusinessAgent", () => {
		it("utiliza gemini-flash-latest por defecto y nunca gemini-1.5-flash", async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({
					candidates: [
						{
							content: {
								parts: [
									{
										text: "Respuesta en vivo con gemini-flash-latest para taller de rotulado.",
									},
								],
							},
						},
					],
				}),
			});
			vi.stubGlobal("fetch", mockFetch);

			const result = await executeLiveBusinessAgent(
				"Consultar ordenes activas",
				{
					assistantName: "Plottio Asistente",
					apiKey: "AQ.Ab8RN6LcmZXRRSCF_test_key",
					provider: "google",
				},
			);

			expect(mockFetch).toHaveBeenCalledTimes(1);
			const requestUrl = mockFetch.mock.calls[0][0] as string;

			expect(requestUrl).toContain("models/gemini-flash-latest:generateContent");
			expect(requestUrl).not.toContain("gemini-1.5-flash");
			expect(requestUrl).toContain("key=AQ.Ab8RN6LcmZXRRSCF_test_key");
			expect(result.allowed).toBe(true);
			expect(result.response).toContain("Respuesta en vivo con gemini-flash-latest");
			expect(result.toolsCalled.length).toBeGreaterThan(0);
		});

		it("mapea dinámicamente modelos deprecados (gemini-1.5-flash, gemini-2.0-flash) a gemini-flash-latest", async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({
					candidates: [
						{ content: { parts: [{ text: "Respuesta redirigida" }] } },
					],
				}),
			});
			vi.stubGlobal("fetch", mockFetch);

			// Intento con gemini-1.5-flash
			await executeLiveBusinessAgent("Stock vinilos 3M", {
				assistantName: "Plottio Asistente",
				apiKey: "AQ.test_key",
				provider: "google",
				model: "gemini-1.5-flash",
			});

			let requestUrl = mockFetch.mock.calls[0][0] as string;
			expect(requestUrl).toContain("models/gemini-flash-latest:generateContent");
			expect(requestUrl).not.toContain("gemini-1.5-flash");

			// Intento con gemini-2.0-flash
			mockFetch.mockClear();
			await executeLiveBusinessAgent("Stock vinilos Arlon", {
				assistantName: "Plottio Asistente",
				apiKey: "AQ.test_key",
				provider: "google",
				model: "gemini-2.0-flash",
			});

			requestUrl = mockFetch.mock.calls[0][0] as string;
			expect(requestUrl).toContain("models/gemini-flash-latest:generateContent");
		});

		it("permite ejecutar con gemini-3.8-flash sin forzar fallback si responde 200 OK", async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({
					candidates: [
						{
							content: {
								parts: [
									{ text: "Respuesta de gemini-3.8-flash procesada con éxito" },
								],
							},
						},
					],
				}),
			});
			vi.stubGlobal("fetch", mockFetch);

			const result = await executeLiveBusinessAgent("Cotización cliente Juan", {
				assistantName: "Plottio Asistente",
				apiKey: "AQ.test_key",
				provider: "google",
				model: "gemini-3.8-flash",
			});

			expect(mockFetch).toHaveBeenCalledTimes(1);
			const requestUrl = mockFetch.mock.calls[0][0] as string;
			expect(requestUrl).toContain("models/gemini-3.8-flash:generateContent");
			expect(result.response).toBe(
				"Respuesta de gemini-3.8-flash procesada con éxito",
			);
		});

		it("soporta nombres con espacios como 'Gemini 3.8 Flash' formateándolos correctamente", async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({
					candidates: [
						{ content: { parts: [{ text: "Respuesta formateada OK" }] } },
					],
				}),
			});
			vi.stubGlobal("fetch", mockFetch);

			await executeLiveBusinessAgent("Ver vehiculos", {
				assistantName: "Plottio Asistente",
				apiKey: "AQ.test_key",
				provider: "google",
				model: "Gemini 3.8 Flash",
			});

			const requestUrl = mockFetch.mock.calls[0][0] as string;
			expect(requestUrl).toContain("models/gemini-3.8-flash:generateContent");
		});
	});

	// =========================================================================
	// 2. RETRY AUTOMÁTICO ANTE HTTP 404 (DESCONTINUACIÓN EN GOOGLE AI STUDIO)
	// =========================================================================
	describe("2. Retry Automático Inmediato ante HTTP 404 de Google", () => {
		it("si el modelo seleccionado arroja 404, reintenta inmediatamente con gemini-flash-latest", async () => {
			const mockFetch = vi
				.fn()
				// Primera llamada con gemini-3.8-flash falla con 404 (ej. no habilitado en la región/cuenta)
				.mockResolvedValueOnce({
					ok: false,
					status: 404,
					statusText: "Not Found",
					json: async () => ({
						error: {
							code: 404,
							message: "models/gemini-3.8-flash is not found for API version v1beta",
						},
					}),
				})
				// Segunda llamada con gemini-flash-latest responde exitosamente 200 OK
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => ({
						candidates: [
							{
								content: {
									parts: [
										{
											text: "Respuesta generada en retry automático con gemini-flash-latest.",
										},
									],
								},
							},
						],
					}),
				});
			vi.stubGlobal("fetch", mockFetch);

			const result = await executeLiveBusinessAgent("Avance de rotulado", {
				assistantName: "Plottio Asistente",
				apiKey: "AQ.Ab8RN6LcmZXRRSCF_test_key",
				provider: "google",
				model: "gemini-3.8-flash",
			});

			expect(mockFetch).toHaveBeenCalledTimes(2);

			// Primera petición al modelo solicitado
			const firstUrl = mockFetch.mock.calls[0][0] as string;
			expect(firstUrl).toContain("models/gemini-3.8-flash:generateContent");

			// Segunda petición de retry a gemini-flash-latest
			const secondUrl = mockFetch.mock.calls[1][0] as string;
			expect(secondUrl).toContain("models/gemini-flash-latest:generateContent");

			expect(result.allowed).toBe(true);
			expect(result.response).toBe(
				"Respuesta generada en retry automático con gemini-flash-latest.",
			);
			expect(result.toolsCalled.length).toBeGreaterThan(0);
		});

		it("si el retry o la llamada falla completamente, usa el fallback seguro a baseExecution", async () => {
			const mockFetch = vi.fn().mockRejectedValue(new Error("Network connection lost"));
			vi.stubGlobal("fetch", mockFetch);

			const result = await executeLiveBusinessAgent("Consultar ordenes", {
				assistantName: "Plottio Asistente",
				apiKey: "AQ.test_key",
				provider: "google",
				model: "gemini-flash-latest",
			});

			expect(result.allowed).toBe(true);
			expect(result.response).toContain("Basado en la ejecución de herramientas de negocio");
			expect(result.toolsCalled.length).toBeGreaterThan(0);
		});
	});

	// =========================================================================
	// 3. CATÁLOGO ACTUALIZADO EN STORE & REHIDRATACIÓN
	// =========================================================================
	describe("3. Catálogo de Modelos Google en useIntegrationsStore", () => {
		it("AI_MODELS_BY_PROVIDER.google contiene los modelos oficiales actualizados", () => {
			expect(AI_MODELS_BY_PROVIDER.google).toEqual([
				"Gemini Flash Latest",
				"Gemini 3.8 Flash",
				"Gemini 2.5 Flash",
				"Gemini 2.5 Pro",
			]);
		});

		it("el estado inicial de ai.activeModel es 'Gemini Flash Latest'", () => {
			const state = useIntegrationsStore.getState();
			expect(state.ai.activeModel).toBe("Gemini Flash Latest");
		});

		it("el estado inicial de agent.model y rag.model es 'gemini-flash-latest'", () => {
			const state = useIntegrationsStore.getState();
			expect(state.agent.model).toBe("gemini-flash-latest");
			expect(state.rag.model).toBe("gemini-flash-latest");
		});

		it("onRehydrateStorage migra modelos deprecados a los nuevos modelos canónicos", () => {
			const persistOptions = (
				useIntegrationsStore as unknown as {
					persist: {
						getOptions: () => {
							onRehydrateStorage?: () => (state: Record<string, any>) => void;
						};
					};
				}
			).persist?.getOptions();

			expect(persistOptions?.onRehydrateStorage).toBeDefined();

			if (persistOptions?.onRehydrateStorage) {
				const onRehydrate = persistOptions.onRehydrateStorage();

				const obsoleteState = {
					agent: { model: "gemini-1.5-flash" },
					rag: { model: "gemini-1.5-pro" },
					ai: { activeModel: "Gemini 2.0 Flash" },
				};

				onRehydrate(obsoleteState);

				expect(obsoleteState.agent.model).toBe("gemini-flash-latest");
				expect(obsoleteState.rag.model).toBe("gemini-pro-latest");
				expect(obsoleteState.ai.activeModel).toBe("Gemini Flash Latest");

				const anotherObsoleteState = {
					agent: { model: "gemini-2.0-flash" },
					rag: { model: "gemini-1.5-flash" },
					ai: { activeModel: "Gemini 1.5 Pro" },
				};

				onRehydrate(anotherObsoleteState);

				expect(anotherObsoleteState.agent.model).toBe("gemini-flash-latest");
				expect(anotherObsoleteState.rag.model).toBe("gemini-flash-latest");
				expect(anotherObsoleteState.ai.activeModel).toBe("Gemini 2.5 Pro");
			}
		});
	});

	// =========================================================================
	// 4. PURGA ACTIVA DE URLS OBSOLETAS EN LOCALSTORAGE (ONRENDER)
	// =========================================================================
	describe("4. Purga Activa de URLs obsoletas de onrender en __root.tsx", () => {
		it("elimina o sanitiza cualquier residuo de evolution-api-0q39.onrender.com en localStorage", () => {
			// Claves y valores contaminados
			localStorage.setItem(
				"evolution-api-0q39.onrender.com_session",
				"old_session_token",
			);
			localStorage.setItem(
				"plottio_integrations_store_v1",
				JSON.stringify({
					whatsapp: {
						serverUrl: "https://evolution-api-0q39.onrender.com/webhook",
						apiUrl: "https://evolution-api-0q39.onrender.com",
					},
				}),
			);
			localStorage.setItem(
				"custom_webhook",
				"https://onrender.com/api/test",
			);

			purgeObsoleteEndpoints();

			// Clave que contenía onrender debe haber sido eliminada
			expect(
				localStorage.getItem("evolution-api-0q39.onrender.com_session"),
			).toBeNull();

			// Store debe haber reemplazado las URLs de onrender
			const updatedStore = JSON.parse(
				localStorage.getItem("plottio_integrations_store_v1") || "{}",
			);
			expect(updatedStore.whatsapp?.serverUrl).toBe(
				"https://plottio.vercel.app/api/webhook/wha",
			);
			expect(updatedStore.whatsapp?.apiUrl).toBe(
				"https://plottio.vercel.app/api/webhook/wha",
			);

			// Clave custom debe haber sido sanitizada
			expect(localStorage.getItem("custom_webhook")).toBe(
				"https://plottio.vercel.app/api/webhook/wha",
			);
		});
	});
});
