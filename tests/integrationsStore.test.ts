// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { useIntegrationsStore } from "../src/store/useIntegrationsStore";

describe("useIntegrationsStore - Seguridad y Gestión de Credenciales", () => {
	beforeEach(() => {
		// Restablecemos el store con su estado inicial auténtico sin inyectar mocks
		useIntegrationsStore.setState(useIntegrationsStore.getInitialState(), true);
	});

	it("no debe contener secretos o API keys quemadas en el estado inicial por defecto", () => {
		// Evaluamos getInitialState() real del store
		const initialState = useIntegrationsStore.getInitialState();

		// WhatsApp
		expect(initialState.whatsapp.apiKey).toBe("");
		expect(initialState.whatsapp.apiKey).not.toContain("evo_live");
		expect(initialState.whatsapp.status).toBe("disconnected");

		// Telegram
		expect(initialState.telegram.botToken).toBe("");
		expect(initialState.telegram.botToken).not.toContain("7193849102");
		expect(initialState.telegram.botToken).not.toContain("AAE9xY");
		expect(initialState.telegram.status).toBe("disconnected");

		// Email SMTP
		expect(initialState.email.smtpPass).toBe("");
		expect(initialState.email.smtpPass).not.toBe("••••••••••••");
		expect(initialState.email.status).toBe("disconnected");

		// AI (Gemini & OpenAI)
		expect(initialState.ai.geminiApiKey).toBe("");
		expect(initialState.ai.geminiApiKey).not.toContain("AIzaSy");
		expect(initialState.ai.openaiApiKey).toBe("");
		expect(initialState.ai.openaiApiKey).not.toContain("sk-proj");

		// Webhooks e Inbound Secret
		expect(initialState.inboundSecret).toBe("");
		expect(initialState.inboundSecret).not.toContain("whsec_");
		for (const wh of initialState.webhooks) {
			expect(wh.secret).toBe("");
			expect(wh.secret).not.toContain("sec_live");
			expect(wh.secret).not.toContain("sec_slack");
		}
	});

	it("permite actualizar credenciales de WhatsApp de forma segura", () => {
		const { updateWhatsAppConfig } = useIntegrationsStore.getState();

		updateWhatsAppConfig({
			apiKey: "user_provided_evo_key_12345",
			status: "connected",
		});

		const state = useIntegrationsStore.getState();
		expect(state.whatsapp.apiKey).toBe("user_provided_evo_key_12345");
		expect(state.whatsapp.status).toBe("connected");
	});

	it("permite actualizar credenciales de Telegram de forma segura", () => {
		const { updateTelegramConfig } = useIntegrationsStore.getState();

		updateTelegramConfig({
			botToken: "987654321:XYZ_custom_bot_token",
			chatId: "-10099988877",
			status: "connected",
		});

		const state = useIntegrationsStore.getState();
		expect(state.telegram.botToken).toBe("987654321:XYZ_custom_bot_token");
		expect(state.telegram.chatId).toBe("-10099988877");
		expect(state.telegram.status).toBe("connected");
	});

	it("permite actualizar credenciales de Email corporativo", () => {
		const { updateEmailConfig } = useIntegrationsStore.getState();

		updateEmailConfig({
			smtpPass: "SuperSecretPassword123!",
			smtpUser: "admin@empresa.com",
			status: "connected",
		});

		const state = useIntegrationsStore.getState();
		expect(state.email.smtpPass).toBe("SuperSecretPassword123!");
		expect(state.email.smtpUser).toBe("admin@empresa.com");
		expect(state.email.status).toBe("connected");
	});

	it("permite actualizar credenciales de Modelos de Inteligencia Artificial", () => {
		const { updateAiConfig } = useIntegrationsStore.getState();

		updateAiConfig({
			geminiApiKey: "custom_gemini_key_999",
			openaiApiKey: "sk-custom-openai-key-abc",
			activeModel: "gpt-4o",
		});

		const state = useIntegrationsStore.getState();
		expect(state.ai.geminiApiKey).toBe("custom_gemini_key_999");
		expect(state.ai.openaiApiKey).toBe("sk-custom-openai-key-abc");
		expect(state.ai.activeModel).toBe("gpt-4o");
	});

	it("permite regenerar el inbound secret bajo demanda", () => {
		const { regenerateInboundSecret } = useIntegrationsStore.getState();

		regenerateInboundSecret();

		const state = useIntegrationsStore.getState();
		expect(state.inboundSecret).toMatch(/^whsec_[a-f0-9]{16}$/);
	});

	it("permite agregar, alternar estado y eliminar webhooks", () => {
		const { addWebhook, toggleWebhook, deleteWebhook } =
			useIntegrationsStore.getState();

		addWebhook("Notificador Discord", "https://discord.com/api/webhooks/xyz", [
			"cita.creada",
		]);

		let state = useIntegrationsStore.getState();
		const nuevoWebhook = state.webhooks.find(
			(w) => w.name === "Notificador Discord",
		);
		expect(nuevoWebhook).toBeDefined();
		expect(nuevoWebhook?.active).toBe(true);
		expect(nuevoWebhook?.secret).toMatch(/^sec_/);

		if (nuevoWebhook) {
			toggleWebhook(nuevoWebhook.id);
			state = useIntegrationsStore.getState();
			const toggled = state.webhooks.find((w) => w.id === nuevoWebhook.id);
			expect(toggled?.active).toBe(false);

			deleteWebhook(nuevoWebhook.id);
			state = useIntegrationsStore.getState();
			expect(state.webhooks.some((w) => w.id === nuevoWebhook.id)).toBe(false);
		}
	});
});
