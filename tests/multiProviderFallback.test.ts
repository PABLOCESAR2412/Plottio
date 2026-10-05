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
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: false,
				status: 404,
				json: async () => ({}),
			}),
		);
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
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
		}, 15000);
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

		it("conecta con OpenCode Zen en https://opencode.ai/zen/v1/chat/completions con modelo OpenAI compatible", async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({
					choices: [
						{
							message: {
								content: "Respuesta generada por OpenCode Zen DeepSeek V3.",
							},
						},
					],
					usage: {
						prompt_tokens: 45,
						completion_tokens: 30,
						total_tokens: 75,
					},
				}),
			});
			vi.stubGlobal("fetch", mockFetch);

			const result = await executeLiveBusinessAgent("Consulta técnica", {
				assistantName: "Plottio Asistente",
				apiKey: "zen_api_key_valid",
				provider: "opencode_zen",
				model: "deepseek-ai/deepseek-v3",
				businessData: sampleBusinessData,
			});

			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringMatching(
					/(\/api\/opencode|https:\/\/opencode\.ai\/zen\/v1\/chat\/completions)/,
				),
				expect.objectContaining({
					method: "POST",
					headers: expect.objectContaining({
						Authorization: "Bearer zen_api_key_valid",
					}),
				}),
			);
			expect(result.allowed).toBe(true);
			expect(result.response).toContain("Respuesta generada por OpenCode Zen DeepSeek V3.");
			expect(result.telemetry?.provider).toBe("Opencode Zen");
		});
	});

	// =========================================================================
	// 5. TAREA 39 (P0 - FASE 8): SELECCIÓN MÚLTIPLE DE RESPALDOS (MULTI-BACKUP FALLBACK CHAINING)
	// =========================================================================
	describe("5. Tarea 39: Selección Múltiple de Respaldos (Multi-Backup Fallback Chaining)", () => {
		it("el store inicia con backupTargets: [] y sincroniza bidireccionalmente con backupProvider/backupModel", () => {
			const { ai, updateAiConfig } = useIntegrationsStore.getState();
			expect(ai.backupTargets).toEqual([]);

			// Al configurar múltiples respaldos
			updateAiConfig({
				backupTargets: [
					{
						provider: "groq",
						model: "Llama 3.3 70B Versatile (Recomendado · Alto Rendimiento)",
					},
					{
						provider: "nvidia",
						model: "Llama 3.1 Nemotron 70B (Recomendado)",
					},
					{
						provider: "opencode_zen",
						model: "DeepSeek V3 (Recomendado · Económico)",
					},
				],
			});

			const updated = useIntegrationsStore.getState().ai;
			expect(updated.backupTargets.length).toBe(3);
			expect(updated.backupTargets[0].provider).toBe("groq");
			expect(updated.backupTargets[1].provider).toBe("nvidia");
			expect(updated.backupTargets[2].provider).toBe("opencode_zen");

			// Compatibilidad: backupProvider y backupModel se sincronizan con el primer target
			expect(updated.backupProvider).toBe("groq");
			expect(updated.backupModel).toBe(
				"Llama 3.3 70B Versatile (Recomendado · Alto Rendimiento)",
			);

			// Al vaciar los respaldos
			updateAiConfig({ backupTargets: [] });
			const cleared = useIntegrationsStore.getState().ai;
			expect(cleared.backupTargets).toEqual([]);
			expect(cleared.backupProvider).toBeNull();
			expect(cleared.backupModel).toBeNull();
		});

		it("FinOpsMetricsPanel permite agregar múltiples proveedores a la cadena y guardarlos en el store", () => {
			const { updateAiConfig } = useIntegrationsStore.getState();
			updateAiConfig({
				provider: "google",
				googleApiKey: "AIzaSy_primary_key",
				groqApiKey: "gsk_groq_key",
				nvidiaApiKey: "nvapi_nvidia_key",
				opencodeZenApiKey: "zen_opencode_key",
			});

			render(React.createElement(FinOpsMetricsPanel));

			// Resumen inicial
			expect(
				screen.getByText(/Cadena de Respaldo Activa:/i),
			).toBeDefined();

			// Agregar Groq como respaldo inicial
			const backupSelect = screen.getByLabelText(
				/Proveedor de Respaldo/i,
			) as HTMLSelectElement;
			fireEvent.change(backupSelect, { target: { value: "groq" } });

			// Ahora debe verse el botón para agregar Nvidia NIM a la cadena
			const addNvidiaBtn = screen.getByRole("button", {
				name: /Agregar Nvidia NIM a Respaldos/i,
			});
			expect(addNvidiaBtn).toBeDefined();
			fireEvent.click(addNvidiaBtn);

			// Verificar que aparecen los escalones de Respaldo #1 y Respaldo #2
			expect(screen.getByText("Respaldo #1")).toBeDefined();
			expect(screen.getByText("Respaldo #2")).toBeDefined();

			// Guardar configuración FinOps
			const saveBtn = screen.getByRole("button", {
				name: /Guardar Configuración FinOps/i,
			});
			fireEvent.click(saveBtn);

			const savedAi = useIntegrationsStore.getState().ai;
			expect(savedAi.backupTargets.length).toBe(2);
			expect(savedAi.backupTargets[0].provider).toBe("groq");
			expect(savedAi.backupTargets[1].provider).toBe("nvidia");
			expect(savedAi.backupProvider).toBe("groq");
		});

		it("FinOpsMetricsPanel permite reordenar la prioridad y remover un respaldo de la cadena", () => {
			const { updateAiConfig } = useIntegrationsStore.getState();
			updateAiConfig({
				provider: "google",
				googleApiKey: "AIzaSy_primary_key",
				groqApiKey: "gsk_groq_key",
				nvidiaApiKey: "nvapi_nvidia_key",
				backupTargets: [
					{
						provider: "groq",
						model: "Llama 3.3 70B Versatile (Recomendado · Alto Rendimiento)",
					},
					{
						provider: "nvidia",
						model: "Llama 3.1 Nemotron 70B (Recomendado)",
					},
				],
			});

			render(React.createElement(FinOpsMetricsPanel));

			// Reordenar: Bajar prioridad de Groq
			const bajarGroqBtn = screen.getByRole("button", {
				name: /Bajar prioridad de Groq Cloud/i,
			});
			fireEvent.click(bajarGroqBtn);

			// Ahora Nvidia es el #1 y Groq es el #2
			const saveBtn = screen.getByRole("button", {
				name: /Guardar Configuración FinOps/i,
			});
			fireEvent.click(saveBtn);

			let savedAi = useIntegrationsStore.getState().ai;
			expect(savedAi.backupTargets[0].provider).toBe("nvidia");
			expect(savedAi.backupTargets[1].provider).toBe("groq");

			// Remover Groq de la cadena
			const quitarGroqBtn = screen.getByRole("button", {
				name: /Quitar Groq Cloud de respaldos/i,
			});
			fireEvent.click(quitarGroqBtn);

			fireEvent.click(saveBtn);
			savedAi = useIntegrationsStore.getState().ai;
			expect(savedAi.backupTargets.length).toBe(1);
			expect(savedAi.backupTargets[0].provider).toBe("nvidia");
		});

		it("executeLiveBusinessAgent conmuta al respaldo #2 si el primario y el respaldo #1 fallan", async () => {
			const mockFetch = vi
				.fn()
				// Proveedor principal (Google): 503
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
				// Respaldo #1 (Groq): Falla con HTTP 429 Too Many Requests
				.mockResolvedValueOnce({
					ok: false,
					status: 429,
					statusText: "Too Many Requests",
				})
				// Respaldo #2 (Nvidia NIM): 200 OK con respuesta generada
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => ({
						choices: [
							{
								message: {
									content:
										"Respuesta exitosa generada por el respaldo #2 (Nvidia NIM).",
								},
							},
						],
						usage: {
							prompt_tokens: 110,
							completion_tokens: 40,
							total_tokens: 150,
						},
					}),
				});
			vi.stubGlobal("fetch", mockFetch);

			const result = await executeLiveBusinessAgent("Consulta operacional de flota", {
				assistantName: "Plottio Asistente",
				apiKey: "AIzaSy_primary_key",
				provider: "google",
				backupTargets: [
					{
						provider: "groq",
						model: "Llama 3.3 70B Versatile",
						apiKey: "gsk_groq_key",
					},
					{
						provider: "nvidia",
						model: "Llama 3.1 Nemotron 70B",
						apiKey: "nvapi_nvidia_key",
					},
				],
				businessData: sampleBusinessData,
			});

			expect(result.allowed).toBe(true);
			expect(result.response).toContain(
				"(Aviso: Respuesta generada por el proveedor de respaldo Nvidia NIM debido a congestión temporal en Google Gemini.)",
			);
			expect(result.response).toContain(
				"Respuesta exitosa generada por el respaldo #2 (Nvidia NIM).",
			);
			expect(result.telemetry?.provider).toBe(
				"Nvidia NIM (Respaldo #2 por falla en Google Gemini)",
			);
		});

		it("executeLiveBusinessAgent degrada de forma segura a datos deterministas si TODOS los respaldos de la cadena fallan", async () => {
			const mockFetch = vi
				.fn()
				// Proveedor principal (Groq): 500
				.mockResolvedValueOnce({
					ok: false,
					status: 500,
					statusText: "Internal Server Error",
				})
				// Respaldo #1 (Nvidia): 503
				.mockResolvedValueOnce({
					ok: false,
					status: 503,
					statusText: "Service Unavailable",
				})
				// Respaldo #2 (Opencode Zen): Error de red
				.mockRejectedValueOnce(new Error("Network connection failure"));
			vi.stubGlobal("fetch", mockFetch);

			const result = await executeLiveBusinessAgent("Vehículos de flota activos", {
				assistantName: "Plottio Asistente",
				apiKey: "gsk_primary_key",
				provider: "groq",
				backupTargets: [
					{
						provider: "nvidia",
						model: "Llama 3.1 Nemotron 70B",
						apiKey: "nvapi_nvidia_key",
					},
					{
						provider: "opencode_zen",
						model: "DeepSeek V3",
						apiKey: "zen_key",
					},
				],
				businessData: sampleBusinessData,
			});

			// No debe crashear
			expect(result.allowed).toBe(true);
			// Responde con los datos reales de la BD
			expect(result.response).toContain("PBX-8899");
			expect(result.response).toContain("Chevrolet");
		});
	});
});
