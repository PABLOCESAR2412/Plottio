// @vitest-environment jsdom
import fs from "node:fs";
import path from "node:path";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FinOpsMetricsPanel } from "../src/components/FinOpsMetricsPanel";
import {
	AI_MODELS_BY_PROVIDER,
	type AiProvider,
	useIntegrationsStore,
} from "../src/store/useIntegrationsStore";

describe(
	"Tarea 21 (P1 - Fase 3): Panel IA / FinOps Multi-Proveedor con Métricas y Filtros Temporales",
	{ timeout: 15000 },
	() => {
	beforeEach(() => {
		useIntegrationsStore.setState(useIntegrationsStore.getInitialState(), true);
	});

	afterEach(() => {
		cleanup();
	});

	// =========================================================================
	// 1. STORE & CATÁLOGO CANÓNICO MULTI-PROVEEDOR
	// =========================================================================
	describe("1. Store: useIntegrationsStore & Catálogo Canónico Multi-Proveedor", () => {
		it("define exactamente los 4 proveedores LLM oficiales con sus catálogos canónicos", () => {
			const expectedProviders: AiProvider[] = [
				"google",
				"groq",
				"opencode_zen",
				"nvidia",
			];

			expect(Object.keys(AI_MODELS_BY_PROVIDER)).toEqual(expectedProviders);

			// Modelos Google
			expect(AI_MODELS_BY_PROVIDER.google).toEqual([
				"Gemini 2.0 Flash",
				"Gemini 1.5 Pro",
				"Gemini 1.5 Flash",
			]);

			// Modelos Groq
			expect(AI_MODELS_BY_PROVIDER.groq).toEqual([
				"Llama 3.3 70B Versatile",
				"Llama 3.1 8B Instant",
				"Mixtral 8x7B",
			]);

			// Modelos Opencode Zen
			expect(AI_MODELS_BY_PROVIDER.opencode_zen).toEqual([
				"DeepSeek R1",
				"DeepSeek V3",
				"Qwen 2.5 Coder",
			]);

			// Modelos Nvidia NIM
			expect(AI_MODELS_BY_PROVIDER.nvidia).toEqual([
				"Nemotron 70B",
				"Llama 3.1 Nemotron 70B Ultra",
				"Mistral NeMo",
			]);
		});

		it("el estado inicial de ai contiene claves independientes para los 4 proveedores", () => {
			const { ai } = useIntegrationsStore.getState();

			expect(ai.googleApiKey).toBeDefined();
			expect(ai.groqApiKey).toBeDefined();
			expect(ai.opencodeZenApiKey).toBeDefined();
			expect(ai.nvidiaApiKey).toBeDefined();
			expect(ai.timeFilter).toBe("dia");
			expect(ai.activeModel).toBe("Gemini 2.0 Flash");
		});

		it("permite actualizar la configuración de IA para cualquier proveedor", () => {
			const { updateAiConfig } = useIntegrationsStore.getState();

			updateAiConfig({
				provider: "groq",
				groqApiKey: "gsk_live_test_12345",
				activeModel: "Llama 3.3 70B Versatile",
				monthlyBudgetUSD: 250,
			});

			const { ai } = useIntegrationsStore.getState();
			expect(ai.provider).toBe("groq");
			expect(ai.groqApiKey).toBe("gsk_live_test_12345");
			expect(ai.activeModel).toBe("Llama 3.3 70B Versatile");
			expect(ai.monthlyBudgetUSD).toBe(250);
		});

		it("setTimeFilter actualiza el filtro temporal e intervalos personalizados", () => {
			const { setTimeFilter } = useIntegrationsStore.getState();

			// Filtro semana
			setTimeFilter("semana");
			expect(useIntegrationsStore.getState().ai.timeFilter).toBe("semana");

			// Filtro 15 días
			setTimeFilter("15dias");
			expect(useIntegrationsStore.getState().ai.timeFilter).toBe("15dias");

			// Filtro 1 mes
			setTimeFilter("1mes");
			expect(useIntegrationsStore.getState().ai.timeFilter).toBe("1mes");

			// Filtro intervalos con fechas
			setTimeFilter("intervalos", "2026-06-01", "2026-06-15");
			const state = useIntegrationsStore.getState().ai;
			expect(state.timeFilter).toBe("intervalos");
			expect(state.customIntervalStart).toBe("2026-06-01");
			expect(state.customIntervalEnd).toBe("2026-06-15");
		});

		it("recordAiUsage actualiza tokens acumulados, gasto y total de solicitudes", () => {
			const { recordAiUsage } = useIntegrationsStore.getState();
			const prevTokens = useIntegrationsStore.getState().ai.tokensToday;
			const prevSpend = useIntegrationsStore.getState().ai.currentSpendUSD;
			const prevRequests = useIntegrationsStore.getState().ai.totalRequests;

			recordAiUsage(1500, 0.03);

			const current = useIntegrationsStore.getState().ai;
			expect(current.tokensToday).toBe(prevTokens + 1500);
			expect(current.currentSpendUSD).toBeCloseTo(prevSpend + 0.03, 2);
			expect(current.totalRequests).toBe(prevRequests + 1);
		});
	});

	// =========================================================================
	// 2. COMPONENTE FinOpsMetricsPanel: UI, FILTROS Y MÉTRICAS DINÁMICAS
	// =========================================================================
	describe("2. Componente FinOpsMetricsPanel: UI y Filtros Temporales", () => {
		it("renderiza la barra de filtros temporales con los 5 botones requeridos", () => {
			render(React.createElement(FinOpsMetricsPanel));

			expect(screen.getByRole("button", { name: "Día (Hoy)" })).toBeDefined();
			expect(
				screen.getByRole("button", { name: "Semana (7 días)" }),
			).toBeDefined();
			expect(screen.getByRole("button", { name: "15 días" })).toBeDefined();
			expect(
				screen.getByRole("button", { name: "1 mes (30 días)" }),
			).toBeDefined();
			expect(screen.getByRole("button", { name: "Intervalos" })).toBeDefined();
		});

		it("muestra inputs de fecha Desde y Hasta al seleccionar el filtro 'Intervalos'", () => {
			render(React.createElement(FinOpsMetricsPanel));

			const intervalosBtn = screen.getByRole("button", { name: "Intervalos" });
			fireEvent.click(intervalosBtn);

			expect(screen.getByText("Rango personalizado:")).toBeDefined();
			expect(screen.getByText("Desde:")).toBeDefined();
			expect(screen.getByText("Hasta:")).toBeDefined();
			expect(screen.getByRole("button", { name: "Aplicar Rango" })).toBeDefined();
		});

		it("renderiza las tarjetas de métricas FinOps calculadas dinámicamente", () => {
			render(React.createElement(FinOpsMetricsPanel));

			expect(screen.getByText("Presupuesto Mensual")).toBeDefined();
			expect(screen.getByText("Usos / Solicitudes")).toBeDefined();
			expect(screen.getByText("Tokens Usados")).toBeDefined();
			expect(screen.getByText("Throughput (TPS)")).toBeDefined();
			expect(screen.getByText("Rendimiento Latencia")).toBeDefined();
		});

		it("recalcula las métricas y el desglose de gráfico al alternar entre filtros temporales", () => {
			render(React.createElement(FinOpsMetricsPanel));

			// Por defecto está en 'dia'
			const semanaBtn = screen.getByRole("button", { name: "Semana (7 días)" });
			fireEvent.click(semanaBtn);

			// El store y el componente deben reflejar el cambio a semana
			expect(useIntegrationsStore.getState().ai.timeFilter).toBe("semana");
			expect(
				screen.getAllByText(/Semana \(Últimos 7 días\)/i).length,
			).toBeGreaterThan(0);

			// Cambiar a 15 días
			const quincenaBtn = screen.getByRole("button", { name: "15 días" });
			fireEvent.click(quincenaBtn);
			expect(useIntegrationsStore.getState().ai.timeFilter).toBe("15dias");
			expect(screen.getAllByText(/Quincena \(15 días\)/i).length).toBeGreaterThan(
				0,
			);

			// Cambiar a 1 mes
			const mesBtn = screen.getByRole("button", { name: "1 mes (30 días)" });
			fireEvent.click(mesBtn);
			expect(useIntegrationsStore.getState().ai.timeFilter).toBe("1mes");
			expect(screen.getAllByText(/Mes \(30 días\)/i).length).toBeGreaterThan(0);
		});
	});

	// =========================================================================
	// 3. CONFIGURACIÓN MULTI-PROVEEDOR Y CATÁLOGO DINÁMICO DE MODELOS
	// =========================================================================
	describe("3. Configuración Multi-Proveedor LLM en FinOpsMetricsPanel", () => {
		it("muestra los 4 proveedores oficiales: Google Gemini, Groq Cloud, Opencode Zen, Nvidia NIM", () => {
			render(React.createElement(FinOpsMetricsPanel));

			expect(
				screen.getByRole("button", { name: /Google Gemini/i }),
			).toBeDefined();
			expect(screen.getByRole("button", { name: /Groq Cloud/i })).toBeDefined();
			expect(
				screen.getByRole("button", { name: /Opencode Zen/i }),
			).toBeDefined();
			expect(screen.getByRole("button", { name: /Nvidia NIM/i })).toBeDefined();
		});

		it("actualiza dinámicamente los modelos del selector según el proveedor seleccionado", () => {
			render(React.createElement(FinOpsMetricsPanel));

			const selectEl = screen.getByRole("combobox") as HTMLSelectElement;

			// Inicialmente con Google
			const googleOptions = Array.from(selectEl.options).map((o) => o.value);
			expect(googleOptions).toEqual(AI_MODELS_BY_PROVIDER.google);

			// Cambiar a Groq
			const groqBtn = screen.getByRole("button", { name: /Groq Cloud/i });
			fireEvent.click(groqBtn);

			const groqOptions = Array.from(selectEl.options).map((o) => o.value);
			expect(groqOptions).toEqual(AI_MODELS_BY_PROVIDER.groq);

			// Cambiar a Opencode Zen
			const zenBtn = screen.getByRole("button", { name: /Opencode Zen/i });
			fireEvent.click(zenBtn);

			const zenOptions = Array.from(selectEl.options).map((o) => o.value);
			expect(zenOptions).toEqual(AI_MODELS_BY_PROVIDER.opencode_zen);

			// Cambiar a Nvidia
			const nvidiaBtn = screen.getByRole("button", { name: /Nvidia NIM/i });
			fireEvent.click(nvidiaBtn);

			const nvidiaOptions = Array.from(selectEl.options).map((o) => o.value);
			expect(nvidiaOptions).toEqual(AI_MODELS_BY_PROVIDER.nvidia);
		});

		it("permite verificar la conexión de API Key y muestra retroalimentación visual", () => {
			render(React.createElement(FinOpsMetricsPanel));

			const testBtn = screen.getByRole("button", {
				name: "Probar Conexión",
			});

			// Caso 1: API Key vacía
			const inputKey = screen.getByPlaceholderText(
				/Ingresa tu API Key para/i,
			) as HTMLInputElement;
			fireEvent.change(inputKey, { target: { value: "" } });
			fireEvent.click(testBtn);

			expect(
				screen.getByText(
					"Por favor ingresa una API Key válida para probar la conexión.",
				),
			).toBeDefined();

			// Caso 2: API Key válida provista
			fireEvent.change(inputKey, { target: { value: "AIzaSy_demo_key_valida" } });
			fireEvent.click(testBtn);

			expect(screen.getByText("Verificando...")).toBeDefined();
		});

		it("guarda la configuración FinOps actualizada en el store", () => {
			render(React.createElement(FinOpsMetricsPanel));

			// Seleccionamos Groq
			const groqBtn = screen.getByRole("button", { name: /Groq Cloud/i });
			fireEvent.click(groqBtn);

			const inputKey = screen.getByPlaceholderText(
				/Ingresa tu API Key para/i,
			) as HTMLInputElement;
			fireEvent.change(inputKey, {
				target: { value: "gsk_finops_guardado_test" },
			});

			const budgetInput = screen.getByLabelText(
				"Presupuesto Máximo Mensual (USD)",
			) as HTMLInputElement;
			fireEvent.change(budgetInput, { target: { value: "350" } });

			const saveBtn = screen.getByRole("button", {
				name: /Guardar Configuración FinOps/i,
			});
			fireEvent.click(saveBtn);

			// Verificamos actualización en store
			const state = useIntegrationsStore.getState().ai;
			expect(state.provider).toBe("groq");
			expect(state.groqApiKey).toBe("gsk_finops_guardado_test");
			expect(state.monthlyBudgetUSD).toBe(350);
			expect(
				screen.getByText("Configuración FinOps guardada con éxito"),
			).toBeDefined();
		});
	});

	// =========================================================================
	// 4. LIMPIEZA TOTAL: CERO OPENAI Y CERO PGVECTOR EN FINOPS
	// =========================================================================
	describe("4. Erradicación total de OpenAI y pgvector en FinOpsMetricsPanel", () => {
		const filePath = path.resolve(
			process.cwd(),
			"src/components/FinOpsMetricsPanel.tsx",
		);

		it("el archivo FinOpsMetricsPanel.tsx existe y no contiene 'openai' ni 'pgvector'", () => {
			expect(fs.existsSync(filePath)).toBe(true);
			const content = fs.readFileSync(filePath, "utf-8");

			expect(content.toLowerCase()).not.toContain("openai");
			expect(content.toLowerCase()).not.toContain("pgvector");
			expect(content).not.toContain("768d");
		});

		it("el DOM de FinOpsMetricsPanel no contiene mención a OpenAI ni pgvector", () => {
			const { container } = render(React.createElement(FinOpsMetricsPanel));
			const html = container.innerHTML.toLowerCase();

			expect(html).not.toContain("openai");
			expect(html).not.toContain("pgvector");
			expect(html).not.toContain("768d");
		});
	});
});
