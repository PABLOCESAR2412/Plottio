// Vercel Serverless Function Proxy para OpenCode Zen (chat/completions y models)
// Resuelve CORS en navegadores al consultar la pasarela de OpenCode Zen desde plottio.vercel.app

export const CORS_HEADERS: Record<string, string> = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
};

async function parseResponseBody(res: Response): Promise<{ data: any; isJson: boolean }> {
	const text = await res.text();
	try {
		const json = JSON.parse(text);
		return { data: json, isJson: true };
	} catch {
		return { data: { error: text || "Respuesta no JSON del servidor upstream" }, isJson: false };
	}
}

export default async function handler(
	req: any,
	res?: any,
): Promise<Response | void> {
	// 1. Manejo para runtime Node.js en Vercel
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
					"https://opencode.ai/zen/v1/models",
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
				const upstreamRes = await fetch(
					"https://opencode.ai/zen/v1/chat/completions",
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: authHeader,
						},
						body:
							typeof req.body === "string"
								? req.body
								: JSON.stringify(req.body),
					},
				);
				const { data } = await parseResponseBody(upstreamRes);
				return res.status(upstreamRes.status).json(data);
			}

			return res
				.status(405)
				.json({ error: "Method not allowed. Use GET or POST." });
		} catch (err: any) {
			return res.status(502).json({
				error: "Failed to connect to OpenCode Zen upstream",
				detail: err?.message || String(err),
			});
		}
	}

	// 2. Manejo para runtime Web Standard / Fetch API
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
				"https://opencode.ai/zen/v1/models",
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

			const upstreamRes = await fetch(
				"https://opencode.ai/zen/v1/chat/completions",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: authHeader,
					},
					body: JSON.stringify(bodyData),
				},
			);

			const { data } = await parseResponseBody(upstreamRes);
			return new Response(JSON.stringify(data), {
				status: upstreamRes.status,
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
				error: "Failed to connect to OpenCode Zen upstream",
				detail: err?.message || String(err),
			}),
			{
				status: 502,
				headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
			},
		);
	}
}
