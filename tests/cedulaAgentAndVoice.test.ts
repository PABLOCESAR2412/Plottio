// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlottioAsistenteModal } from "../src/components/PlottioAsistenteModal";
import { PlottioAsistenteView } from "../src/components/PlottioAsistenteView";
import { WhatsAppQrCode } from "../src/components/WhatsAppQrCode";
import { executeBusinessAgent } from "../src/services/plottioAgent";
import { useIntegrationsStore } from "../src/store/useIntegrationsStore";
import { useSessionStore } from "../src/store/useSessionStore";

// Mock de Convex
vi.mock("convex/react", () => {
	const mockResult: any = [];
	mockResult.valida = true;
	return {
		useQuery: vi.fn().mockImplementation(() => mockResult),
		useMutation: vi.fn().mockReturnValue(vi.fn()),
		useAction: vi.fn().mockReturnValue(vi.fn()),
	};
});

describe("Lógica de Cédula/RUC en Agente, Dictado por Voz y QR Real de WhatsApp", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		useSessionStore.setState({
			currentUser: {
				id: "usr-admin-1",
				nombre: "Admin Taller",
				email: "admin@plottio.com",
				rol: "SuperAdmin",
				empresaId: "emp-1",
				activo: true,
			},
		});
		useIntegrationsStore.setState(useIntegrationsStore.getInitialState(), true);
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	// =========================================================================
	// 1. LÓGICA DE NEGOCIO DEL AGENTE CON CÉDULA / RUC
	// =========================================================================
	describe("1. Consulta y Validación de Cédula / RUC en Plottio Asistente", () => {
		const mockBusinessData = {
			clientes: [
				{
					id: "cli-1",
					nombre: "Carlos Andrade",
					identificacion: "1710034065", // Cédula ecuatoriana válida
					telefono: "0991234567",
					email: "carlos@andrade.com",
				},
			],
			empresas: [
				{
					id: "emp-1",
					nombre: "Plottio Central",
					ruc: "1790011223001",
					activa: true,
				},
			],
		};

		it("cuando el usuario ingresa una cédula registrada, recupera inmediatamente la ficha del cliente", () => {
			const res = executeBusinessAgent("1710034065", {
				assistantName: "Plottio Asistente",
				businessData: mockBusinessData,
			});

			expect(res.response).toContain("Cliente registrado en el sistema");
			expect(res.response).toContain("Carlos Andrade");
			expect(res.response).toContain("1710034065");
			expect(res.toolsCalled.some((t) => t.toolName === "consultar_clientes")).toBe(
				true,
			);
		});

		it("cuando el usuario ingresa una cédula válida NO registrada, valida el algoritmo oficial e invita a registrarla", () => {
			// 0926687856 es una cédula ecuatoriana válida verificada
			const res = executeBusinessAgent("0926687856", {
				assistantName: "Plottio Asistente",
				businessData: mockBusinessData,
			});

			expect(res.response).toContain("es válida conforme al algoritmo oficial");
			expect(res.response).toContain(
				"¿Deseas dar de alta a este cliente o vincularlo a una empresa?",
			);
			expect(res.toolsCalled.some((t) => t.toolName === "consultar_clientes")).toBe(
				true,
			);
		});

		it("cuando el usuario ingresa un número con dígito verificador inválido, notifica el fallo de validación", () => {
			// 1710034069 tiene el dígito verificador erróneo
			const res = executeBusinessAgent("1710034069", {
				assistantName: "Plottio Asistente",
				businessData: mockBusinessData,
			});

			expect(res.response).toContain("no cumple con el algoritmo oficial de verificación");
			expect(res.response).toContain("dígito verificador incorrecto");
		});

		it("reconoce un RUC de 13 dígitos de persona jurídica válida", () => {
			const res = executeBusinessAgent("1790011223001", {
				assistantName: "Plottio Asistente",
				businessData: mockBusinessData,
			});

			expect(res.response).toContain("RUC");
			expect(res.toolsCalled.some((t) => t.toolName === "consultar_clientes")).toBe(
				true,
			);
		});
	});

	// =========================================================================
	// 2. BOTÓN DE DICTADO POR VOZ Y OCULTAMIENTO DE SUGERENCIAS
	// =========================================================================
	describe("2. Dictado por Voz y Limpieza de Sugerencias tras el Primer Mensaje", () => {
		it("PlottioAsistenteView incluye el botón de dictado de voz junto al botón de envío", () => {
			render(React.createElement(PlottioAsistenteView));

			const micBtn = screen.getByRole("button", {
				name: /Dictar consulta por voz/i,
			});
			expect(micBtn).toBeDefined();

			const sendBtn = screen.getByRole("button", {
				name: /Enviar mensaje/i,
			});
			expect(sendBtn).toBeDefined();
		});

		it("PlottioAsistenteModal incluye el botón de dictado de voz", () => {
			render(
				React.createElement(PlottioAsistenteModal, {
					isOpen: true,
					onClose: vi.fn(),
				}),
			);

			const micBtn = screen.getByRole("button", {
				name: /Dictar consulta por voz/i,
			});
			expect(micBtn).toBeDefined();
		});

		it("oculta las sugerencias rápidas cuando el usuario ya ha enviado al menos un mensaje", () => {
			useIntegrationsStore.setState({
				rag: {
					...useIntegrationsStore.getState().rag,
					indexedDocumentsCount: 20,
				},
			});

			const { rerender } = render(React.createElement(PlottioAsistenteView));

			// Al inicio (sin mensajes del usuario), las sugerencias son visibles
			expect(screen.getByText(/Sugerencias:/i)).toBeDefined();

			// Enviar un mensaje
			const store = useIntegrationsStore.getState();
			store.addMessageToActiveConversation({
				id: "msg-user-1",
				role: "user",
				text: "Consulta inicial del operario",
				timestamp: "12:00",
			});

			rerender(React.createElement(PlottioAsistenteView));

			// Las sugerencias deben haberse ocultado automáticamente
			expect(screen.queryByText(/Sugerencias:/i)).toBeNull();
		});
	});

	// =========================================================================
	// 3. WHATSAPP QR CODE: RENDERIZADO OFICIAL Y ESCANEABLE
	// =========================================================================
	describe("3. Código QR Real de WhatsApp con librería qrcode", () => {
		it("genera y renderiza una imagen PNG data URL escaneable", async () => {
			render(
				React.createElement(WhatsAppQrCode, {
					code: "2@plottio_acadia_pairing_string_999",
					status: "disconnected",
					instanceName: "plottio-central",
					serverUrl: "https://plottio.vercel.app/api/webhook/wha",
					onEditCredentials: vi.fn(),
				}),
			);

			await waitFor(() => {
				const img = screen.getByRole("img", {
					name: /Código QR de WhatsApp para vincular dispositivo/i,
				});
				expect(img).toBeDefined();
			});
		});

		it("renderiza directamente cuando code es una URL en base64 de imagen", async () => {
			const fakeBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

			render(
				React.createElement(WhatsAppQrCode, {
					code: fakeBase64,
					status: "disconnected",
					instanceName: "plottio-central",
					serverUrl: "https://plottio.vercel.app/api/webhook/wha",
					onEditCredentials: vi.fn(),
				}),
			);

			await waitFor(() => {
				const img = screen.getByAltText(
					/Código QR de WhatsApp para vincular dispositivo/i,
				);
				expect(img.getAttribute("src")).toBe(fakeBase64);
			});
		});
	});
});
