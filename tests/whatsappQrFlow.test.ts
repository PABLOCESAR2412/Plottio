// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WhatsAppConfigModal } from "../src/components/WhatsAppConfigModal";
import { useIntegrationsStore } from "../src/store/useIntegrationsStore";

describe("Tarea 25 (P1 - Fase 4): WhatsApp — Ocultación de Credenciales y Visualización de Código QR", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		useIntegrationsStore.setState(useIntegrationsStore.getInitialState(), true);
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	// =========================================================================
	// 1. OCULTACIÓN DE CREDENCIALES Y VISUALIZACIÓN DE QR
	// =========================================================================
	describe("1. Flujo de Configuración y Ocultación de Credenciales", () => {
		it("al abrir con credenciales existentes, los campos de texto están ocultos y se muestra la vista QR", () => {
			// El estado inicial ya tiene instanceName, serverUrl y apiKey
			render(React.createElement(WhatsAppConfigModal, { isOpen: true, onClose: vi.fn() }));

			// Los campos de texto NO deben estar visibles en el DOM
			expect(screen.queryByLabelText(/Nombre de la Instancia/i)).toBeNull();
			expect(screen.queryByLabelText(/URL del Servidor/i)).toBeNull();
			expect(screen.queryByLabelText(/API Key/i)).toBeNull();

			// El código QR debe estar presente
			expect(
				screen.getByRole("img", {
					name: /Código QR de WhatsApp para vincular dispositivo/i,
				}),
			).toBeDefined();
		});

		it("al iniciar sin credenciales, muestra los campos de entrada editables", () => {
			// Borramos las credenciales del store
			useIntegrationsStore.setState({
				whatsapp: {
					...useIntegrationsStore.getState().whatsapp,
					instanceName: "",
					serverUrl: "",
					apiKey: "",
				},
			});

			render(React.createElement(WhatsAppConfigModal, { isOpen: true, onClose: vi.fn() }));

			// Deben estar visibles los inputs de entrada
			expect(screen.getByLabelText(/Nombre de la Instancia/i)).toBeDefined();
			expect(screen.getByLabelText(/URL del Servidor/i)).toBeDefined();
			expect(screen.getByLabelText(/API Key/i)).toBeDefined();
			expect(
				screen.getByRole("button", { name: /Guardar Configuración/i }),
			).toBeDefined();
		});

		it("al guardar credenciales válidas, los campos de entrada se ocultan y se muestra la vista del Código QR", async () => {
			useIntegrationsStore.setState({
				whatsapp: {
					...useIntegrationsStore.getState().whatsapp,
					instanceName: "",
					serverUrl: "",
					apiKey: "",
				},
			});

			render(React.createElement(WhatsAppConfigModal, { isOpen: true, onClose: vi.fn() }));

			const instanceInput = screen.getByLabelText(/Nombre de la Instancia/i);
			const serverUrlInput = screen.getByLabelText(/URL del Servidor/i);
			const apiKeyInput = screen.getByLabelText(/API Key/i);
			const saveBtn = screen.getByRole("button", { name: /Guardar Configuración/i });

			fireEvent.change(instanceInput, { target: { value: "plottio-sucursal-norte" } });
			fireEvent.change(serverUrlInput, {
				target: { value: "https://acadia.simcodec.workers.dev/api/webhook/wha" },
			});
			fireEvent.change(apiKeyInput, { target: { value: "sec_test_token_8899" } });

			fireEvent.click(saveBtn);

			// Esperamos a que la transición oculte los campos y muestre el QR
			await waitFor(() => {
				expect(screen.queryByLabelText(/Nombre de la Instancia/i)).toBeNull();
				expect(
					screen.getByRole("img", {
						name: /Código QR de WhatsApp para vincular dispositivo/i,
					}),
				).toBeDefined();
			});

			// Comprobamos persistencia en el store
			const state = useIntegrationsStore.getState();
			expect(state.whatsapp.instanceName).toBe("plottio-sucursal-norte");
			expect(state.whatsapp.apiKey).toBe("sec_test_token_8899");
		});

		it("existe el botón 'Modificar Configuración' / 'Editar Credenciales' y al pulsarlo vuelve a mostrar los inputs", async () => {
			render(React.createElement(WhatsAppConfigModal, { isOpen: true, onClose: vi.fn() }));

			// Verificamos que el botón existe
			const editBtn = screen.getByRole("button", {
				name: /Modificar Configuración/i,
			});
			expect(editBtn).toBeDefined();

			// Lo pulsamos
			fireEvent.click(editBtn);

			// Ahora deben mostrarse de nuevo los campos editables
			await waitFor(() => {
				expect(screen.getByLabelText(/Nombre de la Instancia/i)).toBeDefined();
				expect(screen.getByLabelText(/URL del Servidor/i)).toBeDefined();
				expect(screen.getByLabelText(/API Key/i)).toBeDefined();
				expect(screen.getByRole("button", { name: /Guardar Configuración/i })).toBeDefined();
				expect(screen.getByRole("button", { name: /Cancelar/i })).toBeDefined();
			});

			// Si cancelamos, vuelve a la vista QR
			const cancelBtn = screen.getByRole("button", { name: /Cancelar/i });
			fireEvent.click(cancelBtn);

			await waitFor(() => {
				expect(screen.queryByLabelText(/Nombre de la Instancia/i)).toBeNull();
				expect(
					screen.getByRole("img", {
						name: /Código QR de WhatsApp para vincular dispositivo/i,
					}),
				).toBeDefined();
			});
		});
	});

	// =========================================================================
	// 2. VISUALIZACIÓN DEL CÓDIGO QR, GUÍA Y BADGES
	// =========================================================================
	describe("2. Visualización del Código QR y Guía de Escaneo", () => {
		it("muestra las 4 instrucciones requeridas para vincular desde la app de WhatsApp", () => {
			render(React.createElement(WhatsAppConfigModal, { isOpen: true, onClose: vi.fn() }));

			expect(
				screen.getByText(/Abre WhatsApp en tu teléfono móvil/i),
			).toBeDefined();
			expect(
				screen.getByText(/Ve a Ajustes \/ Menú → Dispositivos vinculados/i),
			).toBeDefined();
			expect(
				screen.getByText(/Toca en "Vincular un dispositivo"/i),
			).toBeDefined();
			expect(
				screen.getByText(/Escanea el código QR que aparece en pantalla/i),
			).toBeDefined();
		});

		it("muestra el badge de estado 'Esperando escaneo' cuando la sesión está desconectada", () => {
			useIntegrationsStore.setState({
				whatsapp: {
					...useIntegrationsStore.getState().whatsapp,
					status: "disconnected",
				},
			});

			render(React.createElement(WhatsAppConfigModal, { isOpen: true, onClose: vi.fn() }));

			const badge = screen.getByTestId("whatsapp-status-badge");
			expect(badge.textContent).toContain("Esperando escaneo");
		});

		it("muestra el badge de estado 'Sesión activa' cuando la sesión está conectada", () => {
			useIntegrationsStore.setState({
				whatsapp: {
					...useIntegrationsStore.getState().whatsapp,
					status: "connected",
				},
			});

			render(React.createElement(WhatsAppConfigModal, { isOpen: true, onClose: vi.fn() }));

			const badge = screen.getByTestId("whatsapp-status-badge");
			expect(badge.textContent).toContain("Sesión activa");
		});

		it("muestra los detalles no sensibles de la conexión (instancia y URL worker)", () => {
			render(React.createElement(WhatsAppConfigModal, { isOpen: true, onClose: vi.fn() }));

			expect(screen.getByText("plottio-central")).toBeDefined();
			expect(
				screen.getByText("https://acadia.simcodec.workers.dev/api/webhook/wha"),
			).toBeDefined();
		});

		it("el botón 'Actualizar QR / Refrescar Código' invoca la regeneración del código", async () => {
			render(React.createElement(WhatsAppConfigModal, { isOpen: true, onClose: vi.fn() }));

			const refreshBtn = screen.getByRole("button", {
				name: /Actualizar QR \/ Refrescar Código/i,
			});
			expect(refreshBtn).toBeDefined();

			fireEvent.click(refreshBtn);

			// Comprobamos que el store actualizó el qrCode
			await waitFor(() => {
				const state = useIntegrationsStore.getState();
				expect(state.whatsapp.qrCode).toMatch(/^2@plottio_acadia_/);
			});
		});
	});

	// =========================================================================
	// 3. DESCONEXIÓN Y REINICIO DE ESTADO
	// =========================================================================
	describe("3. Desconexión de Sesión y Reinicio de Estado", () => {
		it("el botón 'Desconectar Sesión' reinicia el estado a 'disconnected'", async () => {
			// Simulamos que la sesión está conectada
			useIntegrationsStore.setState({
				whatsapp: {
					...useIntegrationsStore.getState().whatsapp,
					status: "connected",
				},
			});

			render(React.createElement(WhatsAppConfigModal, { isOpen: true, onClose: vi.fn() }));

			// Verificamos que aparece el botón de desconectar
			const disconnectBtn = screen.getByRole("button", {
				name: /Desconectar Sesión/i,
			});
			expect(disconnectBtn).toBeDefined();

			fireEvent.click(disconnectBtn);

			// Esperamos a que el estado cambie a disconnected
			await waitFor(() => {
				const state = useIntegrationsStore.getState();
				expect(state.whatsapp.status).toBe("disconnected");
			});

			// El badge debe volver a 'Esperando escaneo'
			const badge = screen.getByTestId("whatsapp-status-badge");
			expect(badge.textContent).toContain("Esperando escaneo");
		});
	});
});
