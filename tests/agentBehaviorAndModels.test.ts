// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
	executeBusinessAgent,
	type BusinessDataContext,
} from "../src/services/plottioAgent";
import {
	AI_MODELS_BY_PROVIDER,
	useIntegrationsStore,
} from "../src/store/useIntegrationsStore";

describe("Mejoras de Comportamiento del Agente y Catálogo Ampliado de Modelos", () => {
	beforeEach(() => {
		useIntegrationsStore.setState(useIntegrationsStore.getInitialState(), true);
	});

	describe("1. Respuestas naturales y con sentido operacional", () => {
		it("responde a saludos cordialmente sin preámbulos robóticos ni análisis de 'hola'", () => {
			const res = executeBusinessAgent("hola");
			expect(res.allowed).toBe(true);
			expect(res.response).toContain("¡Hola! Soy Plottio Asistente");
			expect(res.response).not.toContain("Análisis operacional para \"hola\"");
			expect(res.response).not.toContain("Basado en la ejecución de herramientas de negocio");
		});

		it("responde a solicitudes de ayuda resumiendo sus capacidades operativas de taller", () => {
			const res = executeBusinessAgent("qué puedes hacer");
			expect(res.allowed).toBe(true);
			expect(res.response).toContain("Como asistente de operaciones de Plottio");
			expect(res.response).toContain("Órdenes de Trabajo");
			expect(res.response).toContain("Inventario");
		});

		it("brinda pautas técnicas de rotulado vehicular y wrapping automotriz", () => {
			const res = executeBusinessAgent("cómo rotular con wrapping un auto");
			expect(res.allowed).toBe(true);
			expect(res.response).toContain("Pautas técnicas para rotulado vehicular");
			expect(res.response).toContain("alcohol isopropílico");
			expect(res.response).toContain("Poscalentado");
		});

		it("informa correctamente el inventario sin confundir costo unitario con stock", () => {
			const dataWithStock: BusinessDataContext = {
				inventario: [
					{
						id: "inv-1",
						nombre: "Vinilo Fundido 3M IJ180",
						stock: 50,
						unidad: "metros",
					},
					{
						id: "inv-2",
						nombre: "Lámina Microperforada",
						// sin stock registrado directo
						unidad: "bobinas",
					},
				],
			};

			const res = executeBusinessAgent("consultar inventario", {
				businessData: dataWithStock,
			});

			expect(res.response).toContain("Vinilo Fundido 3M IJ180: Stock 50 metros");
			expect(res.response).toContain("Lámina Microperforada: Registrado en catálogo (bobinas)");
		});
	});

	describe("2. Catálogo completo de modelos: recomendados y todos los usables", () => {
		it("provee los modelos recomendados en la cima y todos los modelos usables para Google", () => {
			const googleModels = AI_MODELS_BY_PROVIDER.google;
			expect(googleModels[0]).toContain("Recomendado");
			expect(googleModels[0]).toContain("Gemini 3.8 Flash");
			expect(googleModels).toContain("Gemini 3.7 Flash (Recomendado · Balanceado)");
			expect(googleModels).toContain("Gemini Flash Lite (Recomendado · Menor Costo)");
			expect(googleModels).toContain("Gemini Flash Latest");
			expect(googleModels).toContain("Gemini Pro Latest");
			expect(googleModels).toContain("Gemini 2.5 Flash");
		});

		it("provee los modelos recomendados en la cima y todos los modelos usables para Groq", () => {
			const groqModels = AI_MODELS_BY_PROVIDER.groq;
			expect(groqModels[0]).toContain("Recomendado");
			expect(groqModels[0]).toContain("Llama 3.3 70B");
			expect(groqModels[1]).toContain("Llama 3.1 8B Instant");
			expect(groqModels).toContain("Llama 3.2 1B Preview (Ultra Liviano)");
			expect(groqModels).toContain("Mixtral 8x7B 32768");
			expect(groqModels).toContain("Gemma 2 9B IT");
			expect(groqModels).toContain("Qwen 2.5 Coder 32B");
		});

		it("provee los modelos recomendados y usables para Opencode Zen", () => {
			const zenModels = AI_MODELS_BY_PROVIDER.opencode_zen;
			expect(zenModels[0]).toContain("DeepSeek V3 (Recomendado");
			expect(zenModels[1]).toContain("Qwen 2.5 Coder 32B (Recomendado");
			expect(zenModels).toContain("DeepSeek R1 (Razonamiento Profundo)");
			expect(zenModels).toContain("Meta Llama 3.3 70B Instruct");
		});

		it("provee los modelos recomendados y usables para Nvidia NIM", () => {
			const nvidiaModels = AI_MODELS_BY_PROVIDER.nvidia;
			expect(nvidiaModels[0]).toContain("Llama 3.1 Nemotron 70B (Recomendado");
			expect(nvidiaModels[1]).toContain("Mistral NeMo 12B (Recomendado");
			expect(nvidiaModels).toContain("Meta Llama 3.1 8B Instruct");
			expect(nvidiaModels).toContain("Meta Llama 3.3 70B Instruct");
			expect(nvidiaModels).toContain("Nemotron 4 340B Instruct");
		});
	});

	const businessDataTarea42: BusinessDataContext = {
		empresas: [
			{ nombre: "Cooperativa Ruta Sur", ruc: "1792345678001", activa: true },
		],
		clientes: [
			{
				id: "cli-1",
				nombre: "Juan Pérez",
				identificacion: "1712345678",
				telefono: "0998765432",
			},
			{ id: "cli-2", nombre: "María López" },
		],
		ordenes: [
			{
				id: "OT-123",
				placa: "ABC-123",
				clienteNombre: "Juan Pérez",
				estado: "En Proceso",
				total: 320,
			},
			{
				id: "OT-456",
				placa: "XYZ-789",
				clienteNombre: "María López",
				estado: "Completada",
			},
		],
		inventario: [
			{
				id: "inv-1",
				nombre: "Vinilo Fundido 3M IJ180",
				stock: 50,
				unidad: "metros",
			},
			{ id: "inv-2", nombre: "Lámina Microperforada", unidad: "bobinas" },
		],
		vehiculos: [
			{ id: "veh-1", placa: "ABC-123", marca: "Chevrolet", modelo: "D-Max" },
			{ id: "veh-2", placa: "XYZ-789", marca: "Toyota", modelo: "Hilux" },
		],
	};

	describe("3. Respuestas deterministas sin preámbulo robótico", () => {
		it("ninguna respuesta determinista contiene el preámbulo 'Basado en la ejecución de herramientas de negocio'", () => {
			const queries = [
				"hola",
				"qué puedes hacer",
				"cómo rotular con wrapping un auto",
				"dame las empresas registradas",
				"consultar clientes",
				"¿qué vehículos tiene el cliente Juan?",
				"¿cuál es el estado de la orden OT-123?",
				"consultar inventario",
				"¿hay stock del vinilo Arlon 5500?",
				"¿qué órdenes están en proceso?",
			];

			for (const query of queries) {
				const res = executeBusinessAgent(query, {
					businessData: businessDataTarea42,
				});
				expect(res.allowed).toBe(true);
				expect(res.response).not.toContain(
					"Basado en la ejecución de herramientas de negocio",
				);
			}
		});

		it("las herramientas invocadas se reflejan solo en telemetría (toolsCalled), nunca en el texto visible", () => {
			const res = executeBusinessAgent(
				"¿cuál es el estado de la orden OT-123?",
				{ businessData: businessDataTarea42 },
			);
			expect(res.toolsCalled.map((t) => t.toolName)).toContain(
				"consultar_ordenes",
			);
			expect(res.response).not.toContain("consultar_ordenes");
			expect(res.telemetry).toBeDefined();
			expect(res.telemetry?.totalTokens).toBeGreaterThan(0);
		});
	});

	describe("4. Consultas multi-intención: clientes + vehículos", () => {
		it("responde con la ficha del cliente y sus vehículos vinculados cuando ambos existen", () => {
			const res = executeBusinessAgent("¿qué vehículos tiene el cliente Juan?", {
				businessData: businessDataTarea42,
			});
			expect(res.allowed).toBe(true);
			expect(res.response).toContain("Juan Pérez");
			expect(res.response).toContain("ABC-123");
			expect(res.response).toContain("Chevrolet");
			expect(res.response).not.toContain("María López");
			expect(res.response).not.toContain("XYZ-789");
			expect(res.response).not.toContain("Toyota");
			const toolNames = res.toolsCalled.map((t) => t.toolName);
			expect(toolNames).toContain("consultar_clientes");
			expect(toolNames).toContain("consultar_vehiculos");
		});

		it("extrae el nombre en patrones 'cliente que se llama X' y 'cliente llamado X'", () => {
			const resQueSeLlama = executeBusinessAgent(
				"¿qué vehículos tiene el cliente que se llama Juan?",
				{ businessData: businessDataTarea42 },
			);
			expect(resQueSeLlama.allowed).toBe(true);
			expect(resQueSeLlama.response).toContain("Juan Pérez");
			expect(resQueSeLlama.response).toContain("ABC-123");

			const resLlamado = executeBusinessAgent(
				"¿qué vehículos tiene el cliente llamado Juan Pérez?",
				{ businessData: businessDataTarea42 },
			);
			expect(resLlamado.allowed).toBe(true);
			expect(resLlamado.response).toContain("Juan Pérez");
			expect(resLlamado.response).toContain("ABC-123");
		});

		it("no lista vehículos ajenos cuando el cliente mencionado no existe", () => {
			const res = executeBusinessAgent(
				"¿qué vehículos tiene el cliente Ricardo?",
				{ businessData: businessDataTarea42 },
			);
			expect(res.allowed).toBe(true);
			expect(res.response).toContain("No encontré al cliente");
			expect(res.response).not.toContain("XYZ-789");
			expect(res.response).not.toContain("Toyota");
		});

		it("indica con amabilidad cuando el cliente mencionado no aparece en los datos", () => {
			const res = executeBusinessAgent(
				"¿qué vehículos tiene el cliente Ricardo?",
				{ businessData: businessDataTarea42 },
			);
			expect(res.allowed).toBe(true);
			expect(res.response).toContain("Ricardo");
			expect(res.response).toContain("No encontré al cliente");
			expect(res.response).not.toContain(
				"Basado en la ejecución de herramientas de negocio",
			);
		});
	});

	describe("5. Filtrado real de órdenes e inventario", () => {
		it("filtra órdenes por número de orden específico (OT-123)", () => {
			const res = executeBusinessAgent("¿cuál es el estado de la orden OT-123?", {
				businessData: businessDataTarea42,
			});
			expect(res.response).toContain("OT-123");
			expect(res.response).toContain("ABC-123");
			expect(res.response).not.toContain("OT-456");
		});

		it("filtra órdenes por placa específica (ABC-123)", () => {
			const res = executeBusinessAgent("¿qué órdenes hay con la placa ABC-123?", {
				businessData: businessDataTarea42,
			});
			expect(res.response).toContain("ABC-123");
			expect(res.response).not.toContain("XYZ-789");
		});

		it("filtra órdenes por estado (En Proceso)", () => {
			const res = executeBusinessAgent("¿qué órdenes están en proceso?", {
				businessData: businessDataTarea42,
			});
			expect(res.response).toContain("En Proceso");
			expect(res.response).toContain("OT-123");
			expect(res.response).not.toContain("OT-456");
		});

		it("indica explícitamente cuando la orden filtrada no existe (OT-999)", () => {
			const res = executeBusinessAgent("¿cuál es el estado de la orden OT-999?", {
				businessData: businessDataTarea42,
			});
			expect(res.response).toContain(
				"No encontré órdenes de trabajo que coincidan",
			);
			expect(res.response).toContain("OT-999");
		});

		it("filtra el inventario por material específico (3M IJ180)", () => {
			const res = executeBusinessAgent(
				"¿cuánto stock hay del material 3M IJ180?",
				{ businessData: businessDataTarea42 },
			);
			expect(res.response).toContain("Vinilo Fundido 3M IJ180");
			expect(res.response).not.toContain("Lámina Microperforada");
		});

		it("indica explícitamente cuando el material filtrado no existe en inventario", () => {
			const res = executeBusinessAgent("¿hay stock del vinilo Arlon 5500?", {
				businessData: businessDataTarea42,
			});
			expect(res.response).toContain(
				"No encontré materiales en el inventario que coincidan",
			);
		});
	});
});
