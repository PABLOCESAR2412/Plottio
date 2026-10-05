// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlottioAsistenteView } from "../src/components/PlottioAsistenteView";
import { Sidebar } from "../src/components/Sidebar";
import { AppLayout } from "../src/routes/index";
import {
	type ChatMessage,
	useIntegrationsStore,
} from "../src/store/useIntegrationsStore";
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

describe("Tarea 35 (P0 - Fase 7): Plottio Asistente como Vista Principal con Historial Persistente", () => {
	beforeEach(() => {
		vi.restoreAllMocks();

		// Inicializar session store con usuario autenticado
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

		// Inicializar integrations store con documentos indexados y estado fresco
		useIntegrationsStore.setState(useIntegrationsStore.getInitialState(), true);
		useIntegrationsStore.setState({
			rag: {
				...useIntegrationsStore.getState().rag,
				indexedDocumentsCount: 50,
				isIndexing: false,
			},
		});
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	// =========================================================================
	// 1. STORE: HISTORIAL DE CONVERSACIONES PERSISTENTE
	// =========================================================================
	describe("1. Store: Gestión persistente de hilos de conversación", () => {
		it("inicializa el store con al menos una conversación y activeConversationId", () => {
			const state = useIntegrationsStore.getState();
			expect(state.conversations).toBeDefined();
			expect(state.conversations.length).toBeGreaterThanOrEqual(1);
			expect(state.activeConversationId).toBeDefined();
			expect(state.conversations[0].messages.length).toBeGreaterThanOrEqual(1);
			expect(state.conversations[0].messages[0].id).toBe("welcome");
		});

		it("createConversation() añade un nuevo hilo al inicio y lo establece como activo", () => {
			const store = useIntegrationsStore.getState();
			const initialCount = store.conversations.length;

			const newId = store.createConversation("Hilo de Prueba 1");
			const updatedState = useIntegrationsStore.getState();

			expect(updatedState.conversations.length).toBe(initialCount + 1);
			expect(updatedState.activeConversationId).toBe(newId);
			expect(updatedState.conversations[0].id).toBe(newId);
			expect(updatedState.conversations[0].title).toBe("Hilo de Prueba 1");
			expect(updatedState.conversations[0].messages[0].role).toBe("assistant");
		});

		it("selectConversation() cambia el activeConversationId", () => {
			const store = useIntegrationsStore.getState();
			const id1 = store.createConversation("Hilo 1");
			const id2 = store.createConversation("Hilo 2");

			expect(useIntegrationsStore.getState().activeConversationId).toBe(id2);

			useIntegrationsStore.getState().selectConversation(id1);
			expect(useIntegrationsStore.getState().activeConversationId).toBe(id1);
		});

		it("deleteConversation() elimina el hilo seleccionado y ajusta el activo", () => {
			const store = useIntegrationsStore.getState();
			const id1 = store.createConversation("Conversación 1");
			const id2 = store.createConversation("Conversación 2");

			expect(useIntegrationsStore.getState().activeConversationId).toBe(id2);

			// Eliminar la activa
			useIntegrationsStore.getState().deleteConversation(id2);
			const stateAfterDelete = useIntegrationsStore.getState();

			expect(stateAfterDelete.conversations.some((c) => c.id === id2)).toBe(false);
			expect(stateAfterDelete.activeConversationId).toBe(id1);
		});

		it("deleteConversation() crea un nuevo hilo inicial si se eliminan todas las conversaciones", () => {
			const store = useIntegrationsStore.getState();
			const allIds = store.conversations.map((c) => c.id);
			for (const id of allIds) {
				useIntegrationsStore.getState().deleteConversation(id);
			}

			const state = useIntegrationsStore.getState();
			expect(state.conversations.length).toBe(1);
			expect(state.activeConversationId).toBe(state.conversations[0].id);
			expect(state.conversations[0].title).toBe("Nueva conversación");
		});

		it("addMessageToActiveConversation() actualiza el título automáticamente con el primer mensaje del usuario", () => {
			const store = useIntegrationsStore.getState();
			store.createConversation("Nueva conversación");

			const userMsg: ChatMessage = {
				id: "user-1",
				role: "user",
				text: "Consultar inventario de bobinas vinilo 3M",
				timestamp: "10:00 AM",
			};

			store.addMessageToActiveConversation(userMsg);
			const updatedConv = useIntegrationsStore
				.getState()
				.conversations.find(
					(c) => c.id === useIntegrationsStore.getState().activeConversationId,
				);

			expect(updatedConv?.messages).toHaveLength(2);
			expect(updatedConv?.title).toContain("Consultar inventario");
		});

		it("clearActiveConversation() reinicia los mensajes del hilo activo al mensaje de bienvenida", () => {
			const store = useIntegrationsStore.getState();
			store.addMessageToActiveConversation({
				id: "user-test",
				role: "user",
				text: "¿Hay órdenes pendientes hoy?",
				timestamp: "10:05 AM",
			});

			store.clearActiveConversation();
			const activeConv = useIntegrationsStore
				.getState()
				.conversations.find(
					(c) => c.id === useIntegrationsStore.getState().activeConversationId,
				);

			expect(activeConv?.messages).toHaveLength(1);
			expect(activeConv?.messages[0].id).toBe("welcome");
			expect(activeConv?.title).toBe("Nueva conversación");
		});
	});

	// =========================================================================
	// 2. VISTA PRINCIPAL: PlottioAsistenteView
	// =========================================================================
	describe("2. Componente PlottioAsistenteView", () => {
		it("renderiza el panel izquierdo de historial y el panel derecho de chat", () => {
			render(React.createElement(PlottioAsistenteView));

			// Header del historial
			expect(screen.getByText(/Historial de Chats/i)).not.toBeNull();

			// Botón de nueva conversación
			expect(
				screen.getByRole("button", { name: /Nueva Conversación/i }),
			).not.toBeNull();

			// Header principal del agente
			expect(screen.getAllByText(/Plottio Asistente/i).length).toBeGreaterThan(0);

			// Tabs de navegación interna
			expect(screen.getByRole("button", { name: /^Chat$/i })).not.toBeNull();
			expect(screen.getByRole("button", { name: /Herramientas/i })).not.toBeNull();
			expect(screen.getByRole("button", { name: /Configuración/i })).not.toBeNull();

			// Input del chat
			expect(
				screen.getByPlaceholderText(
					/Pregunta a Plottio Asistente sobre órdenes, clientes o inventario/i,
				),
			).not.toBeNull();
		});

		it("el botón '+ Nueva Conversación' crea y activa un nuevo hilo en la vista", () => {
			render(React.createElement(PlottioAsistenteView));

			const newThreadBtn = screen.getByRole("button", {
				name: /Nueva Conversación/i,
			});
			const initialThreads = useIntegrationsStore.getState().conversations.length;

			fireEvent.click(newThreadBtn);

			const currentThreads = useIntegrationsStore.getState().conversations.length;
			expect(currentThreads).toBe(initialThreads + 1);
		});

		it("permite seleccionar una conversación previa y mostrar sus mensajes", () => {
			const store = useIntegrationsStore.getState();
			store.createConversation("Hilo Antiguo");
			store.addMessageToActiveConversation({
				id: "msg-antiguo-1",
				role: "user",
				text: "Texto único del hilo antiguo",
				timestamp: "09:00 AM",
			});

			store.createConversation("Hilo Reciente");
			store.addMessageToActiveConversation({
				id: "msg-reciente-1",
				role: "user",
				text: "Texto único del hilo reciente",
				timestamp: "09:30 AM",
			});

			render(React.createElement(PlottioAsistenteView));

			// Al inicio estamos en Hilo Reciente
			expect(
				screen.getAllByText(/Texto único del hilo reciente/i).length,
			).toBeGreaterThan(0);

			// Click en Hilo Antiguo (en la lista del historial)
			const antiguoItems = screen.getAllByText(/Hilo Antiguo/i);
			fireEvent.click(antiguoItems[0]);

			// Ahora debe verse el mensaje del hilo antiguo
			expect(
				screen.getAllByText(/Texto único del hilo antiguo/i).length,
			).toBeGreaterThan(0);
		});

		it("el botón de eliminar conversación en el sidebar de historial elimina el hilo", () => {
			const store = useIntegrationsStore.getState();
			store.createConversation("Conversación Para Borrar");

			render(React.createElement(PlottioAsistenteView));

			expect(screen.getByText("Conversación Para Borrar")).not.toBeNull();

			// Buscar botón de eliminar conversación
			const deleteBtns = screen.getAllByRole("button", {
				name: /Eliminar conversación/i,
			});
			expect(deleteBtns.length).toBeGreaterThan(0);

			fireEvent.click(deleteBtns[0]);

			expect(screen.queryByText("Conversación Para Borrar")).toBeNull();
		});

		it("el botón de limpiar chat actual en el header reinicia los mensajes del hilo activo", () => {
			const store = useIntegrationsStore.getState();
			store.addMessageToActiveConversation({
				id: "user-msg-clear",
				role: "user",
				text: "Mensaje que va a ser limpiado",
				timestamp: "11:00 AM",
			});

			render(React.createElement(PlottioAsistenteView));

			expect(
				screen.getAllByText("Mensaje que va a ser limpiado").length,
			).toBeGreaterThan(0);

			const clearBtn = screen.getByRole("button", {
				name: /Limpiar chat actual/i,
			});
			fireEvent.click(clearBtn);

			expect(screen.queryByText("Mensaje que va a ser limpiado")).toBeNull();
			expect(
				screen.getByText(/Soy Plottio Asistente, tu copiloto operacional/i),
			).not.toBeNull();
		});

		it("cambia a la pestaña 'Herramientas' y lista las funciones operacionales", () => {
			render(React.createElement(PlottioAsistenteView));

			const toolsBtn = screen.getByRole("button", { name: /Herramientas/i });
			fireEvent.click(toolsBtn);

			expect(
				screen.getByText(/Herramientas de Negocio del Asistente/i),
			).not.toBeNull();
			expect(screen.getByText(/consultar_clientes\(\)/i)).not.toBeNull();
			expect(screen.getByText(/consultar_ordenes\(\)/i)).not.toBeNull();
		});

		it("cambia a la pestaña 'Configuración' y permite modificar nombre y prompt", () => {
			render(React.createElement(PlottioAsistenteView));

			const configBtn = screen.getByRole("button", { name: /Configuración/i });
			fireEvent.click(configBtn);

			expect(
				screen.getByText(/Configuración del Asistente & Modelo LLM/i),
			).not.toBeNull();

			const nameInput = screen.getByLabelText(/Nombre del Asistente:/i);
			fireEvent.change(nameInput, {
				target: { value: "Copiloto Taller Pro" },
			});

			const submitBtn = screen.getByRole("button", {
				name: /Guardar Configuración/i,
			});
			fireEvent.click(submitBtn);

			expect(useIntegrationsStore.getState().agent.nombre).toBe(
				"Copiloto Taller Pro",
			);
		});

		it("los mensajes enviados se persisten en el store y no se pierden", async () => {
			render(React.createElement(PlottioAsistenteView));

			const textarea = screen.getByPlaceholderText(
				/Pregunta a Plottio Asistente sobre órdenes, clientes o inventario/i,
			);
			const submitBtn = screen.getByRole("button", {
				name: /Enviar mensaje/i,
			});

			fireEvent.change(textarea, {
				target: { value: "¿Cuáles órdenes están listas?" },
			});
			fireEvent.click(submitBtn);

			// Verificar que el mensaje del usuario existe en el store
			const activeId = useIntegrationsStore.getState().activeConversationId;
			const conv = useIntegrationsStore
				.getState()
				.conversations.find((c) => c.id === activeId);

			const userMsg = conv?.messages.find(
				(m) => m.text === "¿Cuáles órdenes están listas?",
			);
			expect(userMsg).toBeDefined();
			expect(userMsg?.role).toBe("user");
		});
	});

	// =========================================================================
	// 3. SIDEBAR: ACCESO DIRECTO A PLOTTIO ASISTENTE
	// =========================================================================
	describe("3. Sidebar: Acceso exclusivo desde el header global y NO en Sidebar", () => {
		it("NO renderiza el botón 'Plottio Asistente' en la navegación del Sidebar para mantener la barra limpia", () => {
			render(
				React.createElement(Sidebar, {
					activeTab: "dashboard",
					onNavigate: vi.fn(),
					isOpenMobile: false,
					onCloseMobile: vi.fn(),
				}),
			);

			const asistenteBtns = screen.queryAllByRole("button", {
				name: /Plottio Asistente/i,
			});
			expect(asistenteBtns.length).toBe(0);
		});
	});

	// =========================================================================
	// 4. INTEGRACIÓN GLOBAL: AppLayout y Botón Superior en Header
	// =========================================================================
	describe("4. Header y Atajo Global en AppLayout", () => {
		it("al hacer click en el botón de header 'Plottio Asistente', navega a la pestaña asistente", () => {
			render(React.createElement(AppLayout));

			// Al inicio estamos en Dashboard / Panel
			expect(screen.getAllByText(/Panel de Control/i).length).toBeGreaterThan(0);

			// Click en botón de Header 'Plottio Asistente'
			const headerBtn = screen.getByTitle(/Consultar con Plottio Asistente/i);
			fireEvent.click(headerBtn);

			// Ahora debe estar activa la vista del asistente
			expect(screen.getAllByText(/Plottio Asistente/i).length).toBeGreaterThan(0);
			expect(screen.getByText(/Historial de Chats/i)).not.toBeNull();
		});

		it("el atajo de teclado Cmd+K / Ctrl+K alterna la pestaña a 'asistente'", () => {
			render(React.createElement(AppLayout));

			expect(screen.getAllByText(/Panel de Control/i).length).toBeGreaterThan(0);

			// Disparar evento keydown con metaKey + k
			fireEvent.keyDown(window, { key: "k", metaKey: true });

			// Debe estar en Plottio Asistente
			expect(screen.getByText(/Historial de Chats/i)).not.toBeNull();

			// Disparar de nuevo para volver
			fireEvent.keyDown(window, { key: "k", metaKey: true });
			expect(screen.queryByText(/Historial de Chats/i)).toBeNull();
		});
	});
});
