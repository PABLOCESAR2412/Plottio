// @vitest-environment jsdom
import fs from "node:fs";
import path from "node:path";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FinOpsMetricsPanel } from "../src/components/FinOpsMetricsPanel";
import { fetchAvailableModels } from "../src/services/aiModelsDiscovery";
import {
	AI_MODELS_BY_PROVIDER,
	useIntegrationsStore,
} from "../src/store/useIntegrationsStore";

describe("Tarea 24 (P1 - Fase 4): Analíticas y Configuración — Datos Reales y Detección Dinámica", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		useIntegrationsStore.setState(useIntegrationsStore.getInitialState(), true);
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	// =========================================================================
	// 1. CONFIGURACIONVIEW & TÍTULOS DE PANEL
	// =========================================================================
	describe("1. Renombrado a 'Analíticas y Configuración' en ConfiguracionView y FinOpsMetricsPanel", () => {
		const configViewPath = path.resolve(
			process.cwd(),
			"src/components/ConfiguracionView.tsx",
		);
		const finOpsPanelPath = path.resolve(
			process.cwd(),
			"src/components/FinOpsMetricsPanel.tsx",
		);

		it("ConfiguracionView.tsx contiene la pestaña 'Analíticas y Configuración'", () => {
			expect(fs.existsSync(configViewPath)).toBe(true);
			const content = fs.readFileSync(configViewPath, "utf-8");

			expect(content).toContain("Analíticas y Configuración");
			expect(content).not.toContain("<span>IA / FinOps</span>");
		});

		it("FinOpsMetricsPanel.tsx muestra el título 'Analíticas y Configuración de Modelos IA'", () => {
			expect(fs.existsSync(finOpsPanelPath)).toBe(true);
			const content = fs.readFileSync(finOpsPanelPath, "utf-8");

			expect(content).toContain("Analíticas y Configuración de Modelos IA");
			expect(content).not.toContain("Panel de Control FinOps & Modelos IA");
		});

		it("renderiza el título 'Analíticas y Configuración de Modelos IA' en el DOM", () => {
			render(React.createElement(FinOpsMetricsPanel));
			expect(
				screen.getByRole("heading", {
					name: /Analíticas y Configuración de Modelos IA/i,
				}),
			).toBeDefined();
		});
	});

	// =========================================================================
	// 2. AUTO-DESCUBRIMIENTO DINÁMICO DE MODELOS POR API KEY
	// =========================================================================
	describe("2. Servicio fetchAvailableModels: Detección Dinámica y Resiliencia", () => {
		it("retorna fallback canónico si la API Key está vacía para cualquier proveedor", async () => {
			const googleRes = await fetchAvailableModels("google", "");
			expect(googleRes).toEqual(AI_MODELS_BY_PROVIDER.google);

			const groqRes = await fetchAvailableModels("groq", "   ");
			expect(groqRes).toEqual(AI_MODELS_BY_PROVIDER.groq);

			const zenRes = await fetchAvailableModels("opencode_zen", "");
			expect(zenRes).toEqual(AI_MODELS_BY_PROVIDER.opencode_zen);

			const nvidiaRes = await fetchAvailableModels("nvidia", "");
			expect(nvidiaRes).toEqual(AI_MODELS_BY_PROVIDER.nvidia);
		});

		it("Google: consulta endpoint generativelanguage y extrae modelos compatibles con generateContent", async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					models: [
						{
							name: "models/gemini-2.0-flash",
							displayName: "Gemini 2.0 Flash",
							supportedGenerationMethods: ["generateContent", "countTokens"],
						},
						{
							name: "models/gemini-1.5-pro",
							displayName: "Gemini 1.5 Pro",
							supportedGenerationMethods: ["generateContent"],
						},
						{
							name: "models/text-embedding-004",
							displayName: "Text Embedding 004",
							supportedGenerationMethods: ["embedContent"],
						},
					],
				}),
			});
			globalThis.fetch = mockFetch;

			const models = await fetchAvailableModels("google", "AIzaSy_test_key_123");

			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining(
					"https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSy_test_key_123",
				),
				expect.any(Object),
			);
			expect(models).toEqual(["gemini-2.0-flash", "gemini-1.5-pro"]);
		});

		it("Groq: consulta endpoint openai/v1/models con Bearer y extrae IDs activos", async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					data: [
						{ id: "llama-3.3-70b-versatile", active: true },
						{ id: "llama-3.1-8b-instant", active: true },
						{ id: "mixtral-8x7b-32768", active: true },
						{ id: "deprecated-llama", active: false },
					],
				}),
			});
			globalThis.fetch = mockFetch;

			const models = await fetchAvailableModels("groq", "gsk_test_api_key_456");

			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.groq.com/openai/v1/models",
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: "Bearer gsk_test_api_key_456",
					}),
				}),
			);
			expect(models).toEqual([
				"llama-3.3-70b-versatile",
				"llama-3.1-8b-instant",
				"mixtral-8x7b-32768",
			]);
		});

		it("Opencode Zen: consulta endpoint oficial canónico https://opencode.ai/zen/v1/models y devuelve modelos", async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					data: [
						{ id: "DeepSeek R1", name: "DeepSeek R1 Reasoning" },
						{ id: "DeepSeek V3", name: "DeepSeek V3" },
						{ id: "Qwen 2.5 Coder 32B", name: "Qwen 2.5 Coder 32B" },
					],
				}),
			});
			globalThis.fetch = mockFetch;

			const models = await fetchAvailableModels("opencode_zen", "zen_secret_key");
			expect(mockFetch).toHaveBeenCalledWith(
				"https://opencode.ai/zen/v1/models",
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: "Bearer zen_secret_key",
					}),
				}),
			);
			expect(models).toEqual([
				"DeepSeek R1",
				"DeepSeek V3",
				"Qwen 2.5 Coder 32B",
			]);
		});

		it("Opencode Zen: ante error de red, fallo DNS (ERR_NAME_NOT_RESOLVED) o CORS, retorna inmediatamente fallback oficial", async () => {
			const mockFetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch: net::ERR_NAME_NOT_RESOLVED"));
			globalThis.fetch = mockFetch;

			const models = await fetchAvailableModels("opencode_zen", "zen_key_dns_fail");
			expect(mockFetch).toHaveBeenCalledWith(
				"https://opencode.ai/zen/v1/models",
				expect.any(Object),
			);
			expect(models).toEqual(AI_MODELS_BY_PROVIDER.opencode_zen);
		});

		it("Nvidia NIM: consulta endpoint de integración y extrae catálogo acelerado", async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					data: [
						{ id: "nvidia/nemotron-4-340b-instruct" },
						{ id: "meta/llama-3.1-70b-instruct" },
					],
				}),
			});
			globalThis.fetch = mockFetch;

			const models = await fetchAvailableModels("nvidia", "nvapi-test-key");
			expect(models).toEqual([
				"nvidia/nemotron-4-340b-instruct",
				"meta/llama-3.1-70b-instruct",
			]);
		});

		it("Maneja errores HTTP 401/403/500 retornando el fallback oficial de forma segura", async () => {
			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 401,
				statusText: "Unauthorized",
			});

			const googleFallback = await fetchAvailableModels("google", "invalid_key");
			expect(googleFallback).toEqual(AI_MODELS_BY_PROVIDER.google);

			const groqFallback = await fetchAvailableModels("groq", "invalid_key");
			expect(groqFallback).toEqual(AI_MODELS_BY_PROVIDER.groq);
		});

		it("Maneja fallos de red / aborts / timeout sin lanzar excepción no controlada", async () => {
			globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network timeout or CORS blocked"));

			const zenFallback = await fetchAvailableModels("opencode_zen", "some_key");
			expect(zenFallback).toEqual(AI_MODELS_BY_PROVIDER.opencode_zen);

			const nvidiaFallback = await fetchAvailableModels("nvidia", "some_key");
			expect(nvidiaFallback).toEqual(AI_MODELS_BY_PROVIDER.nvidia);
		});
	});

	// =========================================================================
	// 3. REACTIVIDAD EN FINOPSMETRICSPANEL CON MODELOS DETECTADOS
	// =========================================================================
	describe("3. FinOpsMetricsPanel: Detección Reactiva de Modelos por Key", () => {
		it("detecta modelos y muestra feedback 'Modelos detectados para tu API Key: X modelos disponibles'", async () => {
			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					models: [
						{ name: "models/gemini-2.0-flash-preview", supportedGenerationMethods: ["generateContent"] },
						{ name: "models/gemini-2.0-pro-exp", supportedGenerationMethods: ["generateContent"] },
					],
				}),
			});

			render(React.createElement(FinOpsMetricsPanel));

			const apiKeyInput = screen.getByPlaceholderText(/Ingresa tu API Key para/i) as HTMLInputElement;

			await act(async () => {
				fireEvent.change(apiKeyInput, {
					target: { value: "AIzaSy_custom_test_valid_key" },
				});
			});

			const testBtn = screen.getByRole("button", { name: "Probar Conexión" });
			await act(async () => {
				fireEvent.click(testBtn);
			});

			await waitFor(() => {
				expect(
					screen.getAllByText(
						/Modelos detectados para tu API Key: 2 modelos disponibles/i,
					).length,
				).toBeGreaterThan(0);
			});

			// Selector de modelos debe tener los 2 modelos detectados
			const selectEl = screen.getByRole("combobox") as HTMLSelectElement;
			const options = Array.from(selectEl.options).map((o) => o.value);
			expect(options).toContain("gemini-2.0-flash-preview");
			expect(options).toContain("gemini-2.0-pro-exp");
		});

		it("el botón 'Detectar Modelos' permite sincronizar los modelos manualmente", async () => {
			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					data: [
						{ id: "llama-3.3-70b-versatile", active: true },
						{ id: "llama-3.1-8b-instant", active: true },
					],
				}),
			});

			render(React.createElement(FinOpsMetricsPanel));

			// Cambiar a Groq
			const groqBtn = screen.getByRole("button", { name: /Groq Cloud/i });
			fireEvent.click(groqBtn);

			const apiKeyInput = screen.getByPlaceholderText(/Ingresa tu API Key para/i) as HTMLInputElement;
			await act(async () => {
				fireEvent.change(apiKeyInput, {
					target: { value: "gsk_live_manual_trigger" },
				});
			});

			const detectBtn = screen.getByRole("button", { name: "Detectar Modelos" });
			await act(async () => {
				fireEvent.click(detectBtn);
			});

			await waitFor(() => {
				expect(
					screen.getAllByText(
						/Modelos detectados para tu API Key: 2 modelos disponibles/i,
					).length,
				).toBeGreaterThan(0);
			});
		});
	});

	// =========================================================================
	// 4. DATOS REALES: CERO VALORES QUEMADOS EN ESTADO INICIAL DE CONSUMO
	// =========================================================================
	describe("4. Métricas Reales: Erradicación de Valores Quemados en useIntegrationsStore", () => {
		it("el estado inicial de ai tiene métricas en cero sin datos inventados", () => {
			const { ai } = useIntegrationsStore.getInitialState();

			expect(ai.currentSpendUSD).toBe(0);
			expect(ai.tokensToday).toBe(0);
			expect(ai.totalRequests).toBe(0);
			expect(ai.tps).toBe(0);
			expect(ai.latencyMs).toBe(0);
			expect(ai.tokenUsageHourly).toEqual([]);
		});

		it("recordAiUsage registra consumo auténtico y desglosa por hora", () => {
			const { recordAiUsage } = useIntegrationsStore.getState();

			expect(useIntegrationsStore.getState().ai.tokensToday).toBe(0);
			expect(useIntegrationsStore.getState().ai.currentSpendUSD).toBe(0);
			expect(useIntegrationsStore.getState().ai.totalRequests).toBe(0);

			// Simulamos consumo de una llamada de Plottio Asistente
			recordAiUsage(2500, 0.05, 320);

			const updated = useIntegrationsStore.getState().ai;
			expect(updated.tokensToday).toBe(2500);
			expect(updated.currentSpendUSD).toBe(0.05);
			expect(updated.totalRequests).toBe(1);
			expect(updated.latencyMs).toBe(320);
			expect(updated.tps).toBeGreaterThan(0);
			expect(updated.tokenUsageHourly.length).toBe(1);
			expect(updated.tokenUsageHourly[0].tokens).toBe(2500);
			expect(updated.tokenUsageHourly[0].costUSD).toBe(0.05);

			// Segunda llamada acumula en la misma hora
			recordAiUsage(1000, 0.02, 300);
			const secondUpdate = useIntegrationsStore.getState().ai;
			expect(secondUpdate.tokensToday).toBe(3500);
			expect(secondUpdate.currentSpendUSD).toBe(0.07);
			expect(secondUpdate.totalRequests).toBe(2);
			expect(secondUpdate.tokenUsageHourly[0].tokens).toBe(3500);
			expect(secondUpdate.tokenUsageHourly[0].costUSD).toBe(0.07);
		});

		it("el componente FinOpsMetricsPanel muestra métricas en 0 cuando no hay consumo", () => {
			render(React.createElement(FinOpsMetricsPanel));

			// El valor de gasto acumulado y barras debe ser $0.00
			expect(screen.getAllByText(/\$0\.00/).length).toBeGreaterThan(0);
			const totalTokensCard = screen.getByText("Tokens Usados").closest(".rounded-xl");
			expect(totalTokensCard?.textContent).toContain("0");

			const requestsCard = screen.getByText("Usos / Solicitudes").closest(".rounded-xl");
			expect(requestsCard?.textContent).toContain("0");
		});
	});
});
