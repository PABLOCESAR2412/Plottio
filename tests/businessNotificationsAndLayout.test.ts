// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Sidebar } from "../src/components/Sidebar";
import { useNotificationStore } from "../src/store/useNotificationStore";
import { useSessionStore } from "../src/store/useSessionStore";
import { useOrdenesActions } from "../src/components/ordenes/useOrdenesActions";

const mockCreateMut = vi.fn().mockResolvedValue({ _id: "ord-789" });

vi.mock("convex/react", () => {
	const mockResult: any = [];
	mockResult.valida = true;
	return {
		useQuery: vi.fn().mockImplementation(() => mockResult),
		useMutation: vi.fn().mockImplementation(() => {
			const fn: any = (...args: any[]) => mockCreateMut(...args);
			fn.withOptimisticUpdate = vi.fn().mockReturnValue(fn);
			return fn;
		}),
		useAction: vi.fn().mockReturnValue(vi.fn().mockResolvedValue({ encontrado: false })),
	};
});

describe("Lógica de Notificaciones de Negocio y Layout del Asistente", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		useNotificationStore.setState({ notifications: [] });
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
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	describe("1. Retiro del ícono de notificación junto a PLOTTIO en Sidebar", () => {
		it("Sidebar no renderiza campana de notificaciones junto al logo", () => {
			render(
				React.createElement(Sidebar, {
					activeTab: "dashboard",
					onNavigate: vi.fn(),
					isOpenMobile: false,
					onCloseMobile: vi.fn(),
				}),
			);

			// El logo PLOTTIO debe existir tanto en desktop como drawer
			expect(screen.getAllByText("PLOTTIO").length).toBeGreaterThan(0);

			// NO debe existir botón con título 'Notificaciones' en el Sidebar
			const notifBtn = screen.queryByTitle("Notificaciones");
			expect(notifBtn).toBeNull();
		});
	});

	describe("2. Notificaciones en creación de lógica de negocio", () => {
		it("addNotification registra correctamente clientes y agrega linkTab a 'clientes'", () => {
			useNotificationStore.getState().addNotification({
				title: "Cliente Creado",
				message: 'El cliente "Juan Perez" ha sido registrado con éxito.',
				type: "success",
				linkTab: "clientes",
			});

			const notifs = useNotificationStore.getState().notifications;
			expect(notifs).toHaveLength(1);
			expect(notifs[0].title).toBe("Cliente Creado");
			expect(notifs[0].linkTab).toBe("clientes");
			expect(notifs[0].unread).toBe(true);
		});

		it("addNotification registra correctamente empresas y agrega linkTab a 'empresas'", () => {
			useNotificationStore.getState().addNotification({
				title: "Empresa Registrada",
				message: 'La empresa "Transportes SA" ha sido creada correctamente.',
				type: "success",
				linkTab: "empresas",
			});

			const notifs = useNotificationStore.getState().notifications;
			expect(notifs).toHaveLength(1);
			expect(notifs[0].title).toBe("Empresa Registrada");
			expect(notifs[0].linkTab).toBe("empresas");
		});

		it("useOrdenesActions dispara addNotification al crear una orden", async () => {
			const { handleCreateOrder } = useOrdenesActions({
				currentUser: useSessionStore.getState().currentUser,
				notify: vi.fn(),
			});

			await handleCreateOrder({
				clienteNombre: "Transportes Ecuador",
				clienteTelefono: "0991234567",
				placa: "PBX-1234",
				vehiculoTipo: "Bus Urbano",
				prioridad: "Alta",
				fechaFin: "2026-10-10",
				items: [],
			});

			const notifs = useNotificationStore.getState().notifications;
			expect(notifs).toHaveLength(1);
			expect(notifs[0].title).toBe("Orden de Trabajo Creada");
			expect(notifs[0].linkTab).toBe("ordenes");
			expect(notifs[0].message).toContain("Transportes Ecuador");
		});

		it("addNotification invoca toast de sonner y registra en store", async () => {
			const { toast } = await import("sonner");
			const toastSuccessSpy = vi.spyOn(toast, "success");

			useNotificationStore.getState().addNotification({
				title: "Vehículo Registrado",
				message: 'El vehículo con placa "ABC-123" ha sido registrado con éxito.',
				type: "success",
				linkTab: "vehiculos",
			});

			expect(toastSuccessSpy).toHaveBeenCalledWith("Vehículo Registrado", {
				description: 'El vehículo con placa "ABC-123" ha sido registrado con éxito.',
			});

			const notifs = useNotificationStore.getState().notifications;
			expect(notifs[0].title).toBe("Vehículo Registrado");
			expect(notifs[0].linkTab).toBe("vehiculos");
		});
	});

	describe("3. Dimensiones de la vista del asistente para evitar colisiones", () => {
		it("PlottioAsistenteView cuenta con clases flex y h-full", async () => {
			const { PlottioAsistenteView } = await import(
				"../src/components/PlottioAsistenteView"
			);
			const { container } = render(
				React.createElement(PlottioAsistenteView, {
					onNavigate: vi.fn(),
				}),
			);

			const rootDiv = container.firstElementChild as HTMLElement;
			expect(rootDiv).toBeDefined();
			expect(rootDiv.className).toContain("h-full");
			expect(rootDiv.className).toContain("w-full");
		});

		it("el wrapper del asistente en index.tsx preserva md:pb-24 contra sobreescritura de md:p-6", async () => {
			const fs = await import("fs");
			const path = await import("path");
			const indexContent = fs.readFileSync(
				path.resolve(__dirname, "../src/routes/index.tsx"),
				"utf-8",
			);

			// Comprobar que activeTab === 'asistente' cuenta explícitamente con md:pb-24
			expect(indexContent).toContain("md:pb-24");
			expect(indexContent).toMatch(/pb-24.*md:pb-24/);
		});
	});
});
