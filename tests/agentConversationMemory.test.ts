// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlottioAsistenteView } from "../src/components/PlottioAsistenteView";
import {
	type AgentHistoryTurn,
	buildAgentHistoryTurns,
	type BusinessDataContext,
	executeLiveBusinessAgent,
} from "../src/services/plottioAgent";
import { useIntegrationsStore } from "../src/store/useIntegrationsStore";
import { useSessionStore } from "../src/store/useSessionStore";

// Mock de Convex
vi.mock("convex/react", () => {
	const mockResult: any = [];
	mockResult.valida = true;
	return {
		useQuery: vi.fn().mockImplementation(() => mockResult),
		useMutation: vi.fn().mockReturnValue(vi.fn()),
		useAction: vi.fn().mockReturnValue(vi.fn()),
	};
});

describe("Tarea 43 (P1 - Fase 9): Memoria conversacional del agente live (seguimientos contextuales)", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		localStorage.clear();
		useIntegrationsStore.setState(useIntegrationsStore.getInitialState(), true);
		useSessionStore.setState({
			currentUser: {
				id: "usr-admin-1",
				nombre: "Admin Taller",
				email: "admin@plottio.com",
				rol: "SuperAdmin",
				empresaId: "emp-1",
				activo: true,
			},
		});
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
				id: "cli-juan",
				nombre: "Juan Pérez",
				identificacion: "1712345678",
				telefono: "0998887777",
			},
		],
		ordenes: [],
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
				placa: "PBX-1234",
				marca: "Chevrolet",
				modelo: "D-Max",
			},
		],
	};

	const buildTurns = (n: number): AgentHistoryTurn[] =>
		Array.from({ length: n }, (_, i) => ({
			role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
			text: `Turno previo ${i + 1}`,
		}));

	// =========================================================================
	// 1. RECORTE Y VALIDACIÓN DEL HISTORIAL (buildAgentHistoryTurns)
	// =========================================================================
	describe("1. buildAgentHistoryTurns: recorte a 8 turnos y validación", () => {
		it("recorta el historial a los últimos 8 turnos preservando el orden", () => {
			const trimmed = buildAgentHistoryTurns(buildTurns(12));

			expect(trimmed).toHaveLength(8);
			expect(trimmed[0]).toEqual({ role: "user", text: "Turno previo 5" });
			expect(trimmed[1]).toEqual({ role: "assistant", text: "Turno previo 6" });
			expect(trimmed[7]).toEqual({ role: "assistant", text: "Turno previo 12" });
		});

		it("filtra turnos inválidos o con texto vacío antes de recortar", () => {
			const withInvalid: AgentHistoryTurn[] = [
				{ role: "user", text: "   " },
				{ role: "assistant", text: "" },
				{ role: "user", text: "Consulta válida previa" },
				...buildTurns(10),
			];

			const cleaned = buildAgentHistoryTurns(withInvalid);

			expect(cleaned).toHaveLength(8);
			expect(
				cleaned.some((t) => typeof t.text !== "string" || t.text.trim() === ""),
			).toBe(false);
			expect(cleaned.some((t) => t.text === "Consulta válida previa")).toBe(
				false,
			);
		});

		it("retorna array vacío con historial undefined o vacío (comportamiento sin memoria)", () => {
			expect(buildAgentHistoryTurns(undefined)).toEqual([]);
			expect(buildAgentHistoryTurns([])).toEqual([]);
		});
	});

	// =========================================================================
	// 2. PAYLOAD DE PROVEEDOR CON HISTORIAL (executeLiveBusinessAgent)
	// =========================================================================
	describe("2. El payload del proveedor incluye el historial recortado en orden correcto", () => {
		it("Gemini: contents con los últimos 8 turnos alternando roles y el turno actual al final", async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({
					candidates: [
						{
							content: {
								parts: [{ text: "Respuesta con memoria conversacional." }],
							},
						},
					],
					usageMetadata: {
						promptTokenCount: 90,
						candidatesTokenCount: 12,
						totalTokenCount: 102,
					},
				}),
			});
			vi.stubGlobal("fetch", mockFetch);

			const result = await executeLiveBusinessAgent("¿y sus teléfonos?", {
				assistantName: "Plottio Asistente",
				apiKey: "AQ.test_key",
				provider: "google",
				model: "gemini-3.8-flash",
				history: buildTurns(12),
				businessData: sampleBusinessData,
			});

			expect(result.allowed).toBe(true);
			expect(result.response).toContain("Respuesta con memoria conversacional.");
			expect(mockFetch).toHaveBeenCalledTimes(1);

			const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
			// 8 turnos de historial + 1 turno actual
			expect(body.contents).toHaveLength(9);
			// Recorte: se descartan los primeros 4 turnos y se envían los últimos 8 en orden
			expect(body.contents[0].parts[0].text).toBe("Turno previo 5");
			expect(body.contents[7].parts[0].text).toBe("Turno previo 12");
			// Alternancia correcta de roles user/model (semántica de la API de Gemini)
			body.contents.forEach((content: { role: string }, i: number) => {
				expect(content.role).toBe(i % 2 === 0 ? "user" : "model");
			});
			// El mensaje en curso va como último turno user, nunca como historial
			expect(body.contents[8]).toEqual({
				role: "user",
				parts: [{ text: "¿y sus teléfonos?" }],
			});
			// system_instruction intacto con historial presente
			expect(body.system_instruction).toEqual({
				parts: [{ text: expect.stringContaining("BASE DE DATOS REAL DEL TALLER") }],
			});
		});

		it("OpenAI-compatible: messages con el historial antes del turno actual y consulta no duplicada", async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({
					choices: [
						{
							message: {
								content: "Los teléfonos de Juan Pérez son 0998887777.",
							},
						},
					],
					usage: {
						prompt_tokens: 80,
						completion_tokens: 10,
						total_tokens: 90,
					},
				}),
			});
			vi.stubGlobal("fetch", mockFetch);

			const result = await executeLiveBusinessAgent("¿y sus teléfonos?", {
				assistantName: "Plottio Asistente",
				apiKey: "gsk_test_key",
				provider: "groq",
				model: "llama-3.1-8b-instant",
				history: buildTurns(10),
				businessData: sampleBusinessData,
			});

			expect(result.allowed).toBe(true);
			expect(result.response).toContain(
				"Los teléfonos de Juan Pérez son 0998887777.",
			);
			expect(mockFetch).toHaveBeenCalledTimes(1);

			const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
			// system + 8 turnos de historial + turno actual
			expect(body.messages).toHaveLength(10);
			expect(body.messages[0].role).toBe("system");
			// Recorte: primeros 2 turnos descartados, se envían los últimos 8 en orden
			expect(body.messages[1]).toEqual({
				role: "user",
				content: "Turno previo 3",
			});
			expect(body.messages[8]).toEqual({
				role: "assistant",
				content: "Turno previo 10",
			});
			// Turno actual al final, nunca incluido como historial
			expect(body.messages[9]).toEqual({
				role: "user",
				content: "¿y sus teléfonos?",
			});
			const queryOccurrences = body.messages.filter(
				(m: { content: string }) => m.content === "¿y sus teléfonos?",
			).length;
			expect(queryOccurrences).toBe(1);
			// Cabeceras de autenticación intactas
			expect(mockFetch.mock.calls[0][1].headers).toEqual(
				expect.objectContaining({
					Authorization: "Bearer gsk_test_key",
				}),
			);
		});

		it("seguimientos cortos se resuelven contra el turno anterior gracias al historial inyectado", async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({
					choices: [
						{
							message: { content: "Detalle adicional de la orden OT-501." },
						},
					],
				}),
			});
			vi.stubGlobal("fetch", mockFetch);

			await executeLiveBusinessAgent("dame más detalle", {
				assistantName: "Plottio Asistente",
				apiKey: "gsk_test_key",
				provider: "groq",
				model: "llama-3.1-8b-instant",
				history: [
					{
						role: "user",
						text: "¿Cuál es el estado de la orden OT-501?",
					},
					{
						role: "assistant",
						text: "La orden OT-501 está En Producción para la placa PBX-8899.",
					},
				],
				businessData: sampleBusinessData,
			});

			const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
			// El turno anterior (con el contexto de OT-501) está disponible para el LLM
			expect(body.messages).toHaveLength(4);
			expect(body.messages[2]).toEqual({
				role: "assistant",
				content: "La orden OT-501 está En Producción para la placa PBX-8899.",
			});
			expect(body.messages[3]).toEqual({
				role: "user",
				content: "dame más detalle",
			});
		});
	});

	// =========================================================================
	// 3. SIN HISTORIAL: PAYLOAD IDÉNTICO AL COMPORTAMIENTO ACTUAL
	// =========================================================================
	describe("3. Sin historial (o vacío) el comportamiento es idéntico al actual", () => {
		it("Gemini sin historial: payload exactamente igual al previo a la memoria conversacional", async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({
					candidates: [{ content: { parts: [{ text: "Respuesta sin memoria." }] } }],
				}),
			});
			vi.stubGlobal("fetch", mockFetch);

			const agentOptions = {
				assistantName: "Plottio Asistente",
				apiKey: "AQ.test_key",
				provider: "google",
				model: "gemini-3.8-flash",
				temperature: 0.2,
				businessData: sampleBusinessData,
			};

			await executeLiveBusinessAgent(
				"¿Cuántas bobinas de vinilo hay en stock?",
				agentOptions,
			);
			const bodyNoHistory = JSON.parse(
				mockFetch.mock.calls[0][1].body as string,
			);

			// Con historial vacío explícito el payload debe ser idéntico
			await executeLiveBusinessAgent("¿Cuántas bobinas de vinilo hay en stock?", {
				...agentOptions,
				history: [],
			});
			const bodyEmptyHistory = JSON.parse(
				mockFetch.mock.calls[1][1].body as string,
			);

			expect(bodyEmptyHistory).toEqual(bodyNoHistory);
			expect(bodyNoHistory.contents).toEqual([
				{
					role: "user",
					parts: [{ text: "¿Cuántas bobinas de vinilo hay en stock?" }],
				},
			]);
			expect(Object.keys(bodyNoHistory)).toEqual([
				"system_instruction",
				"contents",
				"generationConfig",
			]);
		});

		it("OpenAI-compatible sin historial: messages mantiene solo system + user", async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({
					choices: [{ message: { content: "Respuesta sin memoria." } }],
				}),
			});
			vi.stubGlobal("fetch", mockFetch);

			await executeLiveBusinessAgent("Inventario de materiales", {
				assistantName: "Plottio Asistente",
				apiKey: "gsk_test_key",
				provider: "groq",
				model: "llama-3.1-8b-instant",
				businessData: sampleBusinessData,
			});

			const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
			expect(body.messages).toEqual([
				{ role: "system", content: expect.any(String) },
				{ role: "user", content: "Inventario de materiales" },
			]);
			expect(Object.keys(body)).toEqual(["model", "messages", "temperature"]);
		});

		it("el historial se propaga también a la cadena de respaldo multi-proveedor sin regresiones", async () => {
			const mockFetch = vi
				.fn()
				// Intento de Google + 3 candidatos de reintento: 503
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
				.mockResolvedValueOnce({
					ok: false,
					status: 503,
					statusText: "Service Unavailable",
				})
				// Respaldo Groq: 200 OK
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => ({
						choices: [
							{
								message: {
									content: "Respuesta del respaldo Groq con historial.",
								},
							},
						],
					}),
				});
			vi.stubGlobal("fetch", mockFetch);

			const result = await executeLiveBusinessAgent("¿y sus teléfonos?", {
				assistantName: "Plottio Asistente",
				apiKey: "AQ.google_primary",
				provider: "google",
				model: "gemini-3.8-flash",
				history: [
					{
						role: "user",
						text: "¿Qué vehículos tiene el cliente Juan Pérez?",
					},
					{
						role: "assistant",
						text: "Juan Pérez tiene registrados 2 vehículos: PBX-1234 y PBX-5678.",
					},
				],
				backupProvider: "groq",
				backupApiKey: "gsk_groq_backup",
				backupModel:
					"Llama 3.3 70B Versatile (Recomendado · Alto Rendimiento)",
				businessData: sampleBusinessData,
			});

			expect(result.allowed).toBe(true);
			expect(result.response).toContain(
				"Respuesta del respaldo Groq con historial.",
			);
			expect(result.telemetry?.provider).toBe(
				"Groq Cloud (Respaldo por falla en Google Gemini)",
			);

			// 4 llamadas a Google (intento + 3 candidatos) y la 5ta al respaldo Groq
			expect(mockFetch).toHaveBeenCalledTimes(5);
			const backupBody = JSON.parse(mockFetch.mock.calls[4][1].body as string);
			expect(backupBody.messages[0].role).toBe("system");
			expect(backupBody.messages[1]).toEqual({
				role: "user",
				content: "¿Qué vehículos tiene el cliente Juan Pérez?",
			});
			expect(backupBody.messages[2]).toEqual({
				role: "assistant",
				content: "Juan Pérez tiene registrados 2 vehículos: PBX-1234 y PBX-5678.",
			});
			expect(backupBody.messages[3]).toEqual({
				role: "user",
				content: "¿y sus teléfonos?",
			});
		});
	});

	// =========================================================================
	// 4. VISTA: CONSTRUCCIÓN DEL HISTORIAL DESDE LA CONVERSACIÓN ACTIVA
	// =========================================================================
	describe("4. PlottioAsistenteView pasa el historial real de la conversación activa", () => {
		it("construye el historial desde los mensajes previos excluyendo bienvenida y mensaje en curso", async () => {
			useIntegrationsStore.setState({
				ai: {
					...useIntegrationsStore.getState().ai,
					provider: "google",
					googleApiKey: "AQ.view_test_key",
				},
			});
			const store = useIntegrationsStore.getState();
			store.addMessageToActiveConversation({
				id: "user-prev-1",
				role: "user",
				text: "¿Qué vehículos tiene el cliente Juan Pérez?",
				timestamp: "10:00",
			});
			store.addMessageToActiveConversation({
				id: "assistant-prev-1",
				role: "assistant",
				text: "Juan Pérez tiene registrados 2 vehículos: PBX-1234 y PBX-5678.",
				timestamp: "10:01",
			});

			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({
					candidates: [
						{
							content: {
								parts: [{ text: "Los teléfonos de Juan Pérez son 0998887777." }],
							},
						},
					],
				}),
			});
			vi.stubGlobal("fetch", mockFetch);

			render(React.createElement(PlottioAsistenteView));

			const textarea = screen.getByPlaceholderText(
				/Pregunta a Plottio Asistente sobre órdenes, clientes o inventario/i,
			);
			const submitBtn = screen.getByRole("button", {
				name: /Enviar mensaje/i,
			});
			fireEvent.change(textarea, { target: { value: "¿y sus teléfonos?" } });
			fireEvent.click(submitBtn);

			await waitFor(
				() => {
					expect(mockFetch).toHaveBeenCalled();
				},
				{ timeout: 3000 },
			);

			const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
			// Bienvenida excluida del historial
			expect(JSON.stringify(body.contents)).not.toContain(
				"copiloto operacional",
			);
			// Turnos previos reales presentes en orden con roles Gemini correctos
			expect(body.contents[0]).toEqual({
				role: "user",
				parts: [{ text: "¿Qué vehículos tiene el cliente Juan Pérez?" }],
			});
			expect(body.contents[1]).toEqual({
				role: "model",
				parts: [
					{ text: "Juan Pérez tiene registrados 2 vehículos: PBX-1234 y PBX-5678." },
				],
			});
			// El mensaje en curso aparece una única vez, como turno final
			expect(body.contents).toHaveLength(3);
			expect(body.contents[2]).toEqual({
				role: "user",
				parts: [{ text: "¿y sus teléfonos?" }],
			});
		});

		it("sin mensajes previos, la vista envía solo el turno actual (sin historial)", async () => {
			useIntegrationsStore.setState({
				ai: {
					...useIntegrationsStore.getState().ai,
					provider: "google",
					googleApiKey: "AQ.view_test_key",
				},
			});

			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({
					candidates: [
						{ content: { parts: [{ text: "Respuesta inicial del asistente." }] } },
					],
				}),
			});
			vi.stubGlobal("fetch", mockFetch);

			render(React.createElement(PlottioAsistenteView));

			const textarea = screen.getByPlaceholderText(
				/Pregunta a Plottio Asistente sobre órdenes, clientes o inventario/i,
			);
			const submitBtn = screen.getByRole("button", {
				name: /Enviar mensaje/i,
			});
			fireEvent.change(textarea, {
				target: { value: "¿Cuántas bobinas de vinilo hay en stock?" },
			});
			fireEvent.click(submitBtn);

			await waitFor(
				() => {
					expect(mockFetch).toHaveBeenCalled();
				},
				{ timeout: 3000 },
			);

			const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
			// Solo el turno actual: la bienvenida nunca entra como historial
			expect(body.contents).toEqual([
				{
					role: "user",
					parts: [{ text: "¿Cuántas bobinas de vinilo hay en stock?" }],
				},
			]);
		});
	});
});
