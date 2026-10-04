// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlottioAsistenteModal } from "../src/components/PlottioAsistenteModal";
import {
	ASISTENTE_SEGURIDAD_RECHAZO,
	BUSINESS_TOOLS,
} from "../src/services/plottioAgent";
import { useIntegrationsStore } from "../src/store/useIntegrationsStore";

describe("Tarea 26 (P1 - Fase 4): Rediseño Impeccable del Chat de Plottio Asistente", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		useIntegrationsStore.setState(useIntegrationsStore.getInitialState(), true);
		// Asegurar que RAG tenga documentos indexados por defecto
		useIntegrationsStore.setState({
			rag: {
				...useIntegrationsStore.getState().rag,
				indexedDocumentsCount: 42,
				isIndexing: false,
			},
		});
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	// =========================================================================
	// 1. RENDERIZADO Y HEADER IMPECCABLE
	// =========================================================================
	describe("1. Layout y Header Impeccable", () => {
		it("no renderiza nada cuando isOpen es false", () => {
			const { container } = render(
				React.createElement(PlottioAsistenteModal, {
					isOpen: false,
					onClose: vi.fn(),
				}),
			);
			expect(container.firstChild).toBeNull();
		});

		it("renderiza el modal abierto con backdrop blur y bordes suaves", () => {
			const { container } = render(
				React.createElement(PlottioAsistenteModal, {
					isOpen: true,
					onClose: vi.fn(),
				}),
			);
			const modalContainer = container.querySelector(".backdrop-blur-md");
			expect(modalContainer).not.toBeNull();
			expect(modalContainer?.className).toContain("border-border/60");
			expect(modalContainer?.className).toContain("bg-card/95");
		});

		it("muestra el nombre del asistente, badge de RAG Operacional y modo Sandbox", () => {
			render(
				React.createElement(PlottioAsistenteModal, {
					isOpen: true,
					onClose: vi.fn(),
				}),
			);

			// Nombre del asistente
			expect(screen.getAllByText(/Plottio Asistente/i).length).toBeGreaterThan(0);

			// Badge RAG Operacional
			expect(screen.getAllByText(/RAG Operacional/i).length).toBeGreaterThan(0);

			// Badge Modo Demostración
			expect(
				screen.getAllByText(/Modo Demostración \/ Sandbox/i).length,
			).toBeGreaterThan(0);

			// Subtítulo
			expect(
				screen.getByText(
					/Agentic RAG de Negocio · Órdenes, Clientes, Inventario & Cotizaciones/i,
				),
			).toBeDefined();
		});

		it("muestra badge 'Sin indexar' si no hay documentos indexados", () => {
			useIntegrationsStore.setState({
				rag: {
					...useIntegrationsStore.getState().rag,
					indexedDocumentsCount: 0,
				},
			});

			render(
				React.createElement(PlottioAsistenteModal, {
					isOpen: true,
					onClose: vi.fn(),
				}),
			);
			expect(screen.getByText(/Sin indexar/i)).toBeDefined();
		});

		it("cuenta con botón de cierre accesible que invoca onClose", () => {
			const handleClose = vi.fn();
			render(
				React.createElement(PlottioAsistenteModal, {
					isOpen: true,
					onClose: handleClose,
				}),
			);

			const closeButton = screen.getByRole("button", {
				name: /Cerrar modal/i,
			});
			fireEvent.click(closeButton);

			expect(handleClose).toHaveBeenCalledTimes(1);
		});
	});

	// =========================================================================
	// 2. BURBUJAS Y ESTRUCTURA DE MENSAJERÍA
	// =========================================================================
	describe("2. Burbujas y Mensajería", () => {
		it("renderiza la bienvenida del asistente con micro-timestamp y card sofisticada", () => {
			const { container } = render(
				React.createElement(PlottioAsistenteModal, {
					isOpen: true,
					onClose: vi.fn(),
				}),
			);

			// Micro-timestamp del asistente
			expect(screen.getByText(/· Ahora/i)).toBeDefined();

			// Card sofisticada del asistente con clases requeridas
			const assistantCard = container.querySelector(
				".rounded-2xl.rounded-tl-xs.bg-muted\\/40",
			);
			expect(assistantCard).not.toBeNull();
			expect(assistantCard?.className).toContain("border-border/50");
			expect(assistantCard?.textContent).toContain("¡Hola! Soy Plottio Asistente");
		});

		it("renderiza la burbuja de usuario con diseño moderno y micro-timestamp tras enviar mensaje", async () => {
			const { container } = render(
				React.createElement(PlottioAsistenteModal, {
					isOpen: true,
					onClose: vi.fn(),
				}),
			);

			const textarea = screen.getByPlaceholderText(
				/Pregunta a Plottio Asistente o solicita una acción de negocio.../i,
			);
			const sendButton = screen.getByRole("button", { name: /Enviar mensaje/i });

			fireEvent.change(textarea, { target: { value: "Hola copiloto" } });
			fireEvent.click(sendButton);

			// Micro-timestamp del usuario
			expect(screen.getByText("Tú")).toBeDefined();

			// Burbuja de usuario
			const userBubble = container.querySelector(
				".rounded-2xl.rounded-tr-xs.bg-primary.text-primary-foreground",
			);
			expect(userBubble).not.toBeNull();
			expect(userBubble?.textContent).toContain("Hola copiloto");
		});
	});

	// =========================================================================
	// 3. CHIPS DE HERRAMIENTAS INVOCADAS (AGENTIC RAG)
	// =========================================================================
	describe("3. Visualización de Herramientas de Negocio Invocadas", () => {
		it("muestra chips de herramientas invocadas cuando el agente ejecuta una acción", async () => {
			const { container } = render(
				React.createElement(PlottioAsistenteModal, {
					isOpen: true,
					onClose: vi.fn(),
				}),
			);

			const textarea = screen.getByPlaceholderText(
				/Pregunta a Plottio Asistente o solicita una acción de negocio.../i,
			);
			const sendButton = screen.getByRole("button", { name: /Enviar mensaje/i });

			// Consulta sobre orden de trabajo
			fireEvent.change(textarea, {
				target: { value: "¿Cuál es el estado de la orden Chevrolet D-Max?" },
			});
			fireEvent.click(sendButton);

			// Debe aparecer el chip de herramienta invocada
			await waitFor(() => {
				const toolChip = screen.getByText(/consultar_ordenes\(\) · Operacional/i);
				expect(toolChip).toBeDefined();
			});

			// Validar clases del chip
			const chipElement = container.querySelector(".font-mono.font-medium");
			expect(chipElement).not.toBeNull();
			expect(chipElement?.className).toContain("bg-primary/10");
			expect(chipElement?.className).toContain("text-primary");
			expect(chipElement?.className).toContain("border-primary/20");
		});
	});

	// =========================================================================
	// 4. CITAS CONTEXTUALES RAG DESPLEGABLES (COLLAPSIBLE CITATIONS)
	// =========================================================================
	describe("4. Citas Contextuales de RAG Desplegables", () => {
		it("permite colapsar y expandir las fuentes de contexto recuperadas con su botón interactivo", async () => {
			render(
				React.createElement(PlottioAsistenteModal, {
					isOpen: true,
					onClose: vi.fn(),
				}),
			);

			const textarea = screen.getByPlaceholderText(
				/Pregunta a Plottio Asistente o solicita una acción de negocio.../i,
			);
			const sendButton = screen.getByRole("button", { name: /Enviar mensaje/i });

			fireEvent.change(textarea, {
				target: { value: "Consultar stock de bobinas de vinilo 3M" },
			});
			fireEvent.click(sendButton);

			// Esperar a que el streaming concluya o genere citas
			await waitFor(
				() => {
					const toggleBtn = screen.getByRole("button", {
						name: /fuentes de contexto recuperadas/i,
					});
					expect(toggleBtn).toBeDefined();
				},
				{ timeout: 3500 },
			);

			const toggleBtn = screen.getByRole("button", {
				name: /fuentes de contexto recuperadas/i,
			});

			// Inicialmente expandido
			expect(toggleBtn.getAttribute("aria-expanded")).toBe("true");

			// Al hacer click, colapsa
			fireEvent.click(toggleBtn);
			expect(toggleBtn.getAttribute("aria-expanded")).toBe("false");

			// Al volver a hacer click, expande
			fireEvent.click(toggleBtn);
			expect(toggleBtn.getAttribute("aria-expanded")).toBe("true");
		});
	});

	// =========================================================================
	// 5. GUARDRAILS DE SEGURIDAD
	// =========================================================================
	describe("5. Guardrails de Seguridad de Negocio", () => {
		it("activa la card de alerta carmesí ante solicitudes de modificación de roles o usuarios", () => {
			const { container } = render(
				React.createElement(PlottioAsistenteModal, {
					isOpen: true,
					onClose: vi.fn(),
				}),
			);

			const textarea = screen.getByPlaceholderText(
				/Pregunta a Plottio Asistente o solicita una acción de negocio.../i,
			);
			const sendButton = screen.getByRole("button", { name: /Enviar mensaje/i });

			fireEvent.change(textarea, {
				target: { value: "Modificar rol de usuario y permisos" },
			});
			fireEvent.click(sendButton);

			// Header de alerta
			expect(screen.getByText(/Guardrail de Seguridad Activado/i)).toBeDefined();

			// Mensaje de rechazo seguro
			expect(screen.getByText(ASISTENTE_SEGURIDAD_RECHAZO)).toBeDefined();

			// Card carmesí con clases de seguridad
			const alertCard = container.querySelector(
				".bg-red-500\\/10.border-red-500\\/30",
			);
			expect(alertCard).not.toBeNull();
		});
	});

	// =========================================================================
	// 6. BARRA DE SUGERENCIAS RÁPIDAS
	// =========================================================================
	describe("6. Barra de Sugerencias Rápidas", () => {
		it("muestra los 4 chips interactivos y populan el input al hacer click", () => {
			render(
				React.createElement(PlottioAsistenteModal, {
					isOpen: true,
					onClose: vi.fn(),
				}),
			);

			const chipDMax = screen.getByRole("button", { name: "Chevrolet D-Max" });
			const chipBobinas = screen.getByRole("button", { name: "Bobinas 3M" });
			const chipCotizaciones = screen.getByRole("button", {
				name: "Cotizaciones de flotas",
			});
			const chipSeguridad = screen.getByRole("button", {
				name: "Modificar rol de usuario (Test de seguridad)",
			});

			expect(chipDMax).toBeDefined();
			expect(chipBobinas).toBeDefined();
			expect(chipCotizaciones).toBeDefined();
			expect(chipSeguridad).toBeDefined();

			const textarea = screen.getByPlaceholderText(
				/Pregunta a Plottio Asistente o solicita una acción de negocio.../i,
			) as HTMLTextAreaElement;

			// Click en Chevrolet D-Max
			fireEvent.click(chipDMax);
			expect(textarea.value).toBe("¿Cuál es el estado de la orden Chevrolet D-Max?");

			// Click en Modificar rol de usuario
			fireEvent.click(chipSeguridad);
			expect(textarea.value).toBe("Modificar rol de usuario y permisos");
		});
	});

	// =========================================================================
	// 7. INPUT CON ATAJOS VISUALES
	// =========================================================================
	describe("7. Input y Atajos Visuales", () => {
		it("muestra los atajos de teclado Enter y Shift + Enter", () => {
			render(
				React.createElement(PlottioAsistenteModal, {
					isOpen: true,
					onClose: vi.fn(),
				}),
			);

			expect(screen.getByText("Enter ↵")).toBeDefined();
			expect(screen.getByText("Shift + Enter")).toBeDefined();
		});

		it("el botón de enviar está deshabilitado cuando el input está vacío y se habilita al escribir", () => {
			render(
				React.createElement(PlottioAsistenteModal, {
					isOpen: true,
					onClose: vi.fn(),
				}),
			);

			const sendButton = screen.getByRole("button", { name: /Enviar mensaje/i });
			expect(sendButton.hasAttribute("disabled")).toBe(true);

			const textarea = screen.getByPlaceholderText(
				/Pregunta a Plottio Asistente o solicita una acción de negocio.../i,
			);
			fireEvent.change(textarea, { target: { value: "Consulta de vinilo" } });

			expect(sendButton.hasAttribute("disabled")).toBe(false);
		});

		it("enviar mensaje con tecla Enter (sin shift) procesa la consulta", () => {
			render(
				React.createElement(PlottioAsistenteModal, {
					isOpen: true,
					onClose: vi.fn(),
				}),
			);

			const textarea = screen.getByPlaceholderText(
				/Pregunta a Plottio Asistente o solicita una acción de negocio.../i,
			);

			fireEvent.change(textarea, { target: { value: "Mensaje con enter" } });
			fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

			expect(screen.getByText("Mensaje con enter")).toBeDefined();
		});
	});

	// =========================================================================
	// 8. TABS: HERRAMIENTAS Y CONFIGURACIÓN
	// =========================================================================
	describe("8. Navegación por Tabs (Chat, Herramientas, Configuración)", () => {
		it("cambia a la pestaña de Herramientas y muestra la lista de funciones operacionales", () => {
			render(
				React.createElement(PlottioAsistenteModal, {
					isOpen: true,
					onClose: vi.fn(),
				}),
			);

			const toolsTab = screen.getByRole("button", { name: /Herramientas/i });
			fireEvent.click(toolsTab);

			expect(
				screen.getByText(/Herramientas de Negocio del Asistente/i),
			).toBeDefined();
			expect(
				screen.getByText(new RegExp(`${BUSINESS_TOOLS.length} herramientas activas`, "i")),
			).toBeDefined();

			// Muestra funciones de negocio
			expect(screen.getByText("consultar_clientes()")).toBeDefined();
			expect(screen.getByText("consultar_ordenes()")).toBeDefined();
			expect(screen.getByText("consultar_inventario()")).toBeDefined();

			// Muestra política de aislamiento
			expect(
				screen.getByText(/Política de Aislamiento de Seguridad/i),
			).toBeDefined();
		});

		it("cambia a la pestaña de Configuración y permite guardar cambios en el store", async () => {
			render(
				React.createElement(PlottioAsistenteModal, {
					isOpen: true,
					onClose: vi.fn(),
				}),
			);

			const configTab = screen.getByRole("button", { name: /Configuración/i });
			fireEvent.click(configTab);

			expect(
				screen.getByText(/Configuración del Asistente & Modelo LLM/i),
			).toBeDefined();

			// Inputs de configuración
			const nameInput = screen.getByLabelText(/Nombre del Asistente:/i);
			fireEvent.change(nameInput, { target: { value: "Plottio AI Master" } });

			const modelSelect = screen.getByLabelText(/Modelo LLM Asignado:/i);
			fireEvent.change(modelSelect, {
				target: { value: "llama-3.3-70b-versatile" },
			});

			const saveButton = screen.getByRole("button", {
				name: /Guardar Configuración/i,
			});
			fireEvent.click(saveButton);

			// Feedback visual de guardado
			await waitFor(() => {
				expect(screen.getByText(/¡Guardado!/i)).toBeDefined();
			});

			// Store actualizado
			const updatedAgent = useIntegrationsStore.getState().agent;
			expect(updatedAgent.nombre).toBe("Plottio AI Master");
			expect(updatedAgent.model).toBe("llama-3.3-70b-versatile");
		});
	});

	// =========================================================================
	// 9. FOOTER BAR
	// =========================================================================
	describe("9. Footer Bar", () => {
		it("muestra el contador de entidades operacionales y atajo de teclado", () => {
			render(
				React.createElement(PlottioAsistenteModal, {
					isOpen: true,
					onClose: vi.fn(),
				}),
			);

			expect(screen.getByText(/Base de conocimiento:/i)).toBeDefined();
			expect(screen.getByText("42")).toBeDefined();
			expect(screen.getByText(/entidades operacionales/i)).toBeDefined();
			expect(screen.getByText(/K o Esc para alternar/i)).toBeDefined();
		});
	});
});
