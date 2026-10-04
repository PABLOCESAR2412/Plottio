import {
	AI_MODELS_BY_PROVIDER,
	type AiProvider,
} from "../store/useIntegrationsStore";

/**
 * Consulta de forma reactiva y segura los modelos disponibles por proveedor y API Key.
 * En caso de fallo de red, timeout (5s) o ausencia de CORS, retorna el catálogo canónico oficial.
 */
export async function fetchAvailableModels(
	provider: AiProvider,
	apiKey: string,
): Promise<string[]> {
	const fallbackModels = AI_MODELS_BY_PROVIDER[provider] || [];

	if (!apiKey || !apiKey.trim()) {
		return fallbackModels;
	}

	const trimmedKey = apiKey.trim();
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 5000);

	try {
		if (provider === "google") {
			const res = await fetch(
				`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(trimmedKey)}`,
				{
					signal: controller.signal,
					headers: { "Content-Type": "application/json" },
				},
			);
			clearTimeout(timer);
			if (!res.ok) return fallbackModels;

			const data = (await res.json()) as {
				models?: Array<{
					name?: string;
					displayName?: string;
					supportedGenerationMethods?: string[];
				}>;
			};

			if (data && Array.isArray(data.models)) {
				const models = data.models
					.filter(
						(m) =>
							!m.supportedGenerationMethods ||
							m.supportedGenerationMethods.includes("generateContent"),
					)
					.map((m) => {
						const cleanedName = m.name ? m.name.replace(/^models\//, "") : "";
						return cleanedName || m.displayName || "";
					})
					.filter((name) => Boolean(name) && !name.includes("embedding"));

				return models.length > 0 ? models : fallbackModels;
			}
			return fallbackModels;
		}

		if (provider === "groq") {
			const res = await fetch("https://api.groq.com/openai/v1/models", {
				signal: controller.signal,
				headers: {
					Authorization: `Bearer ${trimmedKey}`,
					"Content-Type": "application/json",
				},
			});
			clearTimeout(timer);
			if (!res.ok) return fallbackModels;

			const data = (await res.json()) as {
				data?: Array<{ id?: string; active?: boolean }>;
			};

			if (data && Array.isArray(data.data)) {
				const models = data.data
					.filter((m) => m.active !== false && Boolean(m.id))
					.map((m) => m.id as string);

				return models.length > 0 ? models : fallbackModels;
			}
			return fallbackModels;
		}

		if (provider === "opencode_zen") {
			const res = await fetch("https://api.opencodezen.com/v1/models", {
				signal: controller.signal,
				headers: {
					Authorization: `Bearer ${trimmedKey}`,
					"Content-Type": "application/json",
				},
			});
			clearTimeout(timer);
			if (!res.ok) return fallbackModels;

			const data = (await res.json()) as
				| Array<{ id?: string; name?: string }>
				| { data?: Array<{ id?: string; name?: string }> };

			const list = Array.isArray(data)
				? data
				: Array.isArray(data?.data)
					? data.data
					: [];

			if (list.length > 0) {
				const models = list
					.map((m) => m.id || m.name || "")
					.filter((name): name is string => Boolean(name));
				return models.length > 0 ? models : fallbackModels;
			}
			return fallbackModels;
		}

		if (provider === "nvidia") {
			const res = await fetch("https://integrate.api.nvidia.com/v1/models", {
				signal: controller.signal,
				headers: {
					Authorization: `Bearer ${trimmedKey}`,
					"Content-Type": "application/json",
				},
			});
			clearTimeout(timer);
			if (!res.ok) return fallbackModels;

			const data = (await res.json()) as
				| Array<{ id?: string; name?: string }>
				| { data?: Array<{ id?: string; name?: string }> };

			const list = Array.isArray(data)
				? data
				: Array.isArray(data?.data)
					? data.data
					: [];

			if (list.length > 0) {
				const models = list
					.map((m) => m.id || m.name || "")
					.filter((name): name is string => Boolean(name));
				return models.length > 0 ? models : fallbackModels;
			}
			return fallbackModels;
		}

		clearTimeout(timer);
		return fallbackModels;
	} catch (_err) {
		clearTimeout(timer);
		return fallbackModels;
	}
}
