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
});
