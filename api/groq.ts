// Vercel Serverless Function Proxy para Groq Cloud (chat/completions y models)
// Resuelve CORS en navegadores y reintenta con modelo garantizado ante 404/410

export const CORS_HEADERS: Record<string, string> = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
};

const GROQ_FALLBACK_MODEL = "llama-3.1-8b-instant";

async function parseResponseBody(res: Response): Promise<{ data: any; isJson: boolean }> {
	const text = await res.text();
	try {
		const json = JSON.parse(text);
		return { data: json, isJson: true };
	} catch {
		return { data: { error: text || "Respuesta no JSON de Groq" }, isJson: false };
	}
}

async function executeGroqChat(authHeader: string, bodyObj: any): Promise<{ res: Response; data: any }> {
	let upstreamRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: authHeader,
		},
		body: JSON.stringify(bodyObj),
	});

	let { data } = await parseResponseBody(upstreamRes);

	// Si el modelo fue retirado (404 / 410) y no era ya el modelo de fallback, reintentar con llama-3.1-8b-instant
	if ((upstreamRes.status === 404 || upstreamRes.status === 410) && bodyObj?.model !== GROQ_FALLBACK_MODEL) {
		const retryBody = { ...bodyObj, model: GROQ_FALLBACK_MODEL };
		const retryRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: authHeader,
			},
			body: JSON.stringify(retryBody),
		});
		const retryParsed = await parseResponseBody(retryRes);
		const isSuccess = retryRes.ok || (retryRes.status >= 200 && retryRes.status < 300);
		if (isSuccess) {
			return { res: retryRes, data: retryParsed.data };
		}
	}

	return { res: upstreamRes, data };
}

export default async function handler(
	req: any,
	res?: any,
): Promise<Response | void> {
	// 1. Runtime Node.js en Vercel
	if (
		res &&
		typeof res.setHeader === "function" &&
		typeof res.status === "function"
	) {
		for (const [key, value] of Object.entries(CORS_HEADERS)) {
			res.setHeader(key, value);
		}

		if (req.method === "OPTIONS") {
			return res.status(204).end();
		}

		const authHeader = req.headers.authorization || req.headers.Authorization;
		if (!authHeader) {
			return res
				.status(401)
				.json({ error: "Authorization header missing or invalid" });
		}

		try {
			if (req.method === "GET") {
				const upstreamRes = await fetch(
					"https://api.groq.com/openai/v1/models",
					{
						method: "GET",
						headers: {
							"Content-Type": "application/json",
							Authorization: authHeader,
						},
					},
				);
				const { data } = await parseResponseBody(upstreamRes);
				return res.status(upstreamRes.status).json(data);
			}

			if (req.method === "POST") {
				const bodyObj = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
				const { res: groqRes, data } = await executeGroqChat(authHeader, bodyObj);
				return res.status(groqRes.status).json(data);
			}

			return res
				.status(405)
				.json({ error: "Method not allowed. Use GET or POST." });
		} catch (err: any) {
			return res.status(502).json({
				error: "Failed to connect to Groq Cloud upstream",
				detail: err?.message || String(err),
			});
		}
	}

	// 2. Runtime Web Standard / Fetch API
	const method = req?.method || "GET";

	if (method === "OPTIONS") {
		return new Response(null, {
			status: 204,
			headers: CORS_HEADERS,
		});
	}

	const authHeader =
		req.headers?.get?.("authorization") || req.headers?.get?.("Authorization");
	if (!authHeader) {
		return new Response(
			JSON.stringify({ error: "Authorization header missing or invalid" }),
			{
				status: 401,
				headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
			},
		);
	}

	try {
		if (method === "GET") {
			const upstreamRes = await fetch(
				"https://api.groq.com/openai/v1/models",
				{
					method: "GET",
					headers: {
						"Content-Type": "application/json",
						Authorization: authHeader,
					},
				},
			);
			const { data } = await parseResponseBody(upstreamRes);
			return new Response(JSON.stringify(data), {
				status: upstreamRes.status,
				headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
			});
		}

		if (method === "POST") {
			let bodyData: any = null;
			try {
				bodyData = await req.json();
			} catch {
				bodyData = {};
			}

			const { res: groqRes, data } = await executeGroqChat(authHeader, bodyData);
			return new Response(JSON.stringify(data), {
				status: groqRes.status,
				headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
			});
		}

		return new Response(JSON.stringify({ error: "Method not allowed" }), {
			status: 405,
			headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
		});
	} catch (err: any) {
		return new Response(
			JSON.stringify({
				error: "Failed to connect to Groq Cloud upstream",
				detail: err?.message || String(err),
			}),
			{
				status: 502,
				headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
			},
		);
	}
}
