// Vercel Serverless Function Proxy para NVIDIA NIM (chat/completions y models)
// Resuelve CORS en navegadores al consultar la API de NVIDIA desde plottio.vercel.app

export const CORS_HEADERS: Record<string, string> = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
};

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
				const nvidiaRes = await fetch(
					"https://integrate.api.nvidia.com/v1/models",
					{
						method: "GET",
						headers: {
							"Content-Type": "application/json",
							Authorization: authHeader,
						},
					},
				);
				const data = await nvidiaRes.json();
				return res.status(nvidiaRes.status).json(data);
			}

			if (req.method === "POST") {
				const nvidiaRes = await fetch(
					"https://integrate.api.nvidia.com/v1/chat/completions",
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
				const data = await nvidiaRes.json();
				return res.status(nvidiaRes.status).json(data);
			}

			return res
				.status(405)
				.json({ error: "Method not allowed. Use GET or POST." });
		} catch (err: any) {
			return res.status(502).json({
				error: "Failed to connect to Nvidia NIM",
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
			const nvidiaRes = await fetch(
				"https://integrate.api.nvidia.com/v1/models",
				{
					method: "GET",
					headers: {
						"Content-Type": "application/json",
						Authorization: authHeader,
					},
				},
			);
			const data = await nvidiaRes.json();
			return new Response(JSON.stringify(data), {
				status: nvidiaRes.status,
				headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
			});
		}

		if (method === "POST") {
			const body = await req.json();
			const nvidiaRes = await fetch(
				"https://integrate.api.nvidia.com/v1/chat/completions",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: authHeader,
					},
					body: JSON.stringify(body),
				},
			);

			const data = await nvidiaRes.json();
			return new Response(JSON.stringify(data), {
				status: nvidiaRes.status,
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
				error: "Failed to connect to Nvidia NIM",
				detail: err?.message || String(err),
			}),
			{
				status: 502,
				headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
			},
		);
	}
}
