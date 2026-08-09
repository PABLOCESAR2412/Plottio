import {
	CalendarDays,
	CheckCircle,
	ChevronRight,
	ClipboardList,
	Clock,
	FileText,
	Plus,
	TrendingUp,
} from "lucide-react";
import type React from "react";
import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSessionStore } from "../store/useSessionStore";

interface DashboardViewProps {
	onNavigate: (
		tab:
			| "dashboard"
			| "clientes"
			| "empresas"
			| "vehiculos"
			| "cotizaciones"
			| "ordenes"
			| "agenda"
			| "configuracion",
	) => void;
	onCreateCotizacionClick: () => void;
	onAgendarCitaClick: () => void;
}

type LocalOrden = {
	id: string;
	clienteNombre: string;
	vehiculoTipo: string;
	total: number;
	progreso: number;
	estado: string;
	sucursalId?: string;
};

type LocalCita = {
	id: string;
	clienteNombre: string;
	vehiculoPlaca: string;
	servicio: string;
	fecha: string;
	hora: string;
	estado: "Confirmada" | "Pendiente" | "Cancelada";
};

export const DashboardView: React.FC<DashboardViewProps> = ({
	onNavigate,
	onCreateCotizacionClick,
	onAgendarCitaClick,
}) => {
	const currentUser = useSessionStore((s) => s.currentUser);
	const usuarioId = currentUser?.id;

	const rawOrdenes = useQuery(
		api.ordenes.fetchOrdenes,
		usuarioId ? { usuarioId: usuarioId as unknown as any } : "skip",
	) as Array<LocalOrden & { _id: string }> | undefined;

	const rawCitas = useQuery(
		api.citas.fetchCitas,
		usuarioId ? { usuarioId: usuarioId as unknown as any } : "skip",
	) as Array<LocalCita & { _id: string }> | undefined;

	const ordenesTrabajo: LocalOrden[] = useMemo(
		() =>
			(rawOrdenes ?? []).map((o) => ({
				id: o._id,
				clienteNombre: o.clienteNombre ?? "",
				vehiculoTipo: o.vehiculoTipo ?? "",
				total: o.total ?? 0,
				progreso: o.progreso ?? 0,
				estado: o.estado ?? "Pendiente",
				sucursalId: o.sucursalId,
			})),
		[rawOrdenes],
	);

	const citas: LocalCita[] = useMemo(
		() =>
			(rawCitas ?? []).map((c) => ({
				id: c._id,
				clienteNombre: c.clienteNombre ?? "",
				vehiculoPlaca: c.vehiculoPlaca ?? "",
				servicio: c.servicio ?? "",
				fecha: c.fecha ?? "",
				hora: c.hora ?? "",
				estado: (c.estado as LocalCita["estado"]) ?? "Pendiente",
			})),
		[rawCitas],
	);

	// SaaS Multi-tenant filtering
	const visibleOrders =
		currentUser?.rol === "SuperAdmin"
			? ordenesTrabajo
			: ordenesTrabajo.filter(
					(o) => !o.sucursalId || o.sucursalId === currentUser?.sucursalId,
				);

	// Statistics calculations
	const totalOrders = visibleOrders.length;
	const pendingOrdersCount = visibleOrders.filter(
		(o) => o.estado === "Pendiente" || o.estado === "En Proceso",
	).length;
	const completedOrdersCount = visibleOrders.filter(
		(o) => o.estado === "Listo" || o.estado === "Entregado",
	).length;

	// Citas para hoy (fecha real, no hardcoded)
	const todayStr = new Date().toISOString().split("T")[0];
	const todayCitas = citas.filter((c) => c.fecha === todayStr);
	const todayCitasCount = todayCitas.length;

	// Total Revenue
	const totalRevenue = visibleOrders
		.filter((o) => o.estado !== "Cancelado")
		.reduce((sum, o) => sum + o.total, 0);

	// Status Badge styles helper
	const getStatusBadge = (estado: string) => {
		switch (estado) {
			case "Pendiente":
				return (
					<span className="inline-flex items-center rounded-md border border-border px-2.5 py-0.5 text-xs font-semibold text-yellow-500 transition-colors">
						Pendiente
					</span>
				);
			case "En Proceso":
				return (
					<span className="inline-flex items-center rounded-md bg-secondary px-2.5 py-0.5 text-xs font-semibold text-foreground transition-colors">
						En Proceso
					</span>
				);
			case "Listo":
			case "Entregado":
				return (
					<span className="inline-flex items-center rounded-md bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground transition-colors">
						Listo/Entregado
					</span>
				);
			case "Cancelado":
				return (
					<span className="inline-flex items-center rounded-md border border-destructive/20 bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive transition-colors">
						Cancelado
					</span>
				);
			default:
				return null;
		}
	};

	return (
		<div className="space-y-6">
			{/* 1. Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight text-foreground">
						Hola, {currentUser?.nombre || "Usuario"}
					</h1>
					<p className="text-muted-foreground mt-1 text-sm flex items-center gap-2">
						<span className="font-bold border border-border bg-secondary px-2 py-0.5 rounded text-[10px] uppercase">
							{currentUser?.rol || "Rol"}
						</span>
						<span>Panel de gestión y control de rotulado vehicular.</span>
					</p>
				</div>
				<div className="flex flex-wrap gap-3">
					<button
						onClick={onAgendarCitaClick}
						className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
					>
						<CalendarDays className="h-4 w-4" />
						Agendar una Cita
					</button>
					<button
						onClick={onCreateCotizacionClick}
						className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow hover:opacity-90 transition-colors"
					>
						<Plus className="h-4 w-4" />
						Crear Nueva Cotización
					</button>
				</div>
			</div>

			{/* 2. Statistics Grid */}
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{/* Card 1 */}
				<div className="rounded-xl border border-border bg-card p-6 shadow-sm">
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium text-muted-foreground">
							Órdenes Pendientes
						</span>
						<ClipboardList className="h-5 w-5 text-yellow-500" />
					</div>
					<div className="mt-2 flex items-baseline justify-between">
						<span className="text-3xl font-bold text-foreground">
							{pendingOrdersCount}
						</span>
						<span className="text-xs text-yellow-500 font-medium">Activas</span>
					</div>
				</div>

				{/* Card 2 */}
				<div className="rounded-xl border border-border bg-card p-6 shadow-sm">
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium text-muted-foreground">
							Órdenes Completadas
						</span>
						<CheckCircle className="h-5 w-5 text-green-500" />
					</div>
					<div className="mt-2 flex items-baseline justify-between">
						<span className="text-3xl font-bold text-foreground">
							{completedOrdersCount}
						</span>
						<span className="text-xs text-green-500 font-medium">
							Entregadas
						</span>
					</div>
				</div>

				{/* Card 3 */}
				<div className="rounded-xl border border-border bg-card p-6 shadow-sm">
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium text-muted-foreground">
							Citas para Hoy
						</span>
						<CalendarDays className="h-5 w-5 text-blue-500" />
					</div>
					<div className="mt-2 flex items-baseline justify-between">
						<span className="text-3xl font-bold text-foreground">
							{todayCitasCount}
						</span>
						<span className="text-xs text-blue-500 font-medium">
							{new Date().toLocaleDateString("es-EC", {
								day: "2-digit",
								month: "long",
							})}
						</span>
					</div>
				</div>

				{/* Card 4 */}
				<div className="rounded-xl border border-border bg-card p-6 shadow-sm">
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium text-muted-foreground">
							Inversión Estimada
						</span>
						<TrendingUp className="h-5 w-5 text-purple-500" />
					</div>
					<div className="mt-2 flex items-baseline justify-between">
						<span className="text-3xl font-bold text-foreground">
							${totalRevenue.toLocaleString("en-US")}
						</span>
						<span className="text-xs text-purple-500 font-medium font-semibold">
							+12.4% vs mes ant.
						</span>
					</div>
				</div>
			</div>

			{/* 3. Central Asymmetric Block */}
			<div className="grid gap-6 lg:grid-cols-3">
				{/* Col 2/3 - Órdenes Recientes */}
				<div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
					<div>
						<div className="flex items-center justify-between mb-4">
							<div>
								<h2 className="text-lg font-semibold text-foreground">
									Órdenes de Trabajo Recientes
								</h2>
								<p className="text-sm text-muted-foreground">
									Seguimiento en tiempo real de stickers e instalaciones.
								</p>
							</div>
							<button
								onClick={() => onNavigate("ordenes")}
								className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
							>
								Ver todas
								<ChevronRight className="h-4 w-4" />
							</button>
						</div>

						<div className="divide-y divide-border">
							{ordenesTrabajo.slice(0, 5).map((orden) => {
								const initials = orden.clienteNombre
									? orden.clienteNombre
											.split(" ")
											.map((n) => n[0])
											.join("")
											.substring(0, 2)
											.toUpperCase()
									: "ST";
								return (
									<div
										key={orden.id}
										className="flex items-center justify-between py-3.5 hover:bg-secondary/40 px-2 rounded-lg transition-colors"
									>
										<div className="flex items-center gap-3">
											<div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">
												{initials}
											</div>
											<div>
												<div className="font-semibold text-sm text-foreground">
													{orden.clienteNombre}
												</div>
												<div className="text-xs text-muted-foreground flex items-center gap-2">
													<span className="font-medium text-foreground">
														{orden.id}
													</span>
													<span>•</span>
													<span>{orden.vehiculoTipo}</span>
													<span>•</span>
													<span className="font-semibold">${orden.total}</span>
												</div>
											</div>
										</div>
										<div className="flex items-center gap-4">
											{/* Progress circle or indicator */}
											<div className="hidden sm:flex flex-col items-end gap-1">
												<span className="text-xs text-muted-foreground font-medium">
													{orden.progreso}% completado
												</span>
												<div className="w-20 bg-secondary h-1.5 rounded-full overflow-hidden">
													<div
														className="bg-primary h-full rounded-full"
														style={{ width: `${orden.progreso}%` }}
													/>
												</div>
											</div>
											{getStatusBadge(orden.estado)}
										</div>
									</div>
								);
							})}
							{ordenesTrabajo.length === 0 && (
								<div className="text-center py-8 text-muted-foreground text-sm">
									No hay órdenes de trabajo activas en este momento.
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Col 1/3 - Citas de Hoy */}
				<div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
					<div>
						<div className="flex items-center justify-between mb-4">
							<div>
								<h2 className="text-lg font-semibold text-foreground">
									Citas para Hoy
								</h2>
								<p className="text-sm text-muted-foreground">
									Instalaciones programadas para hoy.
								</p>
							</div>
							<button
								onClick={() => onNavigate("agenda")}
								className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
							>
								Ver agenda
								<ChevronRight className="h-4 w-4" />
							</button>
						</div>

						<div className="space-y-3">
							{todayCitas.map((cita) => (
								<div
									key={cita.id}
									className="flex flex-col gap-2 rounded-lg border border-border p-3.5 hover:bg-secondary/40 transition-colors"
								>
									<div className="flex items-center justify-between">
										<span className="text-xs font-bold bg-secondary px-2 py-0.5 rounded text-foreground flex items-center gap-1">
											<Clock className="h-3 w-3" />
											{cita.hora}
										</span>
										<span
											className={`text-xs font-semibold ${
												cita.estado === "Confirmada"
													? "text-green-500"
													: "text-yellow-500"
											}`}
										>
											{cita.estado}
										</span>
									</div>
									<div>
										<h4 className="text-sm font-semibold text-foreground">
											{cita.clienteNombre}
										</h4>
										<p className="text-xs text-muted-foreground line-clamp-1">
											{cita.servicio}
										</p>
										<div className="mt-1 text-[11px] text-foreground font-medium">
											Placa: {cita.vehiculoPlaca}
										</div>
									</div>
								</div>
							))}
							{todayCitas.length === 0 && (
								<div className="text-center py-12 text-muted-foreground text-sm flex flex-col items-center justify-center gap-2">
									<CalendarDays className="h-8 w-8 opacity-45" />
									<span>No hay citas programadas para hoy.</span>
								</div>
							)}
						</div>
					</div>

					{todayCitasCount > 0 && (
						<div className="mt-4 pt-3 border-t border-border">
							<p className="text-xs text-muted-foreground text-center font-medium">
								Tienes {todayCitasCount} compromisos agendados para este día.
							</p>
						</div>
					)}
				</div>
			</div>

			{/* 4. Quick Actions Shortcuts */}
			<div className="rounded-xl border border-border bg-card p-6 shadow-sm">
				<h3 className="text-lg font-semibold text-foreground mb-4">
					Acciones Rápidas
				</h3>
				<div className="grid gap-4 grid-cols-2 md:grid-cols-4">
					<button
						onClick={() => onNavigate("clientes")}
						className="flex flex-col items-center justify-center p-4 rounded-lg border border-border bg-secondary/20 hover:bg-secondary hover:border-ring/30 transition-all text-center gap-2 cursor-pointer"
					>
						<div className="p-3 bg-card border border-border rounded-full text-foreground">
							<Plus className="h-5 w-5" />
						</div>
						<span className="text-sm font-semibold text-foreground">
							Registrar Cliente
						</span>
					</button>
					<button
						onClick={() => onNavigate("vehiculos")}
						className="flex flex-col items-center justify-center p-4 rounded-lg border border-border bg-secondary/20 hover:bg-secondary hover:border-ring/30 transition-all text-center gap-2 cursor-pointer"
					>
						<div className="p-3 bg-card border border-border rounded-full text-foreground">
							<Plus className="h-5 w-5" />
						</div>
						<span className="text-sm font-semibold text-foreground">
							Añadir Vehículo
						</span>
					</button>
					<button
						onClick={() => onNavigate("empresas")}
						className="flex flex-col items-center justify-center p-4 rounded-lg border border-border bg-secondary/20 hover:bg-secondary hover:border-ring/30 transition-all text-center gap-2 cursor-pointer"
					>
						<div className="p-3 bg-card border border-border rounded-full text-foreground">
							<Plus className="h-5 w-5" />
						</div>
						<span className="text-sm font-semibold text-foreground">
							Agregar Empresa
						</span>
					</button>
					<button
						onClick={() => onNavigate("configuracion")}
						className="flex flex-col items-center justify-center p-4 rounded-lg border border-border bg-secondary/20 hover:bg-secondary hover:border-ring/30 transition-all text-center gap-2 cursor-pointer"
					>
						<div className="p-3 bg-card border border-border rounded-full text-foreground">
							<FileText className="h-5 w-5" />
						</div>
						<span className="text-sm font-semibold text-foreground">
							Precios Stickers
						</span>
					</button>
				</div>
			</div>
		</div>
	);
};
