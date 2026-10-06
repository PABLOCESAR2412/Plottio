import { toast } from "sonner";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SystemNotification {
	id: string;
	title: string;
	message: string;
	type: "info" | "success" | "warning" | "agenda";
	timestamp: string;
	unread: boolean;
	linkTab?: string;
	skipToast?: boolean;
}

interface NotificationState {
	notifications: SystemNotification[];
	addNotification: (
		notification: Omit<SystemNotification, "id" | "timestamp" | "unread">,
	) => void;
	markAsRead: (id: string) => void;
	markAllAsRead: () => void;
	removeNotification: (id: string) => void;
	clearAll: () => void;
}

const INITIAL_NOTIFICATIONS: SystemNotification[] = [
	{
		id: "notif-welcome",
		title: "Sistema Plottio en Línea",
		message:
			"Bienvenido a Plottio. Sistema sincronizado con la matriz del taller.",
		type: "success",
		timestamp: new Date().toLocaleTimeString([], {
			hour: "2-digit",
			minute: "2-digit",
		}),
		unread: true,
	},
	{
		id: "notif-agenda-demo",
		title: "Recordatorio de Agenda",
		message:
			"Revisa las instalaciones y turnos programados en el calendario de hoy.",
		type: "agenda",
		timestamp: new Date().toLocaleTimeString([], {
			hour: "2-digit",
			minute: "2-digit",
		}),
		unread: true,
		linkTab: "agenda",
	},
];

export const useNotificationStore = create<NotificationState>()(
	persist(
		(set) => ({
			notifications: INITIAL_NOTIFICATIONS,
			addNotification: (notif) => {
				if (!notif.skipToast) {
					try {
						if (notif.type === "success") {
							toast.success(notif.title, { description: notif.message });
						} else if (notif.type === "warning") {
							toast.warning(notif.title, { description: notif.message });
						} else {
							toast.info(notif.title, { description: notif.message });
						}
					} catch {
						// Ignorar en entornos sin DOM/Toaster
					}
				}

				return set((state) => ({
					notifications: [
						{
							...notif,
							id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
							timestamp: new Date().toLocaleTimeString([], {
								hour: "2-digit",
								minute: "2-digit",
							}),
							unread: true,
						},
						...state.notifications,
					].slice(0, 30), // Límite de 30 notificaciones recientes
				}));
			},
			markAsRead: (id) =>
				set((state) => ({
					notifications: state.notifications.map((n) =>
						n.id === id ? { ...n, unread: false } : n,
					),
				})),
			markAllAsRead: () =>
				set((state) => ({
					notifications: state.notifications.map((n) => ({
						...n,
						unread: false,
					})),
				})),
			removeNotification: (id) =>
				set((state) => ({
					notifications: state.notifications.filter((n) => n.id !== id),
				})),
			clearAll: () => set({ notifications: [] }),
		}),
		{
			name: "plottio-notifications",
		},
	),
);
