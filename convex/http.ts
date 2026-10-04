import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
	"Access-Control-Allow-Headers":
		"Content-Type, x-webhook-secret, Authorization",
};

// ============================================================================
// 1. ENDPOINT OFICIAL WHATSAPP: /api/webhook/wha
// ============================================================================
http.route({
	path: "/api/webhook/wha",
	method: "OPTIONS",
	handler: httpAction(async () => {
		return new Response(null, {
			status: 204,
			headers: CORS_HEADERS,
		});
	}),
});

http.route({
	path: "/api/webhook/wha",
	method: "GET",
	handler: httpAction(async () => {
		return new Response(
			JSON.stringify({
				status: "ok",
				gateway: "Plottio WhatsApp Gateway",
				event: "ack",
				timestamp: new Date().toISOString(),
			}),
			{
				status: 200,
				headers: {
					"Content-Type": "application/json",
					...CORS_HEADERS,
				},
			},
		);
	}),
});

http.route({
	path: "/api/webhook/wha",
	method: "POST",
	handler: httpAction(async (_ctx, request) => {
		let payload: any = {};
		try {
			payload = await request.json();
		} catch {
			payload = {};
		}

		return new Response(
			JSON.stringify({
				status: "ok",
				gateway: "Plottio WhatsApp Gateway",
				event: payload?.event || "ack",
				timestamp: new Date().toISOString(),
			}),
			{
				status: 200,
				headers: {
					"Content-Type": "application/json",
					...CORS_HEADERS,
				},
			},
		);
	}),
});

// ============================================================================
// 2. ENDPOINT OFICIAL WEBHOOKS GENERALES: /api/webhooks
// ============================================================================
http.route({
	path: "/api/webhooks",
	method: "OPTIONS",
	handler: httpAction(async () => {
		return new Response(null, {
			status: 204,
			headers: CORS_HEADERS,
		});
	}),
});

http.route({
	path: "/api/webhooks",
	method: "GET",
	handler: httpAction(async () => {
		return new Response(
			JSON.stringify({
				status: "ok",
				gateway: "Plottio General Webhooks",
				received: true,
				event: "ack",
				timestamp: new Date().toISOString(),
			}),
			{
				status: 200,
				headers: {
					"Content-Type": "application/json",
					...CORS_HEADERS,
				},
			},
		);
	}),
});

http.route({
	path: "/api/webhooks",
	method: "POST",
	handler: httpAction(async (_ctx, request) => {
		let payload: any = {};
		try {
			payload = await request.json();
		} catch {
			payload = {};
		}

		return new Response(
			JSON.stringify({
				status: "ok",
				gateway: "Plottio General Webhooks",
				received: true,
				event: payload?.event || "ack",
				timestamp: new Date().toISOString(),
			}),
			{
				status: 200,
				headers: {
					"Content-Type": "application/json",
					...CORS_HEADERS,
				},
			},
		);
	}),
});

export default http;
