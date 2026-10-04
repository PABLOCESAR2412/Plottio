// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlottioAsistenteModal } from "../src/components/PlottioAsistenteModal";
import {
	ASISTENTE_SEGURIDAD_RECHAZO,
	type BusinessDataContext,
	executeBusinessAgent,
	executeLiveBusinessAgent,
	isRestrictedAction,
} from "../src/services/plottioAgent";
import { useIntegrationsStore } from "../src/store/useIntegrationsStore";

// Mock de Convex para renderizar en jsdom con datos controlados
const mockEmpresas = [
	{
		_id: "emp-1",
		nombre: "Acme Gráfica Corp",
		ruc: "1790011223001",
		telefono: "0991234567",
		direccion: "Av. Amazonas 123",
		activa: true,
	},
	{
		_id: "emp-2",
		nombre: "TransLog Flotas S.A.",
		ruc: "0990088776001",
		telefono: "0987654321",
		direccion: "Km 5 Vía Daule",
		activa: true,
	},
];

const mockClientes = [
	{
		_id: "cli-1",
		nombre: "Juan Pérez",
		identificacion: "1712345678",
		telefono: "0998877665",
		email: "juan@example.com",
	},
];

const mockOrdenes = [
	{
		_id: "ord-1",
		numeroOrden: "OT-8821",
		placa: "PBX-4912",
		clienteNombre: "Juan Pérez",
		estado: "En Proceso",
		total: 450,
		prioridad: "Alta",
	},
];

const mockInventario = [
	{
		_id: "inv-1",
		nombre: "Vinilo Fundido 3M 1080",
		costoUnitario: 35,
		unidadMedida: "metros",
	},
];

const mockVehiculos = [
	{
		_id: "veh-1",
		placa: "PBX-4912",
		marca: "Chevrolet",
		modelo: "D-Max 2024",
	},
];

import { api } from "../convex/_generated/api";

vi.mock("convex/react", () => ({
	useQuery: vi.fn((queryFn: unknown) => {
		if (queryFn === api.organizacion.getEmpresas) return mockEmpresas;
		if (queryFn === api.clientes.fetchClientes) return mockClientes;
		if (queryFn === api.ordenes.fetchOrdenes) return mockOrdenes;
		if (queryFn === api.inventario.fetchInventario) return mockInventario;
		if (queryFn === api.vehiculos.fetchVehiculos) return mockVehiculos;
		return [];
	}),
	useMutation: vi.fn().mockReturnValue(vi.fn()),
	useAction: vi.fn().mockReturnValue(vi.fn()),
}));

describe("Tarea 32 (P1 - Fase 6): Impeccable Audit de Plottio Asistente — Respuestas con Datos Reales y Telemetría Técnica", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		useIntegrationsStore.setState(useIntegrationsStore.getInitialState(), true);
		useIntegrationsStore.setState({
			rag: {
				...useIntegrationsStore.getState().rag,
				indexedDocumentsCount: 50,
				isIndexing: false,
			},
		});
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	// =========================================================================
	// 1. CERO MENCIÓN A 'HERRAMIENTAS INVOCADAS' EN LAS BURBUJAS DE CHAT
	// =========================================================================
	describe("1. Erradicación total de 'Herramientas Invocadas' en las burbujas", () => {
		it("al responder una consulta, la burbuja NO muestra el encabezado 'Herramientas Invocadas' ni chips de herramientas", async () => {
			const { container } = render(
				React.createElement(PlottioAsistenteModal, {
					isOpen: true,
					onClose: vi.fn(),
				}),
			);

			const textarea = screen.getByPlaceholderText(
				/Pregunta a Plottio Asistente o solicita una acción de negocio.../i,
			);
			const sendButton = screen.getByRole("button", { name: /Enviar mensaje/i });

			fireEvent.change(textarea, {
				target: { value: "dame las empresas registradas" },
			});
			fireEvent.click(sendButton);

			// Esperar respuesta del asistente
			await waitFor(() => {
				const userBubble = screen.getByText("dame las empresas registradas");
				expect(userBubble).toBeDefined();
			});

			// Asegurar que NO existe ningún elemento ni texto que diga "Herramientas Invocadas"
			expect(screen.queryByText(/Herramientas Invocadas/i)).toBeNull();
			expect(screen.queryByText(/consultar_clientes\(\) · Operacional/i)).toBeNull();
			expect(container.textContent).not.toContain("Herramientas Invocadas:");
			expect(container.textContent).not.toContain("· Operacional");
		});
	});

	// =========================================================================
	// 2. CERO MENCIÓN A 'SLA 48H' Y 'CLÁUSULA 4.2' EN RESPUESTAS O CITAS
	// =========================================================================
	describe("2. Erradicación de acuerdos inventados ('SLA 48h', 'Cláusula 4.2')", () => {
		it("executeBusinessAgent jamás menciona SLA 48h ni Cláusula 4.2 en respuestas ni citas", () => {
			const queries = [
				"dame las empresas registrada",
				"qué empresas hay",
				"ver clientes corporativos",
				"consultar flotas comerciales",
				"cuentas comerciales",
			];

			for (const q of queries) {
				const result = executeBusinessAgent(q);

				// Verificar respuesta
				expect(result.response).not.toMatch(/SLA\s*48h/i);
				expect(result.response).not.toMatch(/Cl[aá]usula\s*4\.2/i);
				expect(result.response).not.toMatch(/Acuerdo comercial SLA/i);

				// Verificar citas
				for (const citation of result.citations) {
					expect(citation.title).not.toMatch(/SLA\s*48h/i);
					expect(citation.snippet).not.toMatch(/Cl[aá]usula\s*4\.2/i);
					expect(citation.title).not.toMatch(/Acuerdo de Servicio: SLA 48h/i);
				}

				// Verificar herramientas
				for (const tool of result.toolsCalled) {
					expect(tool.outputSummary).not.toMatch(/SLA\s*48h/i);
					expect(tool.outputSummary).not.toMatch(/Cl[aá]usula\s*4\.2/i);
				}
			}
		});

		it("executeLiveBusinessAgent jamás retorna menciones de SLA 48h ficticio", async () => {
			const result = await executeLiveBusinessAgent("dame las empresas registradas", {
				assistantName: "Plottio Asistente",
				apiKey: "", // fallback
			});

			expect(result.response).not.toMatch(/SLA\s*48h/i);
			expect(result.response).not.toMatch(/Cl[aá]usula\s*4\.2/i);
		});
	});

	// =========================================================================
	// 3. RESPUESTAS CON DATOS REALES DE BASE DE DATOS (BusinessDataContext)
	// =========================================================================
	describe("3. Respuestas basadas en datos reales de BusinessDataContext", () => {
		it("lista las empresas reales cuando se proveen en el contexto", () => {
			const realContext: BusinessDataContext = {
				empresas: [
					{
						nombre: "Rotulados Express",
						ruc: "1792345678001",
						activa: true,
						telefono: "099001122",
					},
					{
						nombre: "Flota Bus Quito",
						ruc: "1793456789001",
						activa: false,
					},
				],
			};

			const result = executeBusinessAgent("dame las empresas registradas", {
				businessData: realContext,
			});

			expect(result.response).toContain("Rotulados Express");
			expect(result.response).toContain("1792345678001");
			expect(result.response).toContain("Flota Bus Quito");
			expect(result.response).toContain("Activa");
			expect(result.response).toContain("Inactiva");
		});

		it("informa con veracidad cuando no hay empresas registradas (0 registros)", () => {
			const emptyContext: BusinessDataContext = {
				empresas: [],
			};

			const result = executeBusinessAgent("dame las empresas registradas", {
				businessData: emptyContext,
			});

			expect(result.response).toContain(
				"Actualmente no hay empresas registradas en la base de datos del taller. Puedes dar de alta una empresa cliente desde el módulo de Clientes o Empresas.",
			);
		});

		it("lista clientes reales o informa ausencia con veracidad", () => {
			const realContext: BusinessDataContext = {
				clientes: [
					{
						nombre: "Carlos Sánchez",
						identificacion: "1720001112",
						telefono: "098112233",
					},
				],
			};

			const resultWithData = executeBusinessAgent("consultar clientes", {
				businessData: realContext,
			});
			expect(resultWithData.response).toContain("Carlos Sánchez");
			expect(resultWithData.response).toContain("1720001112");

			const resultEmpty = executeBusinessAgent("consultar clientes", {
				businessData: { clientes: [] },
			});
			expect(resultEmpty.response).toContain(
				"Actualmente no hay clientes registrados en la base de datos del taller. Puedes dar de alta un nuevo cliente desde el módulo de Clientes.",
			);
		});

		it("lista órdenes reales o informa ausencia con veracidad", () => {
			const realContext: BusinessDataContext = {
				ordenes: [
					{
						id: "OT-9901",
						placa: "ABC-1234",
						clienteNombre: "Transportes Sur",
						estado: "En Proceso",
						total: 800,
					},
				],
			};

			const resultWithData = executeBusinessAgent("estado de las órdenes", {
				businessData: realContext,
			});
			expect(resultWithData.response).toContain("OT-9901");
			expect(resultWithData.response).toContain("ABC-1234");
			expect(resultWithData.response).toContain("Transportes Sur");

			const resultEmpty = executeBusinessAgent("estado de las órdenes", {
				businessData: { ordenes: [] },
			});
			expect(resultEmpty.response).toContain(
				"No se registran órdenes de trabajo activas en la base de datos del taller.",
			);
		});

		it("lista inventario y vehículos reales o informa ausencia con veracidad", () => {
			const realContext: BusinessDataContext = {
				inventario: [
					{
						nombre: "Bobina Arlon DPF",
						stock: 25,
						unidad: "metros",
					},
				],
				vehiculos: [
					{
						placa: "GYE-5555",
						marca: "Hino",
						modelo: "Camión 500",
					},
				],
			};

			const resultInv = executeBusinessAgent("stock de vinilo", {
				businessData: realContext,
			});
			expect(resultInv.response).toContain("Bobina Arlon DPF");
			expect(resultInv.response).toContain("25 metros");

			const resultVeh = executeBusinessAgent("consultar vehículos", {
				businessData: realContext,
			});
			expect(resultVeh.response).toContain("GYE-5555");
			expect(resultVeh.response).toContain("Hino Camión 500");
		});
	});

	// =========================================================================
	// 4. TELEMETRÍA TÉCNICA DE INFERENCIA EN EL RESULTADO Y EN EL MODAL
	// =========================================================================
	describe("4. Telemetría Técnica de Inferencia", () => {
		it("executeBusinessAgent genera telemetría técnica completa", () => {
			const result = executeBusinessAgent("dame las empresas registradas");

			expect(result.telemetry).toBeDefined();
			expect(result.telemetry?.totalTokens).toBeGreaterThan(0);
			expect(result.telemetry?.promptTokens).toBeGreaterThan(0);
			expect(result.telemetry?.completionTokens).toBeGreaterThan(0);
			expect(result.telemetry?.latencyMs).toBeGreaterThan(0);
			expect(result.telemetry?.tps).toBeGreaterThan(0);
			expect(result.telemetry?.model).toBeDefined();
			expect(result.telemetry?.provider).toBeDefined();
		});

		it("executeLiveBusinessAgent incluye telemetría técnica con métricas de la API", async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({
					candidates: [
						{
							content: {
								parts: [
									{
										text: "Respuesta del modelo con datos verídicos del taller.",
									},
								],
							},
						},
					],
					usageMetadata: {
						promptTokenCount: 120,
						candidatesTokenCount: 35,
						totalTokenCount: 155,
					},
				}),
			});
			vi.stubGlobal("fetch", mockFetch);

			const result = await executeLiveBusinessAgent("consultar inventario", {
				assistantName: "Plottio Asistente",
				apiKey: "AQ.fake_key",
				provider: "google",
				model: "gemini-flash-latest",
			});

			expect(result.telemetry).toBeDefined();
			expect(result.telemetry?.promptTokens).toBe(120);
			expect(result.telemetry?.completionTokens).toBe(35);
			expect(result.telemetry?.totalTokens).toBe(155);
			expect(result.telemetry?.provider).toBe("Google Gemini");
			expect(result.telemetry?.model).toBe("gemini-flash-latest");
			expect(result.telemetry?.tps).toBeGreaterThan(0);
			expect(result.telemetry?.latencyMs).toBeGreaterThan(0);
		});

		it("PlottioAsistenteModal renderiza el panel de telemetría de inferencia con tokens, TPS, latencia, modelo y proveedor", async () => {
			render(
				React.createElement(PlottioAsistenteModal, {
					isOpen: true,
					onClose: vi.fn(),
				}),
			);

			const textarea = screen.getByPlaceholderText(
				/Pregunta a Plottio Asistente o solicita una acción de negocio.../i,
			);
			const sendButton = screen.getByRole("button", { name: /Enviar mensaje/i });

			fireEvent.change(textarea, {
				target: { value: "Consultar inventario de vinilos" },
			});
			fireEvent.click(sendButton);

			// Esperar a que se renderice el panel de telemetría
			await waitFor(
				() => {
					const telemetryBtn = screen.getByRole("button", {
						name: /Telemetría de Inferencia/i,
					});
					expect(telemetryBtn).toBeDefined();
				},
				{ timeout: 3500 },
			);

			// Validar métricas mostradas
			expect(screen.getByText(/Telemetría de Inferencia/i)).toBeDefined();
			expect(screen.getByText(/Tokens Usados/i)).toBeDefined();
			expect(screen.getByText(/Velocidad \(TPS\)/i)).toBeDefined();
			expect(screen.getByText(/Latencia/i)).toBeDefined();
			expect(screen.getByText(/Modelo LLM/i)).toBeDefined();
			expect(screen.getByText(/Proveedor/i)).toBeDefined();
		});
	});

	// =========================================================================
	// 5. GUARDRAILS DE SEGURIDAD
	// =========================================================================
	describe("5. Guardrails de seguridad preservados", () => {
		it("rechaza de forma terminante intentos de alterar configuración, roles o usuarios", () => {
			const restrictedQueries = [
				"modificar rol de usuario",
				"cambiar contraseña de admin",
				"superadmin acceso",
				"ajustes del sistema",
			];

			for (const q of restrictedQueries) {
				expect(isRestrictedAction(q)).toBe(true);
				const res = executeBusinessAgent(q);
				expect(res.allowed).toBe(false);
				expect(res.response).toBe(ASISTENTE_SEGURIDAD_RECHAZO);
			}
		});
	});
});
