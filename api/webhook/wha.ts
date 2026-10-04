// Vercel Serverless Function & Edge Handler para Webhook de WhatsApp
export const CORS_HEADERS: Record<string, string> = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
	"Access-Control-Allow-Headers":
		"Content-Type, x-webhook-secret, Authorization",
};

export default async function handler(
	req: any,
	res?: any,
): Promise<Response | void> {
	// 1. Manejo para runtime tradicional Node.js en Vercel (req, res)
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

		let payload: any = {};
		if (typeof req.body === "object" && req.body !== null) {
			payload = req.body;
		} else if (typeof req.body === "string" && req.body.trim()) {
			try {
				payload = JSON.parse(req.body);
			} catch {
				payload = {};
			}
		}

		const responseData = {
			status: "ok",
			gateway: "Plottio WhatsApp Gateway",
			event: payload?.event || "ack",
			timestamp: new Date().toISOString(),
		};

		return res.status(200).json(responseData);
	}

	// 2. Manejo para runtime Web Standard / Fetch API (Request -> Response)
	const method = req?.method || "GET";

	if (method === "OPTIONS") {
		return new Response(null, {
			status: 204,
			headers: CORS_HEADERS,
		});
	}

	let payload: any = {};
	if (req && typeof req.json === "function") {
		try {
			payload = await req.json();
		} catch {
			payload = {};
		}
	} else if (req?.body && typeof req.body === "object") {
		payload = req.body;
	}

	const responseData = {
		status: "ok",
		gateway: "Plottio WhatsApp Gateway",
		event: payload?.event || "ack",
		timestamp: new Date().toISOString(),
	};

	return new Response(JSON.stringify(responseData), {
		status: 200,
		headers: {
			"Content-Type": "application/json",
			...CORS_HEADERS,
		},
	});
}

export const GET = (req: Request) => handler(req);
export const POST = (req: Request) => handler(req);
export const OPTIONS = (req: Request) => handler(req);
