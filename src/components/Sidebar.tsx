import { useMutation, useQuery } from "convex/react";
import {
	Bell,
	Building2,
	CalendarDays,
	Car,
	Check,
	ClipboardCheck,
	Component,
	Factory,
	FileText,
	Layers,
	LayoutDashboard,
	LogOut,
	Moon,
	PackageSearch,
	Search,
	Settings,
	Sun,
	Users,
	X,
} from "lucide-react";
import type React from "react";
import { startTransition, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { setLanguage } from "../i18n";
import { useSessionStore } from "../store/useSessionStore";

interface SidebarProps {
	activeTab:
		| "dashboard"
		| "clientes"
		| "empresas"
		| "vehiculos"
		| "cotizaciones"
		| "ordenes"
		| "agenda"
		| "configuracion"
		| "inventario"
		| "catalogo"
		| "lotes"
		| "kits";
	onNavigate: (
		tab:
			| "dashboard"
			| "clientes"
			| "empresas"
			| "vehiculos"
			| "cotizaciones"
			| "ordenes"
			| "agenda"
			| "configuracion"
			| "inventario"
			| "catalogo"
			| "lotes"
			| "kits",
	) => void;
	isOpenMobile: boolean;
	onCloseMobile: () => void;
}

type LocalOrden = {
	id: string;
	estado: string;
};

type LocalCita = {
	id: string;
	estado: string;
};

export const Sidebar: React.FC<SidebarProps> = ({
	activeTab,
	onNavigate,
	isOpenMobile,
	onCloseMobile,
}) => {
	const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
	const theme = useSessionStore((s) => s.theme);
	const toggleTheme = useSessionStore((s) => s.toggleTheme);
	const { t, i18n } = useTranslation();
	const currentUser = useSessionStore((s) => s.currentUser);
	const setCurrentUser = useSessionStore((s) => s.setCurrentUser);

	const usuarioId = currentUser?.id;

	const empresaId = currentUser?.empresaId;
	const branding = useQuery(
		api.organizacion.getEmpresaBranding,
		empresaId ? { empresaId: empresaId as Id<"empresas"> } : "skip",
	);

	useEffect(() => {
		if (!branding?.logoUrl) return;
		let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
		if (!link) {
			link = document.createElement("link");
			link.rel = "icon";
			document.head.appendChild(link);
		}
		link.href = branding.logoUrl;
	}, [branding?.logoUrl]);

	const rawOrdenes = useQuery(
		api.ordenes.fetchOrdenes,
		usuarioId ? { usuarioId: usuarioId as Id<"usuarios"> } : "skip",
	) as Array<LocalOrden & { _id: string }> | undefined;

	const rawCitas = useQuery(
		api.citas.fetchCitas,
		usuarioId ? { usuarioId: usuarioId as Id<"usuarios"> } : "skip",
	) as Array<LocalCita & { _id: string }> | undefined;

	const [showNotifications, setShowNotifications] = useState(false);

	const noLeidas = useQuery(
		api.notificaciones.contarNoLeidas,
		usuarioId ? { usuarioId: usuarioId as Id<"usuarios"> } : "skip",
	);

	const misEmpresas = useQuery(
		api.organizacion.getMisEmpresas,
		usuarioId ? { usuarioId: usuarioId as Id<"usuarios"> } : "skip",
	);
	const switchEmpresaMut = useMutation(api.organizacion.setEmpresaContexto);
	const [showEmpresaPicker, setShowEmpresaPicker] = useState(false);

	const notificaciones = useQuery(
		api.notificaciones.getMisNotificaciones,
		usuarioId ? { usuarioId: usuarioId as Id<"usuarios"> } : "skip",
	) as
		| Array<{
				_id: string;
				tipo: string;
				titulo: string;
				mensaje: string;
				leida: boolean;
				enlace?: string;
				fecha: string;
		  }>
		| undefined;

	const marcarTodasLeidas = useMutation(api.notificaciones.marcarTodasLeidas);
	const marcarLeida = useMutation(api.notificaciones.marcarLeida);

	const [searchTerm, setSearchTerm] = useState("");
	const [showSearch, setShowSearch] = useState(false);

	const busqueda = useQuery(
		api.busqueda.busquedaGlobal,
		usuarioId && searchTerm.trim().length >= 2
			? { usuarioId: usuarioId as Id<"usuarios">, termino: searchTerm }
			: "skip",
	) as
		| {
				clientes: Array<{ id: string; nombre: string; telefono: string }>;
				vehiculos: Array<{
					id: string;
					placa: string;
					marca: string;
					modelo: string;
				}>;
				ordenes: Array<{ id: string; cliente: string; placa: string }>;
		  }
		| undefined;

	const ordenesTrabajo: LocalOrden[] = useMemo(
		() =>
			(rawOrdenes ?? []).map((o) => ({
				id: o._id,
				estado: o.estado ?? "Pendiente",
			})),
		[rawOrdenes],
	);

	const citas: LocalCita[] = useMemo(
		() =>
			(rawCitas ?? []).map((c) => ({
				id: c._id,
				estado: c.estado ?? "Pendiente",
			})),
		[rawCitas],
	);

	// Statistics indicators
	const activeOrdersCount = ordenesTrabajo.filter(
		(o) => o.estado === "Pendiente" || o.estado === "En Proceso",
	).length;
	const pendingCitasCount = citas.filter(
		(c) => c.estado === "Pendiente",
	).length;

	type MenuItem = {
		id:
			| "dashboard"
			| "clientes"
			| "empresas"
			| "vehiculos"
			| "cotizaciones"
			| "ordenes"
			| "agenda"
			| "configuracion"
			| "inventario"
			| "catalogo"
			| "lotes"
			| "kits";
		label: string;
		icon: React.ComponentType<{ className?: string }>;
		badge?: number;
		roles?: readonly string[];
	};

	const menuItems: readonly MenuItem[] = [
		{ id: "dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
		{ id: "clientes", label: t("nav.clientes"), icon: Users },
		{ id: "empresas", label: t("nav.empresas"), icon: Building2 },
		{ id: "vehiculos", label: t("nav.vehiculos"), icon: Car },
		{ id: "cotizaciones", label: t("nav.cotizaciones"), icon: FileText },
		{
			id: "ordenes",
			label: t("nav.ordenes"),
			icon: ClipboardCheck,
			badge: activeOrdersCount > 0 ? activeOrdersCount : undefined,
		},
		{
			id: "agenda",
			label: t("nav.agenda"),
			icon: CalendarDays,
			badge: pendingCitasCount > 0 ? pendingCitasCount : undefined,
		},
		{
			id: "inventario",
			label: "Inventario",
			icon: PackageSearch,
		},
		{
			id: "catalogo",
			label: "Catálogo",
			icon: Layers,
		},
		{
			id: "lotes",
			label: "Producción",
			icon: Factory,
		},
		{
			id: "kits",
			label: "Kits de Flota",
			icon: Component,
			roles: ["SuperAdmin"],
		},
		{
			id: "configuracion",
			label: t("nav.configuracion"),
			icon: Settings,
			roles: ["SuperAdmin"],
		},
	];

	const filteredMenuItems = menuItems.filter((item) => {
		if (!currentUser) return false;
		if (!item.roles) return true; // Available to all if not specified
		return (
			item.roles.includes(currentUser.rol) || currentUser.rol === "SuperAdmin"
		);
	});

	const handleLinkClick = (tabId: typeof activeTab) => {
		startTransition(() => {
			onNavigate(tabId);
		});
		onCloseMobile();
	};

	const content = (
		<div className="flex h-full flex-col justify-between bg-card text-foreground border-r border-border w-64 shrink-0">
			{/* 1. Centered Title / Logo with border-b */}
			<div className="flex items-center justify-between h-14 border-b border-border px-5 py-4 shrink-0">
				{branding?.logoUrl ? (
					<div className="flex items-center gap-2 min-w-0">
						<img
							src={branding.logoUrl}
							alt={`Logo de ${branding.nombre ?? "la empresa"}`}
							className="h-7 w-7 rounded-md object-cover shrink-0"
						/>
						<span className="text-sm font-black tracking-wider text-foreground truncate">
							{branding.nombre ?? "PLOTTIO"}
						</span>
					</div>
				) : (
					<span className="text-lg font-black tracking-wider text-foreground">
						PLOTTIO
					</span>
				)}
				{/* Selector multi-empresa */}
				{(misEmpresas ?? []).length > 1 && (
					<div className="relative shrink-0">
						<button
							type="button"
							onClick={() => setShowEmpresaPicker((v) => !v)}
							className="px-2 py-1 rounded-md text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors border border-border flex items-center gap-1"
							title="Cambiar empresa"
						>
							<Building2 className="h-4 w-4" />
							<span className="hidden xl:inline max-w-[7rem] truncate">
								{branding?.nombre ??
									(currentUser?.empresaId ? "Empresa" : "Empresa")}
							</span>
						</button>
						{showEmpresaPicker && (
							<>
								<button
									type="button"
									aria-label="Cerrar selector de empresa"
									className="fixed inset-0 z-10"
									onClick={() => setShowEmpresaPicker(false)}
								/>
								<div className="absolute right-0 mt-2 z-20 w-56 rounded-xl border border-border bg-card shadow-2xl p-2 text-foreground">
									{(misEmpresas ?? []).map((emp) => (
										<button
											type="button"
											key={emp.id}
											disabled={emp.id === currentUser?.empresaId}
											onClick={() => {
												if (usuarioId) {
													void switchEmpresaMut({
														usuarioId: usuarioId as Id<"usuarios">,
														empresaId: emp.id as Id<"empresas">,
													}).then((user) => {
														if (user) {
															setCurrentUser({
																id: user._id,
																nombre: user.nombre,
																email: user.email,
																rol: user.rol,
																sucursalId: user.sucursalId ?? null,
																pvId: user.pvId ?? null,
																empresaId: user.empresaId ?? null,
																activo: user.activo ?? true,
															});
														}
														setShowEmpresaPicker(false);
														onCloseMobile();
													});
												}
											}}
											className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition-colors ${
												emp.id === currentUser?.empresaId
													? "bg-primary/10 text-primary"
													: "hover:bg-secondary"
											}`}
										>
											<Building2 className="h-3.5 w-3.5 shrink-0" />
											<span className="truncate">{emp.nombre}</span>
											{emp.id === currentUser?.empresaId && (
												<Check className="ml-auto h-3.5 w-3.5" />
											)}
										</button>
									))}
								</div>
							</>
						)}
					</div>
				)}
				{/* Campana de notificaciones */}
				<div className="relative shrink-0">
					<button
						type="button"
						onClick={() => setShowNotifications((v) => !v)}
						className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors relative"
						title="Notificaciones"
					>
						<Bell className="h-5 w-5" />
						{(noLeidas ?? 0) > 0 && (
							<span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
								{noLeidas}
							</span>
						)}
					</button>

					{showNotifications && (
						<>
							<button
								type="button"
								aria-label="Cerrar notificaciones"
								className="fixed inset-0 z-10"
								onClick={() => setShowNotifications(false)}
							/>
							<div className="absolute right-0 mt-2 z-20 w-72 max-h-96 overflow-y-auto rounded-xl border border-border bg-card shadow-2xl p-2 text-foreground">
								<div className="flex items-center justify-between px-2 py-1.5 border-b border-border mb-1">
									<span className="text-xs font-bold uppercase tracking-wider">
										Notificaciones
									</span>
									{(noLeidas ?? 0) > 0 && (
										<button
											type="button"
											onClick={() => {
												if (usuarioId) {
													marcarTodasLeidas({
														usuarioId: usuarioId as Id<"usuarios">,
													});
												}
											}}
											className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
										>
											<Check className="h-3 w-3" />
											Marcar leídas
										</button>
									)}
								</div>

								{(notificaciones ?? []).length === 0 && (
									<p className="px-2 py-4 text-center text-xs text-muted-foreground">
										No tienes notificaciones.
									</p>
								)}

								{(notificaciones ?? []).map((n) => (
									<button
										type="button"
										key={n._id}
										onClick={() => {
											if (!n.leida && usuarioId) {
												marcarLeida({
													usuarioId: usuarioId as Id<"usuarios">,
													notificacionId: n._id as Id<"notificaciones">,
												});
											}
											if (n.enlace) {
												const tab = n.enlace.replace("/", "") as
													| "ordenes"
													| "cotizaciones";
												handleLinkClick(tab);
											}
											setShowNotifications(false);
										}}
										className={`w-full flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
											n.leida
												? "hover:bg-secondary/60"
												: "bg-primary/5 hover:bg-primary/10"
										}`}
									>
										<span
											className={`mt-1 h-2 w-2 shrink-0 rounded-full ${n.leida ? "bg-muted-foreground/30" : "bg-primary"}`}
										/>
										<span className="min-w-0">
											<span className="block text-xs font-bold text-foreground">
												{n.titulo}
											</span>
											<span className="block text-[11px] text-muted-foreground leading-snug">
												{n.mensaje}
											</span>
											<span className="block text-[10px] text-muted-foreground/70 mt-0.5">
												{new Date(n.fecha).toLocaleDateString()}{" "}
												{new Date(n.fecha).toLocaleTimeString([], {
													hour: "2-digit",
													minute: "2-digit",
												})}
											</span>
										</span>
									</button>
								))}
							</div>
						</>
					)}
				</div>

				<button
					type="button"
					onClick={onCloseMobile}
					className="lg:hidden p-1 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
				>
					<X className="h-5 w-5" />
				</button>
			</div>

			{/* Removed User Switcher */}

			{/* 2. Navigation List in the middle */}
			<nav className="flex-1 space-y-1.5 px-3 py-4 overflow-y-auto">
				{/* Búsqueda global */}
				<div className="relative mb-2">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<input
						type="search"
						value={searchTerm}
						onChange={(e) => {
							setSearchTerm(e.target.value);
							setShowSearch(true);
						}}
						onFocus={() => setShowSearch(true)}
						onBlur={() => {
							setTimeout(() => setShowSearch(false), 150);
						}}
						placeholder={t("nav.buscar")}
						className="w-full rounded-lg border border-border bg-secondary/40 pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
						aria-label="Búsqueda global"
					/>

					{showSearch && searchTerm.trim().length >= 2 && usuarioId && (
						<div className="absolute left-0 right-0 top-full mt-1 z-30 max-h-80 overflow-y-auto rounded-xl border border-border bg-card shadow-2xl p-2 space-y-3">
							{busqueda === undefined && (
								<p className="px-2 py-3 text-center text-xs text-muted-foreground">
									Buscando...
								</p>
							)}
							{busqueda &&
								busqueda.clientes.length === 0 &&
								busqueda.vehiculos.length === 0 &&
								busqueda.ordenes.length === 0 && (
									<p className="px-2 py-3 text-center text-xs text-muted-foreground">
										Sin resultados para "{searchTerm}".
									</p>
								)}

							{busqueda && busqueda.clientes.length > 0 && (
								<div>
									<p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
										Clientes
									</p>
									{busqueda.clientes.map((c) => (
										<button
											type="button"
											key={c.id}
											onClick={() => {
												handleLinkClick("clientes");
												setSearchTerm("");
											}}
											className="w-full flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-secondary transition-colors cursor-pointer"
										>
											<span className="font-semibold text-foreground truncate">
												{c.nombre}
											</span>
											<span className="text-muted-foreground shrink-0">
												{c.telefono}
											</span>
										</button>
									))}
								</div>
							)}

							{busqueda && busqueda.vehiculos.length > 0 && (
								<div>
									<p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
										Vehículos
									</p>
									{busqueda.vehiculos.map((v) => (
										<button
											type="button"
											key={v.id}
											onClick={() => {
												handleLinkClick("vehiculos");
												setSearchTerm("");
											}}
											className="w-full flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-secondary transition-colors cursor-pointer"
										>
											<span className="font-semibold text-foreground truncate">
												{v.placa}
											</span>
											<span className="text-muted-foreground shrink-0">
												{v.marca} {v.modelo}
											</span>
										</button>
									))}
								</div>
							)}

							{busqueda && busqueda.ordenes.length > 0 && (
								<div>
									<p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
										Órdenes
									</p>
									{busqueda.ordenes.map((o) => (
										<button
											type="button"
											key={o.id}
											onClick={() => {
												handleLinkClick("ordenes");
												setSearchTerm("");
											}}
											className="w-full flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-secondary transition-colors cursor-pointer"
										>
											<span className="font-semibold text-foreground truncate">
												{o.cliente}
											</span>
											<span className="text-muted-foreground shrink-0">
												{o.placa}
											</span>
										</button>
									))}
								</div>
							)}
						</div>
					)}
				</div>

				{filteredMenuItems.map((item) => {
					const Icon = item.icon;
					const isActive = activeTab === item.id;
					return (
						<button
							type="button"
							key={item.id}
							onClick={() => handleLinkClick(item.id)}
							className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold transition-all group cursor-pointer ${
								isActive
									? "bg-primary text-primary-foreground shadow-sm"
									: "hover:bg-accent text-foreground hover:text-foreground"
							}`}
						>
							<div className="flex items-center gap-3 truncate">
								<Icon
									className={`h-4 w-4 shrink-0 ${isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"}`}
								/>
								<span className="truncate">{item.label}</span>
							</div>

							{/* Optional notifications badges */}
							{item.badge !== undefined && (
								<span
									className={`inline-flex h-5 items-center justify-center rounded-full px-2 text-[10px] font-bold ${
										isActive
											? "bg-primary-foreground text-primary font-black"
											: "bg-primary text-primary-foreground font-black"
									}`}
								>
									{item.badge}
								</span>
							)}
						</button>
					);
				})}
			</nav>

			{/* 3. Footer Actions */}
			<div className="border-t border-border p-4 shrink-0 space-y-2">
				<button
					type="button"
					onClick={() => setLanguage(i18n.language === "es" ? "en" : "es")}
					className="flex w-full items-center justify-between rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors cursor-pointer"
				>
					<div className="flex items-center gap-2">
						<span className="text-xs font-bold uppercase tracking-wider">
							🌐
						</span>
						<span>{i18n.language === "es" ? "Español" : "English"}</span>
					</div>
					<span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
						{i18n.language === "es" ? "EN" : "ES"}
					</span>
				</button>

				<button
					type="button"
					onClick={toggleTheme}
					className="flex w-full items-center justify-between rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors cursor-pointer"
				>
					<div className="flex items-center gap-2">
						{theme === "light" ? (
							<>
								<Sun className="h-4 w-4 text-yellow-500" />
								<span>Modo Claro</span>
							</>
						) : (
							<>
								<Moon className="h-4 w-4 text-blue-400" />
								<span>Modo Oscuro</span>
							</>
						)}
					</div>
					<span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
						Cambiar
					</span>
				</button>

				<button
					type="button"
					onClick={() => setShowLogoutConfirm(true)}
					className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
				>
					<div className="flex items-center gap-2">
						<LogOut className="h-4 w-4" />
						<span>Cerrar Sesión</span>
					</div>
				</button>
			</div>

			{showLogoutConfirm && (
				<div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
					<div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl p-6 animate-in zoom-in-95 duration-200">
						<h3 className="text-lg font-bold text-foreground mb-2">
							Cerrar Sesión
						</h3>
						<p className="text-muted-foreground text-sm mb-6">
							¿Estás seguro que deseas cerrar tu sesión actual?
						</p>
						<div className="flex gap-3">
							<button
								type="button"
								onClick={() => setShowLogoutConfirm(false)}
								className="flex-1 px-4 py-2 border border-border text-foreground rounded-xl hover:bg-muted transition-colors font-medium text-sm"
							>
								Cancelar
							</button>
							<button
								type="button"
								onClick={() => {
									setShowLogoutConfirm(false);
									setCurrentUser(null);
								}}
								className="flex-1 px-4 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl transition-colors font-medium text-sm shadow-sm"
							>
								Cerrar Sesión
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);

	return (
		<>
			{/* Desktop sidebar: visible >= 1024px */}
			<div className="hidden lg:flex h-screen sticky top-0 shrink-0 z-20">
				{content}
			</div>

			{/* Mobile sidebar drawer: visible < 1024px */}
			<div
				className={`fixed inset-0 z-40 lg:hidden transition-all duration-300 ${
					isOpenMobile
						? "pointer-events-auto opacity-100"
						: "pointer-events-none opacity-0"
				}`}
			>
				{/* Overlay backdrop */}
				<button
					type="button"
					aria-label="Cerrar"
					onClick={onCloseMobile}
					className="fixed inset-0 bg-black/50 backdrop-blur-sm"
				/>

				{/* Drawer panel: slides from right to left: starts at translate-x-full and transitions to translate-x-0 */}
				<div
					className={`fixed top-0 right-0 bottom-0 h-full w-64 bg-card shadow-2xl transition-transform duration-300 transform ${
						isOpenMobile ? "translate-x-0" : "translate-x-full"
					}`}
				>
					{content}
				</div>
			</div>
		</>
	);
};
