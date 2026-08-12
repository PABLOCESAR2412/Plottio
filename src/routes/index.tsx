import { createFileRoute } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
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
import { Loader } from "../components/Loader";
import { LoginView } from "../components/LoginView";
import { LotesProduccionView } from "../components/LotesProduccionView";
import { OrdenesTrabajoView } from "../components/OrdenesTrabajoView";
import PlottioLogo from "../components/PlottioLogo";
import { Sidebar } from "../components/Sidebar";
import {
	BreadcrumbNavegacion,
	SucursalBadge,
	SucursalSelector,
} from "../components/SucursalesAdmin";
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
	| "kits";

function AppLayout() {
	const currentUser = useSessionStore((s) => s.currentUser);
	const [activeTab, setActiveTab] = useState<TabId>("dashboard");
	const [isOpenMobile, setIsOpenMobile] = useState(false);
	const [loading, setLoading] = useState(true);
	const [preselectedVehicleId, setPreselectedVehicleId] = useState<
		string | null
	>(null);
	const [preselectedOrderId, setPreselectedOrderId] = useState<string | null>(
		null,
	);

	useEffect(() => {
		const timer = setTimeout(() => {
			setLoading(false);
		}, 1500);
		return () => clearTimeout(timer);
	}, []);

	// Switch between tabs
	const renderActiveView = () => {
		switch (activeTab) {
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
				return <ConfiguracionView />;
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
			default:
				return "Panel de Control";
		}
	};

	if (loading) {
		return (
			<div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background text-foreground animate-fade-in">
				<div className="flex flex-col items-center gap-4 text-center">
					<PlottioLogo size="lg" className="animate-pulse" />
					<p className="text-xs text-muted-foreground tracking-wider uppercase font-semibold">
						Cargando taller de rotulación...
					</p>
					<div className="w-48 h-1.5 bg-secondary rounded-full overflow-hidden border border-border mt-2">
						<div
							className="bg-primary h-full rounded-full transition-all duration-300"
							style={{
								width: "60%",
								animation: "slide 1.5s infinite ease-in-out",
							}}
						/>
					</div>
				</div>
				<style>{`
          @keyframes slide {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(200%); }
          }
        `}</style>
			</div>
		);
	}

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

	if (loading) {
		return (
			<div className="w-screen h-screen flex items-center justify-center bg-background">
				<Loader />
			</div>
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
								className="lg:hidden p-1.5 rounded-lg border border-border bg-background text-foreground hover:bg-secondary transition-colors cursor-pointer"
							>
								<Menu className="h-5 w-5" />
							</button>
							<span className="lg:hidden flex items-center min-w-0">
								<PlottioLogo size="sm" />
							</span>
						</div>

						{/* Top Right Controls */}
						<div className="flex items-center gap-4">
							<div className="hidden sm:block">
								<SucursalSelector />
							</div>
							<SucursalBadge />
						</div>
					</div>

					{/* Breadcrumb Bar */}
					<div className="h-10 px-4 sm:px-6 flex items-center border-t border-border/50 bg-background/50">
						<BreadcrumbNavegacion tabName={getPageTitle()} />
					</div>
				</header>

				{/* Scrollable Container spanning full width, placing scrollbar at the far right edge */}
				<div className="flex-1 overflow-y-auto w-full">
					{/* Core Main Viewport content */}
					<main className="p-3 sm:p-4 md:p-6 w-full max-w-7xl mx-auto">
						<div className="animate-fade-in">{renderActiveView()}</div>
					</main>
				</div>
			</div>

			{/* Global Floating Actions */}
			<BugReporter currentSection={getPageTitle()} />
		</div>
	);
}
