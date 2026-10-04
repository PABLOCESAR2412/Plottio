// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FinOpsMetricsPanel } from "../src/components/FinOpsMetricsPanel";
import {
	type BusinessDataContext,
	executeLiveBusinessAgent,
} from "../src/services/plottioAgent";
import {
	AI_MODELS_BY_PROVIDER,
	useIntegrationsStore,
} from "../src/store/useIntegrationsStore";

describe("Tarea 37 (P1 - Fase 7): Respaldo Multi-Proveedor (Fallback Chaining) y Catálogo de Modelos Recomendados por Costo/Velocidad", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		localStorage.clear();
		useIntegrationsStore.setState(useIntegrationsStore.getInitialState(), true);
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
		localStorage.clear();
	});

	const sampleBusinessData: BusinessDataContext = {
		empresas: [
			{
				id: "emp-1",
				nombre: "Plottio Publicidad Gráfica",
				ruc: "1790011223001",
				telefono: "0991234567",
				activa: true,
			},
		],
		clientes: [
			{
				id: "cli-1",
				nombre: "Distribuidora Los Andes",
				identificacion: "1720098765",
				telefono: "0987654321",
			},
		],
		ordenes: [
			{
				id: "OT-501",
				placa: "PBX-8899",
				clienteNombre: "Distribuidora Los Andes",
				estado: "En Producción",
			},
		],
		inventario: [
			{
				id: "inv-1",
				nombre: "Vinilo Fundición 3M IJ180",
				stock: 45,
				unidad: "metros",
			},
		],
		vehiculos: [
			{
				id: "veh-1",
				placa: "PBX-8899",
				marca: "Chevrolet",
				modelo: "D-Max",
			},
		],
	};

	// =========================================================================
	// 1. CATÁLOGO RECOMENDADO POR COSTO Y VELOCIDAD
	// =========================================================================
	describe("1. Catálogo de modelos probados y recomendados por costo/rapidez", () => {
		it("AI_MODELS_BY_PROVIDER contiene los 4 proveedores con modelos curados y etiquetas recomendadas", () => {
			expect(Object.keys(AI_MODELS_BY_PROVIDER)).toEqual([
				"google",
				"groq",
				"opencode_zen",
				"nvidia",
			]);

			// Google: modelos Flash optimizados
			expect(AI_MODELS_BY_PROVIDER.google).toEqual([
				"Gemini 3.8 Flash (Recomendado · Rápido y Económico)",
				"Gemini 3.7 Flash",
				"Gemini Flash Lite",
				"Gemini Flash Latest",
			]);

			// Groq: inferencia ultra-rápida Llama y Mixtral
			expect(AI_MODELS_BY_PROVIDER.groq).toEqual([
				"Llama 3.3 70B Versatile (Recomendado · Alto Rendimiento)",
				"Llama 3.1 8B Instant (Ultra Rápido y Económico)",
				"Mixtral 8x7B",
			]);

			// Opencode Zen: modelos económicos y de código
			expect(AI_MODELS_BY_PROVIDER.opencode_zen).toEqual([
				"DeepSeek V3 (Recomendado · Económico)",
				"Qwen 2.5 Coder 32B",
			]);

			// Nvidia NIM: microservicios GPU
			expect(AI_MODELS_BY_PROVIDER.nvidia).toEqual([
				"Llama 3.1 Nemotron 70B (Recomendado)",
				"Mistral NeMo 12B (Económico)",
			]);
		});
	});

	// =========================================================================
	// 2. STORE: BACKUP PROVIDER & MODEL
	// =========================================================================
	describe("2. Estado y persistencia en useIntegrationsStore", () => {
		it("inicia con backupProvider y backupModel en null por defecto", () => {
			const { ai } = useIntegrationsStore.getState();
			expect(ai.backupProvider).toBeNull();
			expect(ai.backupModel).toBeNull();
			expect(ai.activeModel).toBe(
				"Gemini 3.8 Flash (Recomendado · Rápido y Económico)",
			);
		});

		it("permite actualizar y persistir backupProvider y backupModel", () => {
			const { updateAiConfig } = useIntegrationsStore.getState();

			updateAiConfig({
				backupProvider: "groq",
				backupModel: "Llama 3.1 8B Instant (Ultra Rápido y Económico)",
			});

			const { ai } = useIntegrationsStore.getState();
			expect(ai.backupProvider).toBe("groq");
			expect(ai.backupModel).toBe(
				"Llama 3.1 8B Instant (Ultra Rápido y Económico)",
			);
		});
	});

	// =========================================================================
	// 3. COMPONENTE VISUAL FINOPS: TARJETA DE RESPALDO REACTIVA
	// =========================================================================
	describe("3. Panel FinOpsMetricsPanel: Sección de Respaldo de Inferencia", () => {
		it("muestra aviso explicativo amigable si no hay otro proveedor con API Key ingresada", () => {
			render(React.createElement(FinOpsMetricsPanel));

			expect(
				screen.getByText(/Respaldo de Inferencia \(Fallback Multi-Proveedor\)/i),
			).toBeDefined();

			expect(
				screen.getByText(
					/Para habilitar conmutación automática de respaldo ante fallos o demoras de Google Gemini/i,
				),
			).toBeDefined();
		});

		it("al ingresar API Key para un segundo proveedor, muestra selector de respaldo filtrado", () => {
			const { updateAiConfig } = useIntegrationsStore.getState();
			// Configuramos API key para Google (principal) y Groq (candidato a respaldo)
			updateAiConfig({
				provider: "google",
				googleApiKey: "AIzaSy_fake_google_key",
				groqApiKey: "gsk_fake_groq_key",
			});

			render(React.createElement(FinOpsMetricsPanel));

			// Ya no muestra el aviso de falta de keys
			expect(
				screen.queryByText(/Para habilitar conmutación automática de respaldo/i),
			).toBeNull();

			// Muestra el selector de respaldo
			const backupSelect = screen.getByLabelText(
				/Proveedor de Respaldo/i,
			) as HTMLSelectElement;
			expect(backupSelect).toBeDefined();

			// Opciones del select: "Sin respaldo" y únicamente los configurados distintos a Google
			const options = Array.from(backupSelect.options).map((o) => o.value);
			expect(options).toContain("");
			expect(options).toContain("groq");
			expect(options).not.toContain("google"); // Google es el principal activo
		});

		it("al seleccionar proveedor de respaldo, muestra selector de modelos recomendados y guarda en store", () => {
			const { updateAiConfig } = useIntegrationsStore.getState();
			updateAiConfig({
				provider: "google",
				googleApiKey: "AIzaSy_fake_google_key",
				groqApiKey: "gsk_fake_groq_key",
			});

			render(React.createElement(FinOpsMetricsPanel));

			const backupSelect = screen.getByLabelText(
				/Proveedor de Respaldo/i,
			) as HTMLSelectElement;

			// Seleccionar Groq como respaldo
			fireEvent.change(backupSelect, { target: { value: "groq" } });

			// Ahora debe aparecer el selector de modelo de respaldo
			const modelSelect = screen.getByLabelText(
				/Modelo de Respaldo \(GROQ\)/i,
			) as HTMLSelectElement;
			expect(modelSelect).toBeDefined();

			const groqModelOptions = Array.from(modelSelect.options).map((o) => o.value);
			expect(groqModelOptions).toEqual(AI_MODELS_BY_PROVIDER.groq);

			// Guardar la configuración
			const saveBtn = screen.getByRole("button", {
				name: /Guardar Configuración FinOps/i,
			});
			fireEvent.click(saveBtn);

			const savedAi = useIntegrationsStore.getState().ai;
			expect(savedAi.backupProvider).toBe("groq");
			expect(savedAi.backupModel).toBe(
				"Llama 3.3 70B Versatile (Recomendado · Alto Rendimiento)",
			);
		});
	});

	// =========================================================================
	// 4. FALLBACK CHAINING EN executeLiveBusinessAgent
	// =========================================================================
	describe("4. Conmutación automática a proveedor de respaldo en executeLiveBusinessAgent", () => {
		it("conmuta a Groq con telemetría de respaldo si Google falla con HTTP 503", async () => {
			const mockFetch = vi
				.fn()
				// Intento 1 con Google: 503
				.mockResolvedValueOnce({
					ok: false,
					status: 503,
					statusText: "Service Unavailable",
				})
				// Reintentos de Google (fallback candidates): 503
				.mockResolvedValueOnce({
					ok: false,
					status: 503,
					statusText: "Service Unavailable",
				})
				.mockResolvedValueOnce({
					ok: false,
					status: 503,
					statusText: "Service Unavailable",
				})
				.mockResolvedValueOnce({
					ok: false,
					status: 503,
					statusText: "Service Unavailable",
				})
				// Llamada al proveedor de respaldo (Groq): 200 OK
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => ({
						choices: [
							{
								message: {
									content:
										"Respuesta generada exitosamente por el respaldo Groq Cloud tras fallo de Google.",
								},
							},
						],
						usage: {
							prompt_tokens: 150,
							completion_tokens: 35,
							total_tokens: 185,
						},
					}),
				});
			vi.stubGlobal("fetch", mockFetch);

			const result = await executeLiveBusinessAgent("Órdenes activas en taller", {
				assistantName: "Plottio Asistente",
				apiKey: "AIzaSy_google_primary",
				provider: "google",
				model: "gemini-3.8-flash",
				backupProvider: "groq",
				backupApiKey: "gsk_groq_backup",
				backupModel: "Llama 3.3 70B Versatile (Recomendado · Alto Rendimiento)",
				businessData: sampleBusinessData,
			});

			expect(result.allowed).toBe(true);
			// Aviso de respaldo prefijado en la respuesta
			expect(result.response).toContain(
				"(Aviso: Respuesta generada por el proveedor de respaldo Groq Cloud debido a congestión temporal en Google Gemini.)",
			);
			expect(result.response).toContain(
				"Respuesta generada exitosamente por el respaldo Groq Cloud tras fallo de Google.",
			);

			// Telemetría técnica
			expect(result.telemetry).toBeDefined();
			expect(result.telemetry?.provider).toBe(
				"Groq Cloud (Respaldo por falla en Google Gemini)",
			);
			expect(result.telemetry?.model).toBe(
				"Llama 3.3 70B Versatile (Recomendado · Alto Rendimiento)",
			);
			expect(result.telemetry?.totalTokens).toBe(185);
		});

		it("conmuta a Google si Groq (principal) arroja error de servidor y Google es el respaldo", async () => {
			const mockFetch = vi
				.fn()
				// Groq arroja error 500
				.mockResolvedValueOnce({
					ok: false,
					status: 500,
					statusText: "Internal Server Error",
				})
				// Google responde 200 OK
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => ({
						candidates: [
							{
								content: {
									parts: [
										{
											text: "Respuesta de respaldo proveniente de Google Gemini.",
										},
									],
								},
							},
						],
						usageMetadata: {
							promptTokenCount: 120,
							candidatesTokenCount: 30,
							totalTokenCount: 150,
						},
					}),
				});
			vi.stubGlobal("fetch", mockFetch);

			const result = await executeLiveBusinessAgent("Inventario de vinilos", {
				assistantName: "Plottio Asistente",
				apiKey: "gsk_primary_groq",
				provider: "groq",
				model: "llama-3.3-70b-versatile",
				backupProvider: "google",
				backupApiKey: "AIzaSy_backup_google",
				backupModel: "Gemini 3.8 Flash (Recomendado · Rápido y Económico)",
				businessData: sampleBusinessData,
			});

			expect(result.allowed).toBe(true);
			expect(result.response).toContain(
				"(Aviso: Respuesta generada por el proveedor de respaldo Google Gemini debido a congestión temporal en Groq Cloud.)",
			);
			expect(result.response).toContain(
				"Respuesta de respaldo proveniente de Google Gemini.",
			);
			expect(result.telemetry?.provider).toBe(
				"Google Gemini (Respaldo por falla en Groq Cloud)",
			);
		});

		it("ante caída de red/timeout del proveedor principal, conmuta a respaldo de Nvidia NIM", async () => {
			const mockFetch = vi
				.fn()
				// Fallo de red en Groq
				.mockRejectedValueOnce(new Error("Network timeout"))
				// Nvidia NIM responde 200 OK
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => ({
						choices: [
							{
								message: {
									content: "Respuesta generada por Nvidia NIM.",
								},
							},
						],
					}),
				});
			vi.stubGlobal("fetch", mockFetch);

			const result = await executeLiveBusinessAgent("Vehículos de clientes", {
				assistantName: "Plottio Asistente",
				apiKey: "gsk_primary_key",
				provider: "groq",
				backupProvider: "nvidia",
				backupApiKey: "nvapi_backup_key",
				businessData: sampleBusinessData,
			});

			expect(result.allowed).toBe(true);
			expect(result.response).toContain(
				"(Aviso: Respuesta generada por el proveedor de respaldo Nvidia NIM debido a congestión temporal en Groq Cloud.)",
			);
			expect(result.telemetry?.provider).toBe(
				"Nvidia NIM (Respaldo por falla en Groq Cloud)",
			);
		});

		it("si tanto el proveedor principal como el de respaldo fallan, degrada a datos locales sin crashear", async () => {
			const mockFetch = vi
				.fn()
				// Google principal falla 503
				.mockResolvedValue({
					ok: false,
					status: 503,
					statusText: "Service Unavailable",
				});
			vi.stubGlobal("fetch", mockFetch);

			const result = await executeLiveBusinessAgent("Empresas registradas", {
				assistantName: "Plottio Asistente",
				apiKey: "AIzaSy_google_key",
				provider: "google",
				backupProvider: "groq",
				backupApiKey: "gsk_groq_key",
				businessData: sampleBusinessData,
			});

			// No debe crashear ni arrojar error no capturado
			expect(result.allowed).toBe(true);
			// Responde con datos reales de la BD
			expect(result.response).toContain("Plottio Publicidad Gráfica");
			expect(result.response).toContain("1790011223001");
			expect(result.telemetry).toBeDefined();
		});
	});
});
