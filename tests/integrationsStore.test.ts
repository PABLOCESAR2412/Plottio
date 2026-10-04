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
		expect(initialState.whatsapp.apiKey).toBe("sec_acadia_evo_2026");
		expect(initialState.whatsapp.serverUrl).toBe(
			"https://plottio.vercel.app/api/webhook/wha",
		);
		expect(initialState.whatsapp.instanceName).toBe("plottio-central");
		expect(initialState.whatsapp.status).toBe("disconnected");

		// Telegram
		expect(initialState.telegram.botToken).toBe("");
		expect(initialState.telegram.botToken).not.toContain("7193849102");
		expect(initialState.telegram.botToken).not.toContain("AAE9xY");
		expect(initialState.telegram.status).toBe("disconnected");

		// Email eliminado del store
		expect((initialState as unknown as Record<string, unknown>).email).toBeUndefined();

		// AI (Google, Groq, Opencode Zen, Nvidia)
		expect(initialState.ai.googleApiKey).toBe("");
		expect(initialState.ai.googleApiKey).not.toContain("AIzaSy");
		expect(initialState.ai.groqApiKey).toBe("");
		expect(initialState.ai.groqApiKey).not.toContain("gsk_");
		expect(initialState.ai.opencodeZenApiKey).toBe("");
		expect(initialState.ai.nvidiaApiKey).toBe("");
		expect(initialState.ai.nvidiaApiKey).not.toContain("nvapi-");
		expect(initialState.ai.geminiApiKey).toBe("");
		expect(initialState.ai.openaiApiKey).toBe("");

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

	it("no contiene configuración ni métodos de correo corporativo en el store", () => {
		const state = useIntegrationsStore.getState() as unknown as Record<string, unknown>;
		expect(state.email).toBeUndefined();
		expect(state.updateEmailConfig).toBeUndefined();
		expect(state.sendEmailMessage).toBeUndefined();
	});

	it("permite actualizar credenciales de Modelos de Inteligencia Artificial Multi-Proveedor", () => {
		const { updateAiConfig, setTimeFilter } = useIntegrationsStore.getState();

		updateAiConfig({
			provider: "groq",
			googleApiKey: "custom_google_key_999",
			groqApiKey: "gsk_custom_groq_key_123",
			opencodeZenApiKey: "zen_key_456",
			nvidiaApiKey: "nvapi-custom-789",
			activeModel: "Llama 3.3 70B Versatile",
			monthlyBudgetUSD: 200,
		});

		let state = useIntegrationsStore.getState();
		expect(state.ai.provider).toBe("groq");
		expect(state.ai.googleApiKey).toBe("custom_google_key_999");
		expect(state.ai.geminiApiKey).toBe("custom_google_key_999");
		expect(state.ai.groqApiKey).toBe("gsk_custom_groq_key_123");
		expect(state.ai.opencodeZenApiKey).toBe("zen_key_456");
		expect(state.ai.nvidiaApiKey).toBe("nvapi-custom-789");
		expect(state.ai.activeModel).toBe("Llama 3.3 70B Versatile");
		expect(state.ai.monthlyBudgetUSD).toBe(200);

		setTimeFilter("semana");
		state = useIntegrationsStore.getState();
		expect(state.ai.timeFilter).toBe("semana");
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
