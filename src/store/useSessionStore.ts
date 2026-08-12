import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RolUsuario } from "../types/auth";

export type { RolUsuario };

/**
 * Sesión y preferencias de UI locales.
 *
 * Sustituye a `useAppStore` (eliminado) para la información que NO proviene de la BD:
 * - `currentUser`: identidad activa persistida en localStorage (entre recargas).
 * - `theme` / `notificationsEnabled` / `notificationTypes`: preferencias de UI.
 *
 * Los datos de negocio (clientes, vehículos, cotizaciones, etc.) ahora viven
 * en Convex y se consultan vía `useQuery(api.*)`. Ya no se persisten en local.
 */

export interface SessionUser {
	id: string;
	nombre: string;
	email: string;
	rol: RolUsuario | string;
	sucursalId: string | null;
	pvId: string | null;
	empresaId?: string | null;
	activo: boolean;
}

interface SessionStore {
	currentUser: SessionUser | null;
	setCurrentUser: (userOrId: string | SessionUser | null) => void;
	clearSession: () => void;

	theme: "light" | "dark";
	toggleTheme: () => void;

	notificationsEnabled: boolean;
	notificationTypes: {
		citas: boolean;
		ordenes: boolean;
		cotizaciones: boolean;
	};
	setNotificationsEnabled: (enabled: boolean) => void;
	setNotificationTypes: (
		types: Partial<{
			citas: boolean;
			ordenes: boolean;
			cotizaciones: boolean;
		}>,
	) => void;

	dashboardWidgets: string[];
	setDashboardWidgets: (widgets: string[]) => void;
}

export const useSessionStore = create<SessionStore>()(
	persist(
		(set, get) => ({
			currentUser: null,
			setCurrentUser: (userOrId) => {
				if (userOrId === null) {
					set({ currentUser: null });
					return;
				}
				if (typeof userOrId === "string") {
					// Búsqueda por id (compatibilidad con flujo antiguo)
					const actual = get().currentUser;
					if (actual && actual.id === userOrId) {
						set({ currentUser: actual });
					}
					return;
				}
				set({
					currentUser: {
						id: userOrId.id ?? (userOrId as { _id?: string })._id ?? "",
						nombre: userOrId.nombre ?? "",
						email: userOrId.email ?? "",
						rol: userOrId.rol ?? "Cotizador",
						sucursalId: userOrId.sucursalId ?? null,
						pvId: userOrId.pvId ?? null,
						empresaId: userOrId.empresaId ?? null,
						activo: userOrId.activo ?? true,
					},
				});
			},
			clearSession: () => set({ currentUser: null }),

			theme: "light",
			toggleTheme: () => {
				set((state) => {
					const next = state.theme === "light" ? "dark" : "light";
					if (typeof window !== "undefined") {
						const root = window.document.documentElement;
						if (next === "dark") root.classList.add("dark");
						else root.classList.remove("dark");
						window.localStorage.setItem("theme", next);
					}
					return { theme: next };
				});
			},

			notificationsEnabled: true,
			notificationTypes: { citas: true, ordenes: true, cotizaciones: true },
			setNotificationsEnabled: (enabled) =>
				set({ notificationsEnabled: enabled }),
			setNotificationTypes: (types) =>
				set((state) => ({
					notificationTypes: { ...state.notificationTypes, ...types },
				})),

			dashboardWidgets: [],
			setDashboardWidgets: (widgets) => set({ dashboardWidgets: widgets }),
		}),
		{
			name: "plottio-auth-storage",
			partialize: (state) => ({
				currentUser: state.currentUser,
				dashboardWidgets: state.dashboardWidgets,
			}),
		},
	),
);
