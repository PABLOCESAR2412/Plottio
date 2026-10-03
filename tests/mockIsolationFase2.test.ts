import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Tarea 13 (P2 - Fase 2): Aislamiento de lógica simulada / Mock Demo Mode", () => {
	const componentsDir = path.resolve(__dirname, "../src/components");

	describe("ApexBrainModal.tsx", () => {
		const filePath = path.join(componentsDir, "ApexBrainModal.tsx");
		const content = fs.readFileSync(filePath, "utf-8");

		it("contiene badge y banner explícito de Sandbox / Modo Demostración (IA Simulada)", () => {
			expect(content).toMatch(/Modo Demostración \/ Sandbox \(IA Simulada\)/);
		});

		it("explica claramente al operador que los análisis y recomendaciones son una maqueta simulada", () => {
			expect(content).toMatch(/maqueta interactiva simulada|análisis.*maqueta/i);
		});
	});

	describe("WhatsAppClientChatModal.tsx", () => {
		const filePath = path.join(componentsDir, "WhatsAppClientChatModal.tsx");
		const content = fs.readFileSync(filePath, "utf-8");

		it("contiene badge y banner superior visible de Sandbox / Modo Demostración", () => {
			expect(content).toMatch(/Modo Demostración \/ Sandbox/);
		});

		it("NO contiene Math.random() para simular respuestas automáticas entrantes del cliente", () => {
			expect(content).not.toMatch(/Math\.random\(\)/);
		});

		it("muestra un estado informativo de envío simulado sin webhook real conectado", () => {
			expect(content).toMatch(/Simulado - Sin webhook real conectado/);
		});
	});

	describe("ClientEmailThreadModal.tsx", () => {
		const filePath = path.join(componentsDir, "ClientEmailThreadModal.tsx");
		const content = fs.readFileSync(filePath, "utf-8");

		it("contiene badge superior visible de Sandbox / Modo Demostración", () => {
			expect(content).toMatch(/Modo Demostración \/ Sandbox/);
		});

		it("incluye aviso claro de operación en modo simulado sin SMTP externo", () => {
			expect(content).toMatch(/modo simulado/i);
		});
	});

	describe("TelegramConfigModal.tsx", () => {
		const filePath = path.join(componentsDir, "TelegramConfigModal.tsx");
		const content = fs.readFileSync(filePath, "utf-8");

		it("contiene badge superior visible de Sandbox / Modo Demostración", () => {
			expect(content).toMatch(/Modo Demostración \/ Sandbox/);
		});

		it("incluye aviso explícito de Sandbox / Modo Demostración en la configuración de webhook", () => {
			// Verifica que el bloque de Webhook incluya el indicador de Modo Demostración / Sandbox
			expect(content).toMatch(/Webhook Endpoint[\s\S]*?Modo Demostración \/ Sandbox/);
		});
	});
});
