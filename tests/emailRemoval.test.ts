import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { useIntegrationsStore } from "../src/store/useIntegrationsStore";

describe("Tarea 19 (P1 - Fase 3): Eliminación total de la Integración de Correo Electrónico", () => {
	const srcDir = path.resolve(__dirname, "../src");
	const componentsDir = path.join(srcDir, "components");

	describe("Inexistencia de archivos eliminados", () => {
		it("el archivo EmailIntegrationModal.tsx no debe existir en src/components/", () => {
			const emailModalPath = path.join(componentsDir, "EmailIntegrationModal.tsx");
			expect(fs.existsSync(emailModalPath)).toBe(false);
		});

		it("el archivo ClientEmailThreadModal.tsx no debe existir en src/components/", () => {
			const clientThreadPath = path.join(componentsDir, "ClientEmailThreadModal.tsx");
			expect(fs.existsSync(clientThreadPath)).toBe(false);
		});
	});

	describe("src/routes/index.tsx", () => {
		const indexPath = path.join(srcDir, "routes/index.tsx");
		const content = fs.readFileSync(indexPath, "utf-8");

		it("no debe importar EmailIntegrationModal", () => {
			expect(content).not.toMatch(/EmailIntegrationModal/);
		});

		it("no debe declarar el estado isEmailModalOpen", () => {
			expect(content).not.toMatch(/isEmailModalOpen/);
		});

		it("no debe renderizar el botón de correo corporativo en el header global", () => {
			expect(content).not.toMatch(/Configurar Correo Corporativo/i);
			expect(content).not.toMatch(/<Mail/);
		});

		it("no debe renderizar el componente EmailIntegrationModal", () => {
			expect(content).not.toMatch(/<EmailIntegrationModal/);
		});
	});

	describe("src/components/ClientesView.tsx", () => {
		const clientesPath = path.join(componentsDir, "ClientesView.tsx");
		const content = fs.readFileSync(clientesPath, "utf-8");

		it("no debe importar ClientEmailThreadModal", () => {
			expect(content).not.toMatch(/ClientEmailThreadModal/);
		});

		it("no debe contener el estado emailClient para abrir el modal", () => {
			expect(content).not.toMatch(/emailClient/);
			expect(content).not.toMatch(/setEmailClient/);
		});

		it("no debe contener el botón de acción de bandeja de correo corporativo", () => {
			expect(content).not.toMatch(/Bandeja de Correo Corporativo/i);
		});

		it("no debe renderizar el modal ClientEmailThreadModal", () => {
			expect(content).not.toMatch(/<ClientEmailThreadModal/);
		});

		it("debe preservar el campo de contacto email para datos del cliente", () => {
			expect(content).toMatch(/selectedClient\.email/);
			expect(content).toMatch(/setEmail\(/);
			expect(content).toMatch(/type="email"/);
		});
	});

	describe("src/components/ConfiguracionView.tsx", () => {
		const configPath = path.join(componentsDir, "ConfiguracionView.tsx");
		const content = fs.readFileSync(configPath, "utf-8");

		it("no debe importar EmailIntegrationModal", () => {
			expect(content).not.toMatch(/EmailIntegrationModal/);
		});

		it("no debe contener la tarjeta de Correo Corporativo (SMTP/OAuth2)", () => {
			expect(content).not.toMatch(/Correo Corporativo \(SMTP\/OAuth2\)/i);
			expect(content).not.toMatch(/Credenciales SMTP/i);
			expect(content).not.toMatch(/Servidor SMTP transaccional/i);
		});

		it("no debe tener el estado isEmailModalOpen ni renderizar EmailIntegrationModal", () => {
			expect(content).not.toMatch(/isEmailModalOpen/);
			expect(content).not.toMatch(/<EmailIntegrationModal/);
		});
	});

	describe("src/store/useIntegrationsStore.ts", () => {
		const storePath = path.join(srcDir, "store/useIntegrationsStore.ts");
		const content = fs.readFileSync(storePath, "utf-8");

		it("no debe exportar ni definir la interfaz EmailMessage", () => {
			expect(content).not.toMatch(/interface EmailMessage/);
		});

		it("no debe tener la propiedad email en el estado", () => {
			expect(content).not.toMatch(/smtpHost/);
			expect(content).not.toMatch(/smtpPort/);
			expect(content).not.toMatch(/smtpUser/);
			expect(content).not.toMatch(/smtpPass/);
		});

		it("no debe contener los métodos updateEmailConfig ni sendEmailMessage", () => {
			expect(content).not.toMatch(/updateEmailConfig/);
			expect(content).not.toMatch(/sendEmailMessage/);
		});

		it("en runtime useIntegrationsStore no debe poseer propiedades ni métodos de email", () => {
			const state = useIntegrationsStore.getState() as unknown as Record<string, unknown>;
			expect(state.email).toBeUndefined();
			expect(state.updateEmailConfig).toBeUndefined();
			expect(state.sendEmailMessage).toBeUndefined();
		});
	});
});
