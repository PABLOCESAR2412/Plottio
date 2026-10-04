// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WhatsAppConfigModal } from "../src/components/WhatsAppConfigModal";
import { WhatsAppQrCode } from "../src/components/WhatsAppQrCode";
import { useIntegrationsStore } from "../src/store/useIntegrationsStore";

describe("Tarea 36 (P1 - Fase 7): WhatsApp — Visualización Condicional de QR y Desacoplamiento de Test de Conexión", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		useIntegrationsStore.setState(useIntegrationsStore.getInitialState(), true);
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	describe("1. Visualización Condicional del QR post-configuración", () => {
		it("sin credenciales guardadas en el store muestra ÚNICAMENTE los inputs y NO el QR", () => {
			useIntegrationsStore.setState({
				whatsapp: {
					...useIntegrationsStore.getState().whatsapp,
					instanceName: "",
					serverUrl: "",
					apiUrl: "",
					apiKey: "",
					status: "disconnected",
				},
			});

			render(
				React.createElement(WhatsAppConfigModal, {
					isOpen: true,
					onClose: vi.fn(),
				}),
			);

			// Deben estar visibles los campos de configuración
			expect(screen.getByLabelText(/Nombre de la Instancia/i)).toBeDefined();
			expect(screen.getByLabelText(/URL del Servidor \/ Webhook/i)).toBeDefined();
			expect(screen.getByLabelText(/API Key/i)).toBeDefined();
			expect(
				screen.getByRole("button", { name: /Guardar Configuración/i }),
			).toBeDefined();

			// El código QR y sus pasos NO deben estar en el DOM
			expect(
				screen.queryByLabelText(/Código QR de WhatsApp para vincular dispositivo/i),
			).toBeNull();
			expect(
				screen.queryByText(/Pasos para vincular tu WhatsApp/i),
			).toBeNull();
		});

		it("al guardar credenciales válidas en el formulario, se oculta el formulario y se despliega el QR", async () => {
			useIntegrationsStore.setState({
				whatsapp: {
					...useIntegrationsStore.getState().whatsapp,
					instanceName: "",
					serverUrl: "",
					apiUrl: "",
					apiKey: "",
					status: "disconnected",
				},
			});

			render(
				React.createElement(WhatsAppConfigModal, {
					isOpen: true,
					onClose: vi.fn(),
				}),
			);

			const instanceInput = screen.getByLabelText(/Nombre de la Instancia/i);
			const urlInput = screen.getByLabelText(/URL del Servidor \/ Webhook/i);
			const keyInput = screen.getByLabelText(/API Key/i);
			const saveBtn = screen.getByRole("button", {
				name: /Guardar Configuración/i,
			});

			fireEvent.change(instanceInput, { target: { value: "sucursal-norte" } });
			fireEvent.change(urlInput, {
				target: { value: "https://plottio.vercel.app/api/webhook/wha" },
			});
			fireEvent.change(keyInput, { target: { value: "sec_token_999" } });

			fireEvent.click(saveBtn);

			// Debe guardarse en el store
			await waitFor(() => {
				const waState = useIntegrationsStore.getState().whatsapp;
				expect(waState.instanceName).toBe("sucursal-norte");
				expect(waState.apiKey).toBe("sec_token_999");
			});

			// Tras el feedback de guardado, debe mostrarse el Código QR
			await waitFor(
				() => {
					expect(
						screen.getByLabelText(/Código QR de WhatsApp para vincular dispositivo/i),
					).toBeDefined();
					expect(
						screen.getByText(/Pasos para vincular tu WhatsApp/i),
					).toBeDefined();
				},
				{ timeout: 1500 },
			);

			// El formulario ya no debe ser visible
			expect(screen.queryByLabelText(/Nombre de la Instancia/i)).toBeNull();
		});

		it("permite volver a editar con 'Modificar Configuración' y cancelar para volver al QR", async () => {
			useIntegrationsStore.setState({
				whatsapp: {
					...useIntegrationsStore.getState().whatsapp,
					instanceName: "taller-sur",
					serverUrl: "https://plottio.vercel.app/api/webhook/wha",
					apiUrl: "https://plottio.vercel.app/api/webhook/wha",
					apiKey: "sec_key_abc",
					status: "disconnected",
				},
			});

			render(
				React.createElement(WhatsAppConfigModal, {
					isOpen: true,
					onClose: vi.fn(),
				}),
			);

			// Con credenciales existentes, el QR es visible
			expect(
				screen.getByLabelText(/Código QR de WhatsApp para vincular dispositivo/i),
			).toBeDefined();

			// Click en Modificar Configuración
			const editBtn = screen.getByRole("button", {
				name: /Modificar Configuración/i,
			});
			fireEvent.click(editBtn);

			// Debe mostrarse el formulario y ocultarse el QR
			expect(screen.getByLabelText(/Nombre de la Instancia/i)).toBeDefined();
			expect(
				screen.queryByLabelText(/Código QR de WhatsApp para vincular dispositivo/i),
			).toBeNull();

			// Click en Cancelar
			const cancelBtn = screen.getByRole("button", { name: /Cancelar/i });
			fireEvent.click(cancelBtn);

			// Vuelve a la vista QR
			expect(
				screen.getByLabelText(/Código QR de WhatsApp para vincular dispositivo/i),
			).toBeDefined();
		});
	});

	describe("2. Desacoplamiento del Test de Conexión de la vinculación del dispositivo", () => {
		it("al probar conexión con éxito, verifica pasarela pero NO cambia status a 'connected'", async () => {
			const fetchMock = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({ status: "ok", gateway: "Plottio WhatsApp Gateway" }),
			});
			globalThis.fetch = fetchMock;

			useIntegrationsStore.setState({
				whatsapp: {
					...useIntegrationsStore.getState().whatsapp,
					instanceName: "",
					serverUrl: "",
					apiKey: "",
					status: "disconnected",
				},
			});

			render(
				React.createElement(WhatsAppConfigModal, {
					isOpen: true,
					onClose: vi.fn(),
				}),
			);

			const instanceInput = screen.getByLabelText(/Nombre de la Instancia/i);
			const urlInput = screen.getByLabelText(/URL del Servidor \/ Webhook/i);
			const keyInput = screen.getByLabelText(/API Key/i);
			const testBtn = screen.getByRole("button", { name: /Probar Conexión/i });

			fireEvent.change(instanceInput, { target: { value: "plottio-test" } });
			fireEvent.change(urlInput, {
				target: { value: "https://plottio.vercel.app/api/webhook/wha" },
			});
			fireEvent.change(keyInput, { target: { value: "secret_123" } });

			fireEvent.click(testBtn);

			await waitFor(() => {
				expect(screen.getByText(/Prueba de Conexión Exitosa/i)).toBeDefined();
				expect(
					screen.getByText(
						/Pasarela verificada con éxito\. El servidor webhook responde correctamente\. Procede a escanear el código QR para vincular tu dispositivo móvil\./i,
					),
				).toBeDefined();
			});

			// Desacoplamiento: status sigue siendo 'disconnected' (el dispositivo NO se ha vinculado aún por QR)
			expect(useIntegrationsStore.getState().whatsapp.status).toBe("disconnected");

			// Las credenciales sí se actualizaron
			expect(useIntegrationsStore.getState().whatsapp.instanceName).toBe("plottio-test");
		});
	});

	describe("3. Posibilidad permanente de vincular / re-escanear dispositivo", () => {
		it("cuando la sesión está conectada, muestra el botón 'Vincular nuevo dispositivo / Re-escanear QR' y permite re-escanear liberando el QR", () => {
			useIntegrationsStore.setState({
				whatsapp: {
					...useIntegrationsStore.getState().whatsapp,
					instanceName: "plottio-central",
					serverUrl: "https://plottio.vercel.app/api/webhook/wha",
					apiKey: "sec_key",
					status: "connected",
				},
			});

			const { unmount } = render(
				React.createElement(WhatsAppConfigModal, {
					isOpen: true,
					onClose: vi.fn(),
				}),
			);

			// El overlay de sesión vinculada está presente
			expect(screen.getByText(/Sesión Vinculada/i)).toBeDefined();

			// Debe existir el botón de re-escanear / vincular nuevo dispositivo
			const rebindButtons = screen.getAllByRole("button", {
				name: /Vincular nuevo dispositivo \/ Re-escanear QR/i,
			});
			expect(rebindButtons.length).toBeGreaterThanOrEqual(1);

			// Al hacer clic en el botón de re-escaneo
			fireEvent.click(rebindButtons[0]);

			// El estado debe cambiar a 'disconnected'
			expect(useIntegrationsStore.getState().whatsapp.status).toBe("disconnected");

			// Se retira el overlay y el badge pasa a 'Esperando escaneo'
			expect(screen.queryByText(/Sesión Vinculada/i)).toBeNull();
			expect(screen.getAllByText(/Esperando escaneo/i).length).toBeGreaterThanOrEqual(1);

			unmount();
		});

		it("el botón 'Desconectar Sesión' regresa el estado a disconnected y muestra el QR limpio", () => {
			useIntegrationsStore.setState({
				whatsapp: {
					...useIntegrationsStore.getState().whatsapp,
					instanceName: "plottio-central",
					serverUrl: "https://plottio.vercel.app/api/webhook/wha",
					apiKey: "sec_key",
					status: "connected",
				},
			});

			render(
				React.createElement(WhatsAppConfigModal, {
					isOpen: true,
					onClose: vi.fn(),
				}),
			);

			const disconnectBtn = screen.getByRole("button", {
				name: /Desconectar Sesión/i,
			});
			fireEvent.click(disconnectBtn);

			expect(useIntegrationsStore.getState().whatsapp.status).toBe("disconnected");
			expect(screen.queryByText(/Sesión Vinculada/i)).toBeNull();
			expect(screen.getAllByText(/Esperando escaneo/i).length).toBeGreaterThanOrEqual(1);
		});

		it("el componente aislado WhatsAppQrCode maneja onRebindDevice y onDisconnect adecuadamente", () => {
			const onRebindMock = vi.fn();
			const onDisconnectMock = vi.fn();
			const onEditMock = vi.fn();

			render(
				React.createElement(WhatsAppQrCode, {
					code: "test-qr",
					status: "connected",
					instanceName: "inst-test",
					serverUrl: "https://plottio.vercel.app/api/webhook/wha",
					onRebindDevice: onRebindMock,
					onDisconnect: onDisconnectMock,
					onEditCredentials: onEditMock,
				}),
			);

			// Probar click en Rebind
			const rebindBtns = screen.getAllByRole("button", {
				name: /Vincular nuevo dispositivo \/ Re-escanear QR/i,
			});
			fireEvent.click(rebindBtns[0]);
			expect(onRebindMock).toHaveBeenCalledTimes(1);

			// Probar click en Disconnect
			const disconnectBtn = screen.getByRole("button", {
				name: /Desconectar Sesión/i,
			});
			fireEvent.click(disconnectBtn);
			expect(onDisconnectMock).toHaveBeenCalledTimes(1);
		});
	});
});
