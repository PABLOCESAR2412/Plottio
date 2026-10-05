import {
	AlertTriangle,
	Bell,
	CalendarDays,
	Check,
	CheckCheck,
	CheckCircle2,
	Info,
	Trash2,
	X,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import {
	type SystemNotification,
	useNotificationStore,
} from "../store/useNotificationStore";

interface NotificationCenterProps {
	onNavigate?: (tab: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
	onNavigate,
}) => {
	const {
		notifications,
		markAsRead,
		markAllAsRead,
		removeNotification,
		clearAll,
	} = useNotificationStore();

	const [isOpen, setIsOpen] = useState(false);
	const popoverRef = useRef<HTMLDivElement>(null);

	const unreadCount = notifications.filter((n) => n.unread).length;

	// Cerrar al hacer click fuera
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				popoverRef.current &&
				!popoverRef.current.contains(e.target as Node)
			) {
				setIsOpen(false);
			}
		};
		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isOpen]);

	const getIcon = (type: SystemNotification["type"]) => {
		switch (type) {
			case "success":
				return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />;
			case "warning":
				return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
			case "agenda":
				return <CalendarDays className="h-4 w-4 text-blue-500 shrink-0" />;
			default:
				return <Info className="h-4 w-4 text-primary shrink-0" />;
		}
	};

	const handleNotificationClick = (notif: SystemNotification) => {
		markAsRead(notif.id);
		if (notif.linkTab && onNavigate) {
			onNavigate(notif.linkTab);
			setIsOpen(false);
		}
	};

	return (
		<div className="relative inline-block" ref={popoverRef}>
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				aria-expanded={isOpen}
				aria-haspopup="true"
				aria-label={`Notificaciones del sistema (${unreadCount} no leídas)`}
				title="Notificaciones y avisos del taller"
				className="relative p-2 rounded-lg border border-border bg-background hover:bg-secondary text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-xs flex items-center justify-center"
			>
				<Bell className="h-4 w-4" />
				{unreadCount > 0 && (
					<span
						data-testid="unread-notifications-badge"
						className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-xs animate-scale-in"
					>
						{unreadCount > 9 ? "9+" : unreadCount}
					</span>
				)}
			</button>

			{isOpen && (
				<div
					role="dialog"
					aria-label="Panel de notificaciones"
					className="absolute right-0 mt-2 w-80 sm:w-96 bg-card border border-border rounded-2xl shadow-2xl z-50 animate-slide-in overflow-hidden flex flex-col max-h-[80vh]"
				>
					{/* Header */}
					<div className="flex items-center justify-between px-4 py-3 border-b border-border/80 bg-secondary/20 shrink-0">
						<div className="flex items-center gap-2">
							<Bell className="h-4 w-4 text-primary" />
							<span className="font-bold text-sm text-foreground">
								Notificaciones
							</span>
							{unreadCount > 0 && (
								<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
									{unreadCount} nuevas
								</span>
							)}
						</div>

						<div className="flex items-center gap-1">
							{unreadCount > 0 && (
								<button
									type="button"
									onClick={markAllAsRead}
									title="Marcar todas como leídas"
									aria-label="Marcar todas como leídas"
									className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground text-xs flex items-center gap-1 cursor-pointer transition-colors"
								>
									<CheckCheck className="h-3.5 w-3.5 text-primary" />
									<span className="text-[11px] hidden sm:inline">Leídas</span>
								</button>
							)}
							{notifications.length > 0 && (
								<button
									type="button"
									onClick={clearAll}
									title="Vaciar notificaciones"
									aria-label="Vaciar notificaciones"
									className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive text-xs cursor-pointer transition-colors"
								>
									<Trash2 className="h-3.5 w-3.5" />
								</button>
							)}
							<button
								type="button"
								onClick={() => setIsOpen(false)}
								className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
								aria-label="Cerrar notificaciones"
							>
								<X className="h-4 w-4" />
							</button>
						</div>
					</div>

					{/* Lista con scroll */}
					<div className="flex-1 overflow-y-auto divide-y divide-border/50 overscroll-contain">
						{notifications.length === 0 ? (
							<div className="p-8 text-center text-muted-foreground space-y-2">
								<Check className="h-8 w-8 mx-auto text-emerald-500 opacity-60" />
								<p className="text-xs font-medium">
									No tienes notificaciones pendientes.
								</p>
								<p className="text-[11px] text-muted-foreground/80">
									Los avisos de órdenes, clientes, agenda e inventario
									aparecerán aquí.
								</p>
							</div>
						) : (
							notifications.map((n) => (
								<div
									key={n.id}
									className={`p-3.5 flex items-start justify-between gap-3 text-left transition-colors hover:bg-secondary/40 ${
										n.unread ? "bg-primary/5" : "bg-card"
									}`}
								>
									<button
										type="button"
										onClick={() => handleNotificationClick(n)}
										className="flex-1 flex items-start gap-2.5 min-w-0 text-left cursor-pointer bg-transparent border-0 p-0"
									>
										<div className="mt-0.5">{getIcon(n.type)}</div>
										<div className="space-y-0.5 min-w-0">
											<div className="flex items-center gap-1.5 flex-wrap">
												<span
													className={`text-xs font-semibold truncate ${
														n.unread
															? "text-foreground font-bold"
															: "text-muted-foreground"
													}`}
												>
													{n.title}
												</span>
												{n.unread && (
													<span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
												)}
											</div>
											<p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
												{n.message}
											</p>
											<div className="flex items-center gap-2 pt-0.5 text-[10px] text-muted-foreground/70">
												<span>{n.timestamp}</span>
												{n.linkTab && (
													<span className="text-primary font-medium hover:underline">
														Ir a {n.linkTab} →
													</span>
												)}
											</div>
										</div>
									</button>

									<button
										type="button"
										onClick={() => removeNotification(n.id)}
										className="p-1 rounded-md text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer shrink-0"
										title="Eliminar notificación"
										aria-label="Eliminar notificación"
									>
										<X className="h-3 w-3" />
									</button>
								</div>
							))
						)}
					</div>
				</div>
			)}
		</div>
	);
};
