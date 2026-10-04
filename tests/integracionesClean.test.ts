// @vitest-environment jsdom
import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { useIntegrationsStore } from "../src/store/useIntegrationsStore";

describe("Tarea 18: Refactorización de Integraciones y WhatsApp Acadia Worker", () => {
	beforeEach(() => {
		useIntegrationsStore.setState(useIntegrationsStore.getInitialState(), true);
	});

	describe("1. Store: useIntegrationsStore - Estructura y Protocolo Acadia", () => {
		it("el objeto whatsapp contiene instanceName, serverUrl y apiKey canónicos", () => {
			const state = useIntegrationsStore.getState();

			expect(state.whatsapp.instanceName).toBe("plottio-central");
			expect(state.whatsapp.serverUrl).toBe(
				"https://plottio.vercel.app/api/webhook/wha",
			);
			expect(state.whatsapp.apiKey).toBe("sec_acadia_evo_2026");
			expect(state.whatsapp.status).toBe("disconnected");
			expect(state.whatsapp.qrCode).toBeNull();
			expect(state.whatsapp.chats).toBeDefined();
		});

		it("la URL oficial del webhook de Plottio es https://plottio.vercel.app/api/webhooks", () => {
			const state = useIntegrationsStore.getState();
			expect(state.inboundEndpoint).toBe(
				"https://plottio.vercel.app/api/webhooks",
			);
		});

		it("permite actualizar la configuración de WhatsApp y mantiene apiUrl sincronizado con serverUrl", () => {
			const { updateWhatsAppConfig } = useIntegrationsStore.getState();

			updateWhatsAppConfig({
				instanceName: "taller-norte-2026",
				serverUrl: "https://acadia.custom.workers.dev/api/wha",
				apiKey: "sec_custom_worker_token",
			});

			const state = useIntegrationsStore.getState();
			expect(state.whatsapp.instanceName).toBe("taller-norte-2026");
			expect(state.whatsapp.serverUrl).toBe(
				"https://acadia.custom.workers.dev/api/wha",
			);
			expect(state.whatsapp.apiUrl).toBe(
				"https://acadia.custom.workers.dev/api/wha",
			);
			expect(state.whatsapp.apiKey).toBe("sec_custom_worker_token");
		});

		it("inboundLogs ficticios y simulateInboundLead están erradicados o limpios en el store", () => {
			const state = useIntegrationsStore.getState();
			expect(state.inboundLogs).toEqual([]);
		});
	});

	describe("2. Erradicación total de 'Evolution API' y 'evolution'", () => {
		const filesToCheck = [
			"src/store/useIntegrationsStore.ts",
			"src/components/ClientesView.tsx",
			"src/components/ConfiguracionView.tsx",
			"src/components/WhatsAppClientChatModal.tsx",
			"src/components/WebhookManagerModal.tsx",
			"src/components/WhatsAppConfigModal.tsx",
		];

		it.each(filesToCheck)(
			"el archivo %s no debe contener 'Evolution API' ni 'api.evolution'",
			(filePath) => {
				const fullPath = path.resolve(process.cwd(), filePath);
				expect(fs.existsSync(fullPath)).toBe(true);

				const content = fs.readFileSync(fullPath, "utf-8");
				expect(content).not.toContain("Evolution API");
				expect(content).not.toContain("api.evolution.plottio.com");
			},
		);
	});

	describe("3. Limpieza de WebhookManagerModal.tsx", () => {
		const modalPath = path.resolve(
			process.cwd(),
			"src/components/WebhookManagerModal.tsx",
		);
		const content = fs.readFileSync(modalPath, "utf-8");

		it("no contiene simulador de leads CRM ni registros en vivo ficticios ni guía ficticia", () => {
			expect(content).not.toContain("Simulador de Lead CRM");
			expect(content).not.toContain("simulateInboundLead");
			expect(content).not.toContain("Registro en Vivo");
			expect(content).not.toContain("Guía Paso a Paso");
			expect(content).not.toContain("inboundLogs");
		});

		it("contiene exactamente las pestañas de Webhook de Entrada y Webhooks Salientes", () => {
			expect(content).toContain("Webhook de Entrada (Inbound)");
			expect(content).toContain("Webhooks Salientes (Outbound)");
		});

		it("incluye documentación para eventos messages.upsert y connection.update", () => {
			expect(content).toContain("messages.upsert");
			expect(content).toContain("connection.update");
			expect(content).toContain("x-webhook-secret");
		});

		it("soporta selector de eventos en webhooks salientes", () => {
			expect(content).toContain("cliente.creado");
			expect(content).toContain("orden.actualizada");
			expect(content).toContain("cotizacion.aprobada");
		});
	});

	describe("4. Limpieza de ConfiguracionView.tsx", () => {
		const configPath = path.resolve(
			process.cwd(),
			"src/components/ConfiguracionView.tsx",
		);
		const content = fs.readFileSync(configPath, "utf-8");

		it("elimina la sección inferior de guías paso a paso ficticias", () => {
			expect(content).not.toContain("Guías Oficiales de Conexión & Despliegue");
			expect(content).not.toContain("showGuidesSection");
			expect(content).not.toContain("selectedGuideTab");
		});

		it("elimina la etiqueta 'Activo (pgvector 768d)' del tab IA / FinOps y cabeceras", () => {
			expect(content).not.toContain("Activo (pgvector 768d)");
		});

		it("tarjeta de WhatsApp muestra WhatsApp, instanceName y abre WhatsAppConfigModal", () => {
			expect(content).toContain("WhatsAppConfigModal");
			expect(content).toContain("Configurar WhatsApp");
			expect(content).toContain("whatsapp.serverUrl");
			expect(content).toContain("whatsapp.instanceName");
		});
	});

	describe("5. Componente WhatsAppConfigModal.tsx", () => {
		const modalPath = path.resolve(
			process.cwd(),
			"src/components/WhatsAppConfigModal.tsx",
		);

		it("existe y contiene los 3 campos exactos requeridos", () => {
			expect(fs.existsSync(modalPath)).toBe(true);
			const content = fs.readFileSync(modalPath, "utf-8");

			expect(content).toContain("instanceName");
			expect(content).toContain("serverUrl");
			expect(content).toContain("apiKey");
			expect(content).toContain("x-webhook-secret");
		});
	});
});
