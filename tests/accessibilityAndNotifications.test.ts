// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccessibilityControl } from "../src/components/AccessibilityControl";
import { NotificationCenter } from "../src/components/NotificationCenter";
import {
	FONT_SIZE_OPTIONS,
	useAccessibilityStore,
} from "../src/store/useAccessibilityStore";
import { useNotificationStore } from "../src/store/useNotificationStore";

describe("Accesibilidad (5 Niveles de Escalamiento) y Sistema Centralizado de Notificaciones", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		useAccessibilityStore.setState({ fontSizeLevel: "normal" });
		useNotificationStore.setState({
			notifications: [
				{
					id: "test-notif-1",
					title: "Orden de Trabajo Creada",
					message: "Se dio de alta la orden OT-2026-001 para rotulado vehicular.",
					type: "success",
					timestamp: "10:30",
					unread: true,
					linkTab: "ordenes",
				},
				{
					id: "test-notif-2",
					title: "Alerta de Stock Mínimo",
					message: "La bobina de vinilo fundido Arlon 1.52m tiene 3 metros restantes.",
					type: "warning",
					timestamp: "11:15",
					unread: false,
					linkTab: "inventario",
				},
			],
		});
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	// =========================================================================
	// 1. STORE & CONTROLES DE ACCESIBILIDAD (5 NIVELES)
	// =========================================================================
	describe("1. Accesibilidad: Escalamiento tipográfico de 5 niveles", () => {
		it("el catálogo contempla exactamente 5 niveles (1 por debajo, normal, y 3 superiores)", () => {
			expect(FONT_SIZE_OPTIONS).toHaveLength(5);
			expect(FONT_SIZE_OPTIONS.map((o) => o.level)).toEqual([
				"compact",
				"normal",
				"medium",
				"large",
				"xlarge",
			]);
			expect(FONT_SIZE_OPTIONS.map((o) => o.px)).toEqual([14, 16, 18, 20, 22]);
		});

		it("setFontSizeLevel escala document.documentElement.style.fontSize", () => {
			const store = useAccessibilityStore.getState();

			store.setFontSizeLevel("compact");
			expect(document.documentElement.style.fontSize).toBe("87.5%");
			expect(useAccessibilityStore.getState().fontSizeLevel).toBe("compact");

			store.setFontSizeLevel("medium");
			expect(document.documentElement.style.fontSize).toBe("112.5%");

			store.setFontSizeLevel("large");
			expect(document.documentElement.style.fontSize).toBe("125%");

			store.setFontSizeLevel("xlarge");
			expect(document.documentElement.style.fontSize).toBe("137.5%");

			store.resetFontSize();
			expect(document.documentElement.style.fontSize).toBe("100%");
			expect(useAccessibilityStore.getState().fontSizeLevel).toBe("normal");
		});

		it("AccessibilityControl renderiza el botón con ARIA y permite seleccionar los 5 niveles", () => {
			render(React.createElement(AccessibilityControl));

			const toggleBtn = screen.getByRole("button", {
				name: /Ajustar accesibilidad y tamaño de letra/i,
			});
			expect(toggleBtn).toBeDefined();

			fireEvent.click(toggleBtn);

			// El diálogo debe estar visible con los 5 niveles
			expect(
				screen.getByRole("dialog", {
					name: /Controles de accesibilidad tipográfica/i,
				}),
			).toBeDefined();

			const buttons = screen.getAllByRole("button", {
				name: /Compacto|Estándar|Mediano|Grande|Extra grande/i,
			});
			expect(buttons).toHaveLength(5);

			// Seleccionar tamaño grande
			fireEvent.click(
				screen.getByRole("button", { name: /Grande \(20px\)/i }),
			);
			expect(useAccessibilityStore.getState().fontSizeLevel).toBe("large");
			expect(document.documentElement.style.fontSize).toBe("125%");
		});
	});

	// =========================================================================
	// 2. STORE Y CENTRO CENTRALIZADO DE NOTIFICACIONES
	// =========================================================================
	describe("2. Sistema Centralizado de Notificaciones del Taller", () => {
		it("NotificationCenter muestra campana con badge de no leídas", () => {
			render(React.createElement(NotificationCenter, { onNavigate: vi.fn() }));

			const badge = screen.getByTestId("unread-notifications-badge");
			expect(badge).toBeDefined();
			expect(badge.textContent).toBe("1"); // 1 unread out of 2 initial
		});

		it("al abrir la campana se despliegan las notificaciones y permite marcar todas como leídas", () => {
			render(React.createElement(NotificationCenter, { onNavigate: vi.fn() }));

			const bellBtn = screen.getByRole("button", {
				name: /Notificaciones del sistema/i,
			});
			fireEvent.click(bellBtn);

			expect(screen.getByText("Orden de Trabajo Creada")).toBeDefined();
			expect(screen.getByText("Alerta de Stock Mínimo")).toBeDefined();

			// Marcar todas como leídas
			const markAllBtn = screen.getByRole("button", {
				name: /Marcar todas como leídas/i,
			});
			fireEvent.click(markAllBtn);

			expect(
				useNotificationStore
					.getState()
					.notifications.every((n) => !n.unread),
			).toBe(true);
			expect(screen.queryByTestId("unread-notifications-badge")).toBeNull();
		});

		it("al hacer click en una notificación con enlace navega a la pestaña correspondiente", () => {
			const onNavigateMock = vi.fn();
			render(
				React.createElement(NotificationCenter, {
					onNavigate: onNavigateMock,
				}),
			);

			const bellBtn = screen.getByRole("button", {
				name: /Notificaciones del sistema/i,
			});
			fireEvent.click(bellBtn);

			const notifCard = screen.getByText("Orden de Trabajo Creada");
			fireEvent.click(notifCard);

			expect(onNavigateMock).toHaveBeenCalledWith("ordenes");
		});

		it("permite añadir nuevas notificaciones operacionales", () => {
			const store = useNotificationStore.getState();
			store.addNotification({
				title: "Cliente Registrado",
				message: "Se dio de alta a Importadora Andina con RUC 1790011223001.",
				type: "success",
				linkTab: "clientes",
			});

			const updated = useNotificationStore.getState().notifications;
			expect(updated[0].title).toBe("Cliente Registrado");
			expect(updated[0].unread).toBe(true);
		});
	});
});
