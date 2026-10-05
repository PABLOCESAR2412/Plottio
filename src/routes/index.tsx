import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { Menu, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { AceptarInvitacionView } from "../components/AceptarInvitacionView";
import { AgendaView } from "../components/AgendaView";
import { BugReporter } from "../components/BugReporter";
import { CatalogoView } from "../components/CatalogoView";
import { ClientesView } from "../components/ClientesView";
import { ConfiguracionView } from "../components/ConfiguracionView";
import { CotizacionesView } from "../components/CotizacionesView";
import { DashboardView } from "../components/DashboardView";
import { EmpresasView } from "../components/EmpresasView";
import { InventarioView } from "../components/InventarioView";
import { KitsFlotaView } from "../components/KitsFlotaView";
import { LoginView } from "../components/LoginView";
import { LotesProduccionView } from "../components/LotesProduccionView";
import { OrdenesTrabajoView } from "../components/OrdenesTrabajoView";
import { PlottioAsistenteModal } from "../components/PlottioAsistenteModal";
import { PlottioAsistenteView } from "../components/PlottioAsistenteView";
import PlottioLogo from "../components/PlottioLogo";
import { Sidebar } from "../components/Sidebar";
import { BreadcrumbNavegacion } from "../components/SucursalesAdmin";
import { VehiculosView } from "../components/VehiculosView";
import { useSessionStore } from "../store/useSessionStore";

export const Route = createFileRoute("/")({
	component: AppLayout,
});

type TabId =
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
	| "kits"
	| "asistente";

export function AppLayout() {
	const currentUser = useSessionStore((s) => s.currentUser);
	const setCurrentUser = useSessionStore((s) => s.setCurrentUser);

	const sesion = useQuery(
		api.usuarios.validarSesion,
		currentUser?.id ? { usuarioId: currentUser.id } : "skip",
	);

	useEffect(() => {
		if (sesion && !sesion.valida) {
			setCurrentUser(null);
			toast.error("Sesión no válida o expirada. Por favor inicia sesión.");
		}
	}, [sesion, setCurrentUser]);

	const [activeTab, setActiveTab] = useState<TabId>("dashboard");
	const [isOpenMobile, setIsOpenMobile] = useState(false);
	const [isPlottioAsistenteOpen, setIsPlottioAsistenteOpen] = useState(false);
	const [preselectedVehicleId, setPreselectedVehicleId] = useState<
		string | null
	>(null);
	const [preselectedOrderId, setPreselectedOrderId] = useState<string | null>(
		null,
	);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				setActiveTab((prev) =>
					prev === "asistente" ? "dashboard" : "asistente",
				);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	// Switch between tabs
	const renderActiveView = () => {
		switch (activeTab) {
			case "asistente":
				return <PlottioAsistenteView onNavigate={setActiveTab} />;
			case "clientes":
				return (
					<ClientesView
						onNavigate={setActiveTab}
						onSelectVehicle={(vId) => {
							setPreselectedVehicleId(vId);
							setActiveTab("vehiculos");
						}}
					/>
				);
			case "empresas":
				return (
					<EmpresasView
						onNavigate={setActiveTab}
						onSelectVehicle={(vId) => {
							setPreselectedVehicleId(vId);
							setActiveTab("vehiculos");
						}}
					/>
				);
			case "vehiculos":
				return (
					<VehiculosView
						onNavigate={setActiveTab}
						preselectedVehicleId={preselectedVehicleId}
						clearPreselectedVehicle={() => setPreselectedVehicleId(null)}
						onSelectOrder={(oId) => {
							setPreselectedOrderId(oId);
							setActiveTab("ordenes");
						}}
					/>
				);
			case "cotizaciones":
				return <CotizacionesView onNavigate={setActiveTab} />;
			case "ordenes":
				return (
					<OrdenesTrabajoView
						preselectedOrderId={preselectedOrderId}
						clearPreselectedOrder={() => setPreselectedOrderId(null)}
					/>
				);
			case "agenda":
				return <AgendaView />;
			case "configuracion":
				return <ConfiguracionView onNavigate={setActiveTab} />;
			case "inventario":
				return <InventarioView />;
			case "catalogo":
				return <CatalogoView />;
			case "lotes":
				return <LotesProduccionView />;
			case "kits":
				return <KitsFlotaView />;
			default:
				return (
					<DashboardView
						onNavigate={setActiveTab}
						onCreateCotizacionClick={() => setActiveTab("cotizaciones")}
						onAgendarCitaClick={() => setActiveTab("agenda")}
					/>
				);
		}
	};

	const getPageTitle = () => {
		switch (activeTab) {
			case "asistente":
				return "Plottio Asistente";
			case "clientes":
				return "Clientes";
			case "empresas":
				return "Empresas y Flotas";
			case "vehiculos":
				return "Inventario de Vehículos";
			case "cotizaciones":
				return "Nueva Cotización";
			case "ordenes":
				return "Órdenes de Trabajo";
			case "agenda":
				return "Agenda e Instalaciones";
			case "configuracion":
				return "Configuración";
			case "inventario":
				return "Inventario Distribuido";
			case "catalogo":
				return "Catálogo de Servicios";
			case "lotes":
				return "Lotes de Producción";
			case "kits":
				return "Kits de Flota";
			default:
				return "Panel de Control";
		}
	};

	const urlParams = new URLSearchParams(window.location.search);
	const token = urlParams.get("token");

	if (token) {
		return (
			<AceptarInvitacionView
				token={token}
				onNavigateToLogin={() => {
					window.location.href = "/";
				}}
			/>
		);
	}

	if (!currentUser) {
		return <LoginView />;
	}

	return (
		<div className="flex h-screen bg-background overflow-hidden w-screen">
			{/* Sidebar: column 1, static on desktop, slide drawer on mobile */}
			<Sidebar
				activeTab={activeTab}
				onNavigate={setActiveTab}
				isOpenMobile={isOpenMobile}
				onCloseMobile={() => setIsOpenMobile(false)}
			/>

			{/* Main viewport: column 2 */}
			<div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-background">
				{/* Global Header (Desktop & Mobile) */}
				<header className="shrink-0 w-full flex flex-col border-b border-border bg-card z-30">
					<div className="h-14 px-4 sm:px-6 flex items-center justify-between">
						<div className="flex items-center gap-3">
							<button
								type="button"
								onClick={() => setIsOpenMobile(true)}
								className="lg:hidden flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-secondary transition-colors cursor-pointer shrink-0"
								aria-label="Abrir menú"
							>
								<Menu className="h-5 w-5" />
							</button>
							<span className="lg:hidden flex items-center min-w-0">
								<PlottioLogo size="sm" />
							</span>
						</div>

						{/* Top Right Controls */}
						<div className="flex items-center gap-2 sm:gap-3">
							<button
								type="button"
								onClick={() => setActiveTab("asistente")}
								className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg border transition-colors cursor-pointer shadow-xs ${
									activeTab === "asistente"
										? "bg-primary text-primary-foreground border-primary"
										: "border-border bg-background hover:bg-secondary text-xs text-muted-foreground"
								}`}
								title="Consultar con Plottio Asistente (Cmd+K)"
							>
								<Sparkles
									className={`h-3.5 w-3.5 shrink-0 ${
										activeTab === "asistente"
											? "text-primary-foreground"
											: "text-primary"
									}`}
								/>
								<span
									className={`font-semibold text-xs truncate ${
										activeTab === "asistente"
											? "text-primary-foreground"
											: "text-foreground"
									}`}
								>
									<span className="hidden sm:inline">Plottio </span>Asistente
								</span>
								<span
									className={`hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
										activeTab === "asistente"
											? "bg-white/20 text-white border border-white/30"
											: "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
									}`}
								>
									<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
									RAG Operacional
								</span>
								<kbd
									className={`hidden lg:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono border ${
										activeTab === "asistente"
											? "bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30"
											: "bg-secondary text-muted-foreground border-border"
									}`}
								>
									⌘K
								</kbd>
							</button>
						</div>
					</div>

					{/* Breadcrumb Bar */}
					<div className="h-10 px-4 sm:px-6 flex items-center border-t border-border/50 bg-background/50">
						<BreadcrumbNavegacion tabName={getPageTitle()} />
					</div>
				</header>

				{/* Contenedor de Vista: Pantalla completa para Asistente, scroll estándar para otras vistas */}
				{activeTab === "asistente" ? (
					<div className="flex-1 flex min-w-0 h-full overflow-hidden w-full">
						<PlottioAsistenteView onNavigate={setActiveTab} />
					</div>
				) : (
					<div className="flex-1 overflow-y-auto w-full overscroll-contain">
						{/* Core Main Viewport content */}
						<main className="p-4 sm:p-6 w-full max-w-7xl mx-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
							<div className="animate-fade-in">{renderActiveView()}</div>
						</main>
					</div>
				)}
			</div>

			{/* Global Floating Actions */}
			<BugReporter currentSection={getPageTitle()} />

			{/* PLOTTIO ASISTENTE GLOBAL MODAL */}
			<PlottioAsistenteModal
				isOpen={isPlottioAsistenteOpen}
				onClose={() => setIsPlottioAsistenteOpen(false)}
				onNavigate={(tab) => setActiveTab(tab as TabId)}
			/>
		</div>
	);
}
