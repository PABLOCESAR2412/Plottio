import { createFileRoute } from "@tanstack/react-router";
import { Mail, Menu, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { AceptarInvitacionView } from "../components/AceptarInvitacionView";
import { AgendaView } from "../components/AgendaView";
import { ApexBrainModal } from "../components/ApexBrainModal";
import { BugReporter } from "../components/BugReporter";
import { CatalogoView } from "../components/CatalogoView";
import { ClientesView } from "../components/ClientesView";
import { ConfiguracionView } from "../components/ConfiguracionView";
import { ContenidosView } from "../components/ContenidosView";
import { CotizacionesView } from "../components/CotizacionesView";
import { DashboardView } from "../components/DashboardView";
import { EmailIntegrationModal } from "../components/EmailIntegrationModal";
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
	| "kits"
	| "contenidos";

function AppLayout() {
	const currentUser = useSessionStore((s) => s.currentUser);
	const [activeTab, setActiveTab] = useState<TabId>("dashboard");
	const [isOpenMobile, setIsOpenMobile] = useState(false);
	const [loading, setLoading] = useState(true);
	const [isApexBrainOpen, setIsApexBrainOpen] = useState(false);
	const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
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
			case "contenidos":
				return <ContenidosView />;
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
			case "catalogo":
				return "Catálogo de Servicios";
			case "lotes":
				return "Lotes de Producción";
			case "kits":
				return "Kits de Flota";
			case "contenidos":
				return "Contenidos & Redes Sociales";
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
						<div className="flex items-center gap-3">
							<button
								type="button"
								onClick={() => setIsApexBrainOpen(true)}
								className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-secondary text-xs text-muted-foreground transition-colors cursor-pointer shadow-xs"
								title="Buscar semánticamente con APEX Brain (Cmd+K)"
							>
								<Sparkles className="h-3.5 w-3.5 text-primary" />
								<span className="font-semibold text-foreground">
									APEX Brain
								</span>
								<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
									<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
									Activo (pgvector 768d)
								</span>
								<kbd className="px-1.5 py-0.5 rounded bg-secondary text-[10px] font-mono border border-border">
									⌘K
								</kbd>
							</button>

							<button
								type="button"
								onClick={() => setIsEmailModalOpen(true)}
								className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background hover:bg-secondary text-foreground transition-colors cursor-pointer shrink-0 shadow-xs"
								title="Configurar Correo Corporativo (SMTP/OAuth2)"
							>
								<Mail className="h-4 w-4" />
							</button>

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
				<div className="flex-1 overflow-y-auto w-full overscroll-contain">
					{/* Core Main Viewport content */}
					<main className="p-4 sm:p-6 w-full max-w-7xl mx-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
						<div className="animate-fade-in">{renderActiveView()}</div>
					</main>
				</div>
			</div>

			{/* Global Floating Actions */}
			<BugReporter currentSection={getPageTitle()} />

			{/* APEX BRAIN GLOBAL SEARCH MODAL */}
			<ApexBrainModal
				isOpen={isApexBrainOpen}
				onClose={() => setIsApexBrainOpen(false)}
				onNavigate={setActiveTab}
			/>

			{/* CORPORATE EMAIL GLOBAL MODAL */}
			<EmailIntegrationModal
				isOpen={isEmailModalOpen}
				onClose={() => setIsEmailModalOpen(false)}
			/>
		</div>
	);
}
