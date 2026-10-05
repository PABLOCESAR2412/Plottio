import { useMutation, useQuery } from "convex/react";
import {
	Bell,
	Bot,
	Brain,
	Bug as BugIcon,
	CheckSquare,
	ClipboardList,
	DollarSign,
	Download,
	FileText,
	MessageSquare,
	Moon,
	Settings,
	Shield,
	Square,
	Sun,
	ToggleLeft,
	ToggleRight,
	Users,
	Webhook,
} from "lucide-react";
import type React from "react";
import { startTransition, useMemo, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { generarPdfReporte } from "../lib/pdf/reportePdf";
import { useIntegrationsStore } from "../store/useIntegrationsStore";
import { useSessionStore } from "../store/useSessionStore";
import type { Bug as BugType, ComentarioBug } from "../types/data";
import { AuditoriaView } from "./AuditoriaView";
import { ConfigPlantillas } from "./configuracion/ConfigPlantillas";
import { FinOpsMetricsPanel } from "./FinOpsMetricsPanel";
import { GestionUsuariosView } from "./GestionUsuariosView";
import { PlottioAsistenteModal } from "./PlottioAsistenteModal";
import { RolesView } from "./RolesView";
import { SuccessDialog } from "./SuccessDialog";
import { TelegramConfigModal } from "./TelegramConfigModal";
import { WebhookManagerModal } from "./WebhookManagerModal";
import { WhatsAppConfigModal } from "./WhatsAppConfigModal";

type LocalOrden = {
	id: string;
	clienteNombre: string;
	clienteTelefono?: string;
	vehiculoTipo: string;
	placa: string;
	estado: string;
	total: number;
	progreso: number;
	fechaInicio: string;
	fechaFin?: string;
};

type ReportRow = {
	id: string;
	numero_orden: string;
	cliente: string;
	clienteTelefono?: string;
	placa: string;
	vehiculoTipo?: string;
	total: number;
	estado: string;
	progreso?: number;
	fecha_creacion: string;
	fechaInicio?: string;
	fechaFin?: string;
	sucursal?: string;
	sucursalId?: string | null;
};

export interface ConfiguracionViewProps {
	onNavigate?: (tab: any) => void;
}

export const ConfiguracionView: React.FC<ConfiguracionViewProps> = ({
	onNavigate,
}) => {
	const currentUser = useSessionStore((s) => s.currentUser);
	const theme = useSessionStore((s) => s.theme);
	const toggleTheme = useSessionStore((s) => s.toggleTheme);
	const notificationsEnabled = useSessionStore((s) => s.notificationsEnabled);
	const notificationTypes = useSessionStore((s) => s.notificationTypes);
	const setNotificationsEnabled = useSessionStore(
		(s) => s.setNotificationsEnabled,
	);
	const setNotificationTypes = useSessionStore((s) => s.setNotificationTypes);

	const usuarioId = currentUser?.id;

	// ── QUERIES ──────────────────────────────────────────────────────────────
	const rawOrdenes = useQuery(
		api.ordenes.fetchOrdenes,
		usuarioId ? { usuarioId: usuarioId as Id<"usuarios"> } : "skip",
	) as Array<LocalOrden & { _id: string }> | undefined;

	const rawBugs = useQuery(
		api.bugs.fetchBugs,
		usuarioId ? { usuarioId: usuarioId as Id<"usuarios"> } : "skip",
	) as Array<BugType & { _id: string }> | undefined;

	const puedeVerReportes = useQuery(
		api.reportes.getPuedeVerReportes,
		usuarioId ? { usuarioId: usuarioId as Id<"usuarios"> } : "skip",
	) as boolean | undefined;

	// ── MUTATIONS ────────────────────────────────────────────────────────────
	const updateBugMut = useMutation(api.bugs.updateBug);
	const addBugCommentMut = useMutation(api.bugs.addBugComment);

	const ordenesTrabajo: LocalOrden[] = useMemo(
		() =>
			(rawOrdenes ?? []).map((o) => ({
				id: o._id,
				clienteNombre: o.clienteNombre ?? "",
				clienteTelefono: (o as { clienteTelefono?: string }).clienteTelefono,
				vehiculoTipo: o.vehiculoTipo ?? "",
				placa: (o as { placa?: string }).placa ?? "",
				estado: o.estado ?? "Pendiente",
				total: o.total ?? 0,
				progreso: o.progreso ?? 0,
				fechaInicio: (o as { fechaInicio?: string }).fechaInicio ?? "",
				fechaFin: (o as { fechaFin?: string }).fechaFin,
			})),
		[rawOrdenes],
	);

	const bugs: BugType[] = useMemo(
		() =>
			(rawBugs ?? []).map((b) => ({
				id: b._id,
				titulo: b.titulo ?? "",
				descripcion: b.descripcion ?? "",
				tipo: (b.tipo as BugType["tipo"]) ?? "Otro",
				importancia: (b.importancia as BugType["importancia"]) ?? "Media",
				ruta: b.ruta ?? "",
				fecha: b.fecha ?? "",
				hora: b.hora ?? "",
				usuarioId: b.usuarioId ?? "",
				usuarioNombre: b.usuarioNombre ?? "",
				sucursalId: b.sucursalId ?? null,
				imagenes: b.imagenes ?? [],
				estado: b.estado ?? "Abierto",
				comentarios: (b.comentarios ?? []) as ComentarioBug[],
			})),
		[rawBugs],
	);

	// Top level config tabs
	const [configTab, setConfigTab] = useState<
		| "general"
		| "plantillas"
		| "usuarios"
		| "roles"
		| "bugs"
		| "auditoria"
		| "integraciones"
		| "ia_finops"
	>("general");
	const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
	const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
	const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
	const [isPlottioAsistenteModalOpen, setIsPlottioAsistenteModalOpen] =
		useState(false);
	const { whatsapp, rag } = useIntegrationsStore();

	const [selectedBugId, setSelectedBugId] = useState<string | null>(null);
	const [newComment, setNewComment] = useState("");
	const [showArchivedBugs, setShowArchivedBugs] = useState(false);

	// Report filters (server-side)
	const [reporteDesde, setReporteDesde] = useState("");
	const [reporteHasta, setReporteHasta] = useState("");
	const [reporteEstado, setReporteEstado] = useState("");

	const reporteFiltros = useMemo(
		() => ({
			desde: reporteDesde || undefined,
			hasta: reporteHasta || undefined,
			estado: reporteEstado || undefined,
		}),
		[reporteDesde, reporteHasta, reporteEstado],
	);

	const rawReporteIngresos = useQuery(
		api.reportes.getReporteIngresos,
		usuarioId && puedeVerReportes
			? { usuarioId: usuarioId as Id<"usuarios">, filtros: reporteFiltros }
			: "skip",
	) as ReportRow[] | undefined;

	// Fuente para reportes: datos server-side (con permisos y filtros) o respaldo local
	const reporteData: LocalOrden[] = useMemo(() => {
		if (!puedeVerReportes || !rawReporteIngresos) return ordenesTrabajo;
		return rawReporteIngresos.map((r) => ({
			id: r.id,
			clienteNombre: r.cliente,
			clienteTelefono: r.clienteTelefono,
			vehiculoTipo: r.vehiculoTipo ?? "",
			placa: r.placa,
			estado: r.estado,
			total: r.total,
			progreso: r.progreso ?? 0,
			fechaInicio: r.fechaInicio ?? r.fecha_creacion,
			fechaFin: r.fechaFin,
		}));
	}, [puedeVerReportes, rawReporteIngresos, ordenesTrabajo]);

	// Success dialog configs
	const [alertConfig, setAlertConfig] = useState<{
		isOpen: boolean;
		title: string;
		message: string;
		type: "success" | "alert" | "delete";
		onConfirm?: () => void;
	}>({
		isOpen: false,
		title: "",
		message: "",
		type: "success",
	});

	const baseVisibleBugs = bugs;

	const visibleBugs =
		currentUser?.rol === "SuperAdmin" && showArchivedBugs
			? baseVisibleBugs.filter((b) => b.estado === "Resuelto")
			: baseVisibleBugs.filter((b) => b.estado !== "Resuelto");

	// Report Export: PDF
	const handleDownloadReportPDF = () => {
		generarPdfReporte(reporteData);

		setAlertConfig({
			isOpen: true,
			title: "Reporte PDF Generado",
			message:
				"Se descargó exitosamente el reporte PDF detallado de ganancias y operaciones.",
			type: "success",
		});
	};

	// Report Export: Excel (CSV)
	const handleDownloadReportExcel = () => {
		const today = new Date().toISOString().split("T")[0];

		// Build CSV Content
		let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // BOM for Excel UTF-8 support
		csvContent +=
			"ID de Orden,Fecha de Inicio,Fecha Fin,Nombre Cliente,Telefono Cliente,Categoria Vehiculo,Placa,Progreso %,Estado,Total Facturado (USD)\n";

		reporteData.forEach((o) => {
			const row = [
				o.id,
				o.fechaInicio,
				o.fechaFin,
				`"${o.clienteNombre.replace(/"/g, '""')}"`,
				`"${o.clienteTelefono}"`,
				`"${o.vehiculoTipo}"`,
				`"${o.placa}"`,
				`${o.progreso}%`,
				o.estado,
				o.total,
			].join(",");
			csvContent += `${row}\n`;
		});

		const encodedUri = encodeURI(csvContent);
		const link = document.createElement("a");
		link.setAttribute("href", encodedUri);
		link.setAttribute("download", `Reporte_Ganancias_Plottio_${today}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);

		setAlertConfig({
			isOpen: true,
			title: "Reporte Excel (CSV) Descargado",
			message:
				"Se ha exportado el registro de todas las operaciones y cobros en formato CSV compatible con Excel.",
			type: "success",
		});
	};

	return (
		<div className="space-y-6">
			{/* Header and Tabs */}
			<div className="flex flex-col gap-4">
				<div>
					<h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
						<span>Configuración</span>
					</h1>
					<p className="text-muted-foreground">
						Personaliza el comportamiento del sistema, notificaciones y
						administra las tarifas de stickers.
					</p>
				</div>

				<div className="flex flex-wrap items-center gap-2 border-b border-border pb-px">
					<button
						type="button"
						onClick={() => startTransition(() => setConfigTab("general"))}
						className={`px-4 py-2 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
							configTab === "general"
								? "border-primary text-primary"
								: "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
						}`}
					>
						<Settings className="h-4 w-4" />
						General y Preferencias
					</button>

					<button
						type="button"
						onClick={() => startTransition(() => setConfigTab("plantillas"))}
						className={`px-4 py-2 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
							configTab === "plantillas"
								? "border-primary text-primary"
								: "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
						}`}
					>
						<DollarSign className="h-4 w-4" />
						Plantilla de Precios
					</button>

					{(currentUser?.rol === "SuperAdmin" ||
						currentUser?.rol === "AdminSucursal") && (
						<button
							type="button"
							onClick={() => startTransition(() => setConfigTab("usuarios"))}
							className={`px-4 py-2 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
								configTab === "usuarios"
									? "border-primary text-primary"
									: "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
							}`}
						>
							<Users className="h-4 w-4" />
							Gestión de Accesos
						</button>
					)}

					{(currentUser?.rol === "SuperAdmin" ||
						currentUser?.rol === "AdminSucursal") && (
						<button
							type="button"
							onClick={() => startTransition(() => setConfigTab("roles"))}
							className={`px-4 py-2 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
								configTab === "roles"
									? "border-primary text-primary"
									: "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
							}`}
						>
							<Shield className="h-4 w-4" />
							Roles y Permisos
						</button>
					)}

					{(currentUser?.rol === "SuperAdmin" ||
						currentUser?.rol === "AdminSucursal") && (
						<button
							type="button"
							onClick={() => startTransition(() => setConfigTab("bugs"))}
							className={`px-4 py-2 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
								configTab === "bugs"
									? "border-primary text-primary"
									: "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
							}`}
						>
							<BugIcon className="h-4 w-4" />
							Reportes de Sistema
							{baseVisibleBugs.filter((b) => b.estado === "Abierto").length >
								0 && (
								<span className="ml-1 rounded-full bg-red-500 text-white text-[10px] px-1.5 py-0.5">
									{baseVisibleBugs.filter((b) => b.estado === "Abierto").length}
								</span>
							)}
						</button>
					)}

					{(currentUser?.rol === "SuperAdmin" ||
						currentUser?.rol === "AdminSucursal") && (
						<button
							type="button"
							onClick={() => startTransition(() => setConfigTab("auditoria"))}
							className={`px-4 py-2 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
								configTab === "auditoria"
									? "border-primary text-primary"
									: "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
							}`}
						>
							<ClipboardList className="h-4 w-4" />
							Auditoría (Log)
						</button>
					)}

					<button
						type="button"
						onClick={() => startTransition(() => setConfigTab("integraciones"))}
						className={`px-4 py-2 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
							configTab === "integraciones"
								? "border-primary text-primary"
								: "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
						}`}
					>
						<Webhook className="h-4 w-4" />
						Integraciones
					</button>

					<button
						type="button"
						onClick={() => startTransition(() => setConfigTab("ia_finops"))}
						className={`px-4 py-2 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
							configTab === "ia_finops"
								? "border-primary text-primary"
								: "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
						}`}
					>
						<Bot className="h-4 w-4" />
						<span>Analíticas y Configuración</span>
					</button>
				</div>
			</div>

			{configTab === "ia_finops" ? (
				<FinOpsMetricsPanel />
			) : configTab === "integraciones" ? (
				<div className="space-y-6">
					<div>
						<h2 className="text-xl font-bold text-foreground">
							Integraciones Empresariales & Conectores
						</h2>
						<p className="text-sm text-muted-foreground">
							Configuración centralizada de WhatsApp, Telegram y Webhooks.
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
						{/* WhatsApp Card */}
						<div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col justify-between space-y-4">
							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/15 text-green-600">
											<MessageSquare className="h-5 w-5" />
										</div>
										<div>
											<div className="font-bold text-foreground text-sm flex items-center gap-2">
												<span>WhatsApp</span>
												<span
													className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
														whatsapp.status === "connected"
															? "bg-green-500/15 text-green-600"
															: whatsapp.status === "connecting"
																? "bg-amber-500/15 text-amber-500"
																: "bg-muted text-muted-foreground"
													}`}
												>
													{whatsapp.status === "connected"
														? "Conectado"
														: whatsapp.status === "connecting"
															? "Conectando..."
															: "Desconectado"}
												</span>
											</div>
											<div className="text-xs text-muted-foreground">
												Instancia: {whatsapp.instanceName}
											</div>
										</div>
									</div>
								</div>
								<p className="text-xs text-muted-foreground leading-relaxed">
									Envío automático de notificaciones de cotización lista,
									órdenes de trabajo completadas y chat bidireccional desde la
									ficha de cada cliente.
								</p>
							</div>

							<div className="pt-3 border-t border-border flex items-center justify-between gap-2">
								<span
									className="text-xs text-muted-foreground font-mono truncate max-w-[200px]"
									title={whatsapp.serverUrl}
								>
									{whatsapp.serverUrl}
								</span>
								<button
									type="button"
									onClick={() => setIsWhatsAppModalOpen(true)}
									className="px-3 py-1.5 rounded-lg border border-green-500/30 bg-green-500/10 text-green-600 text-xs font-semibold hover:bg-green-500 hover:text-white transition-colors cursor-pointer shadow-xs"
								>
									Configurar WhatsApp
								</button>
							</div>
						</div>

						{/* Telegram Bot Card */}
						<div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col justify-between space-y-4">
							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#229ED9]/15 text-[#229ED9]">
											<Bot className="h-5 w-5" />
										</div>
										<div>
											<div className="font-bold text-foreground text-sm flex items-center gap-2">
												<span>Telegram Bot & ChatOps</span>
												<span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#229ED9]/15 text-[#229ED9]">
													@PlottioOpsBot
												</span>
											</div>
											<div className="text-xs text-muted-foreground">
												Alertas y comandos para técnicos
											</div>
										</div>
									</div>
								</div>
								<p className="text-xs text-muted-foreground leading-relaxed">
									Canal de operaciones push con comandos interactivos (/status,
									/ordenes, /alertas) para el equipo del taller.
								</p>
							</div>

							<div className="pt-3 border-t border-border flex items-center justify-between gap-2">
								<span className="text-xs text-muted-foreground">
									Webhook Activo
								</span>
								<button
									type="button"
									onClick={() => setIsTelegramModalOpen(true)}
									className="px-3 py-1.5 rounded-lg border border-[#229ED9]/30 bg-[#229ED9]/10 text-[#229ED9] text-xs font-semibold hover:bg-[#229ED9] hover:text-white transition-colors cursor-pointer shadow-xs"
								>
									Configurar Bot
								</button>
							</div>
						</div>

						{/* Central Webhooks Hub Card */}
						<div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col justify-between space-y-4">
							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15 text-purple-600">
											<Webhook className="h-5 w-5" />
										</div>
										<div>
											<div className="font-bold text-foreground text-sm flex items-center gap-2">
												<span>Hub Central de Webhooks</span>
												<span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-500/15 text-purple-600">
													HMAC SHA256
												</span>
											</div>
											<div className="text-xs text-muted-foreground">
												Zapier, Make, n8n & Inbound Leads
											</div>
										</div>
									</div>
								</div>
								<p className="text-xs text-muted-foreground leading-relaxed">
									Despacha eventos de negocio en tiempo real (clientes,
									cotizaciones, órdenes) y captura prospectos desde landings
									externas.
								</p>
							</div>

							<div className="pt-3 border-t border-border flex items-center justify-between gap-2">
								<span className="text-xs text-muted-foreground">
									Endpoints activos
								</span>
								<button
									type="button"
									onClick={() => setIsWebhookModalOpen(true)}
									className="px-3 py-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-600 text-xs font-semibold hover:bg-purple-600 hover:text-white transition-colors cursor-pointer shadow-xs"
								>
									Gestionar Webhooks
								</button>
							</div>
						</div>
						{/* Plottio Asistente (Agentic RAG) Card */}
						<div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col justify-between space-y-4">
							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
											<Brain className="h-5 w-5" />
										</div>
										<div>
											<div className="font-bold text-foreground text-sm flex items-center gap-2">
												<span>Plottio Asistente (Agentic RAG)</span>
											</div>
											<div className="text-xs text-muted-foreground">
												{rag.indexedDocumentsCount} entidades indexadas ·
												Similitud: {(rag.similarityThreshold * 100).toFixed(0)}%
											</div>
										</div>
									</div>
								</div>
								<p className="text-xs text-muted-foreground leading-relaxed">
									Recuperación semántica y herramientas de negocio sobre
									órdenes, cotizaciones, clientes e inventario. Genera
									respuestas contextualizadas citando los antecedentes del
									taller.
								</p>
							</div>

							<div className="pt-3 border-t border-border flex items-center justify-between gap-2">
								<span className="text-xs font-mono text-muted-foreground">
									Atajo: Cmd + K
								</span>
								<button
									type="button"
									onClick={() => {
										if (onNavigate) {
											onNavigate("asistente");
										} else {
											setIsPlottioAsistenteModalOpen(true);
										}
									}}
									className="px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 text-primary text-xs font-semibold hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer shadow-xs"
								>
									Abrir Asistente
								</button>
							</div>
						</div>
					</div>
				</div>
			) : configTab === "roles" ? (
				<RolesView />
			) : configTab === "usuarios" ? (
				<GestionUsuariosView />
			) : configTab === "auditoria" ? (
				<AuditoriaView />
			) : configTab === "bugs" &&
				(currentUser?.rol === "SuperAdmin" ||
					currentUser?.rol === "AdminSucursal") ? (
				<div className="space-y-4">
					<div className="flex justify-between items-end">
						<div>
							<h2 className="text-xl font-bold text-foreground">
								{showArchivedBugs
									? "Bugs Archivados (Resueltos)"
									: "Reportes de Bugs Activos"}
							</h2>
							<p className="text-sm text-muted-foreground">
								Revisa los problemas reportados por los usuarios.
							</p>
						</div>
						{currentUser?.rol === "SuperAdmin" && (
							<button
								type="button"
								onClick={() => setShowArchivedBugs(!showArchivedBugs)}
								className="text-sm font-semibold bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground px-4 py-2 rounded-lg transition-colors border border-border"
							>
								{showArchivedBugs ? "Ver Bugs Activos" : "Ver Bugs Archivados"}
							</button>
						)}
					</div>

					<div className="flex h-[calc(100vh-16rem)] min-h-[500px] border border-border rounded-xl overflow-hidden bg-card animate-fade-in">
						{/* Master List */}
						<div className="w-1/3 border-r border-border flex flex-col">
							<div className="p-4 border-b border-border bg-secondary/20">
								<h2 className="font-bold text-foreground">Bugs Reportados</h2>
								<p className="text-xs text-muted-foreground">
									Selecciona un reporte para ver detalles.
								</p>
							</div>
							<div className="flex-1 overflow-y-auto p-2 space-y-2">
								{visibleBugs.length === 0 ? (
									<div className="text-center py-8 text-muted-foreground text-sm">
										No hay bugs reportados.
									</div>
								) : (
									visibleBugs.map((bug) => (
										<button
											type="button"
											key={bug.id}
											onClick={() => setSelectedBugId(bug.id)}
											className={`w-full text-left p-3 rounded-lg border transition-all ${
												selectedBugId === bug.id
													? "bg-secondary/50 border-primary"
													: "border-transparent hover:bg-secondary/30 hover:border-border"
											}`}
										>
											<div className="flex justify-between items-start mb-1">
												<span
													className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
														bug.estado === "Abierto"
															? "bg-red-500/10 text-red-500"
															: bug.estado === "En Progreso"
																? "bg-yellow-500/10 text-yellow-500"
																: "bg-green-500/10 text-green-500"
													}`}
												>
													{bug.estado}
												</span>
												<span className="text-[10px] text-muted-foreground">
													{bug.fecha}
												</span>
											</div>
											<h4 className="font-semibold text-sm text-foreground truncate">
												{bug.titulo}
											</h4>
											<p className="text-xs text-muted-foreground truncate mt-1">
												{bug.descripcion}
											</p>
										</button>
									))
								)}
							</div>
						</div>

						{/* Detail View */}
						<div className="flex-1 flex flex-col bg-background/50">
							{selectedBugId ? (
								(() => {
									const bug = visibleBugs.find((b) => b.id === selectedBugId);
									if (!bug) return null;
									return (
										<>
											<div className="p-5 border-b border-border bg-card">
												<div className="flex justify-between items-start mb-4">
													<div>
														<h3 className="text-xl font-bold text-foreground mb-2">
															{bug.titulo}
														</h3>
														<div className="flex gap-2">
															<span className="text-xs font-semibold text-muted-foreground border border-border px-2 py-1 rounded">
																{bug.tipo}
															</span>
															<span
																className={`text-xs px-2 py-1 rounded font-bold ${
																	bug.importancia === "Critica"
																		? "bg-red-600 text-white"
																		: bug.importancia === "Alta"
																			? "bg-orange-500 text-white"
																			: "bg-secondary text-muted-foreground"
																}`}
															>
																{bug.importancia}
															</span>
														</div>
													</div>
													<select
														value={bug.estado}
														onChange={async (e) => {
															try {
																await updateBugMut({
																	usuarioId: currentUser.id as Id<"usuarios">,
																	bugId: bug.id as Id<"bugs">,
																	estado: e.target.value as
																		| "Abierto"
																		| "En Progreso"
																		| "Resuelto",
																});
															} catch (err) {
																console.error("Error updating bug:", err);
															}
														}}
														className="bg-background border border-border text-sm rounded-lg px-3 py-1.5 font-medium focus:ring-1 focus:ring-primary outline-none"
													>
														<option value="Abierto">Abierto</option>
														<option value="En Progreso">En Progreso</option>
														<option value="Resuelto">Resuelto</option>
													</select>
												</div>

												<div className="bg-secondary/30 p-4 rounded-xl border border-border/50 text-sm mb-4">
													<p className="text-foreground whitespace-pre-wrap">
														{bug.descripcion}
													</p>
												</div>

												<div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
													<span>
														<strong>Por:</strong> {bug.usuarioNombre}
													</span>
													<span>
														<strong>Fecha:</strong> {bug.fecha} {bug.hora}
													</span>
													<span className="font-mono">
														<strong>Ruta:</strong> {bug.ruta}
													</span>
												</div>

												{bug.imagenes && bug.imagenes.length > 0 && (
													<div className="mt-4 pt-4 border-t border-border/50">
														<strong className="text-xs text-muted-foreground mb-2 block">
															Capturas:
														</strong>
														<div className="flex gap-3 overflow-x-auto pb-2">
															{bug.imagenes.map((img, i) => (
																<a
																	// biome-ignore lint/suspicious/noArrayIndexKey: galería de capturas estática
																	key={i}
																	href={img}
																	target="_blank"
																	rel="noreferrer"
																	className="shrink-0 border border-border rounded-lg overflow-hidden h-24 w-32 hover:opacity-80 transition-opacity"
																>
																	<img
																		src={img}
																		alt={`Captura ${i + 1}`}
																		className="h-full w-full object-cover"
																	/>
																</a>
															))}
														</div>
													</div>
												)}
											</div>

											{/* Comments Section */}
											<div className="flex-1 overflow-y-auto p-5 space-y-4">
												<h4 className="font-bold text-sm text-foreground flex items-center gap-2">
													Comentarios ({bug.comentarios?.length || 0})
												</h4>
												<div className="space-y-3">
													{bug.comentarios?.map((c) => (
														<div
															key={c.id}
															className={`p-3 rounded-xl max-w-[85%] ${c.autorId === currentUser?.id ? "bg-primary/10 border border-primary/20 ml-auto" : "bg-secondary border border-border"}`}
														>
															<div className="flex justify-between items-baseline mb-1">
																<span className="text-xs font-bold text-foreground">
																	{c.autorNombre}
																</span>
																<span className="text-[10px] text-muted-foreground">
																	{c.fecha} {c.hora}
																</span>
															</div>
															<p className="text-sm text-foreground">
																{c.texto}
															</p>
														</div>
													))}
												</div>
											</div>

											{/* Comment Input */}
											<div className="p-4 border-t border-border bg-card">
												<form
													onSubmit={async (e) => {
														e.preventDefault();
														if (!newComment.trim() || !currentUser) return;
														try {
															await addBugCommentMut({
																usuarioId: currentUser.id as Id<"usuarios">,
																bugId: bug.id as Id<"bugs">,
																texto: newComment.trim(),
															});
															setNewComment("");
														} catch (err) {
															console.error("Error adding comment:", err);
														}
													}}
													className="flex gap-2"
												>
													<input
														type="text"
														value={newComment}
														onChange={(e) => setNewComment(e.target.value)}
														placeholder="Escribe un comentario..."
														className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
													/>
													<button
														type="submit"
														disabled={!newComment.trim()}
														className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
													>
														Enviar
													</button>
												</form>
											</div>
										</>
									);
								})()
							) : (
								<div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
									<BugIcon className="h-16 w-16 mb-4 opacity-20" />
									<p>Selecciona un reporte de la lista para ver sus detalles</p>
								</div>
							)}
						</div>
					</div>
				</div>
			) : configTab === "general" ? (
				<div className="animate-fade-in space-y-6 max-w-2xl">
					{/* General configs & System Notifications */}
					<div className="space-y-6">
						{/* Card 1: Notifications Control */}
						<div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
							<h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
								<Bell className="h-4.5 w-4.5 text-primary" />
								Notificaciones del Sistema
							</h3>
							<p className="text-xs text-muted-foreground">
								Configura las notificaciones emergentes de los procesos del
								taller.
							</p>

							{/* Activation Toggle */}
							<div className="flex items-center justify-between border-b border-border pb-3.5">
								<span className="text-xs font-bold text-foreground">
									Activar Notificaciones
								</span>
								<button
									type="button"
									onClick={() => setNotificationsEnabled(!notificationsEnabled)}
									className="focus:outline-none transition-transform active:scale-95 cursor-pointer"
									title={notificationsEnabled ? "Desactivar" : "Activar"}
								>
									{notificationsEnabled ? (
										<ToggleRight className="h-9 w-9 text-primary" />
									) : (
										<ToggleLeft className="h-9 w-9 text-muted-foreground" />
									)}
								</button>
							</div>

							{/* Notification Types Settings */}
							<div
								className={`space-y-2.5 transition-opacity ${notificationsEnabled ? "opacity-100" : "opacity-50 pointer-events-none"}`}
							>
								<span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
									Tipos de Notificaciones Activas:
								</span>

								<button
									type="button"
									onClick={() =>
										setNotificationTypes({ citas: !notificationTypes.citas })
									}
									className="w-full flex items-center justify-between rounded-lg border border-border p-2.5 text-left text-xs font-semibold hover:bg-secondary/40 transition-colors"
								>
									<div className="flex items-center gap-2">
										{notificationTypes.citas ? (
											<CheckSquare className="h-4.5 w-4.5 text-primary shrink-0" />
										) : (
											<Square className="h-4.5 w-4.5 text-muted-foreground shrink-0" />
										)}
										<span>Citas e Instalaciones</span>
									</div>
								</button>

								<button
									type="button"
									onClick={() =>
										setNotificationTypes({
											ordenes: !notificationTypes.ordenes,
										})
									}
									className="w-full flex items-center justify-between rounded-lg border border-border p-2.5 text-left text-xs font-semibold hover:bg-secondary/40 transition-colors"
								>
									<div className="flex items-center gap-2">
										{notificationTypes.ordenes ? (
											<CheckSquare className="h-4.5 w-4.5 text-primary shrink-0" />
										) : (
											<Square className="h-4.5 w-4.5 text-muted-foreground shrink-0" />
										)}
										<span>Órdenes de Trabajo</span>
									</div>
								</button>

								<button
									type="button"
									onClick={() =>
										setNotificationTypes({
											cotizaciones: !notificationTypes.cotizaciones,
										})
									}
									className="w-full flex items-center justify-between rounded-lg border border-border p-2.5 text-left text-xs font-semibold hover:bg-secondary/40 transition-colors"
								>
									<div className="flex items-center gap-2">
										{notificationTypes.cotizaciones ? (
											<CheckSquare className="h-4.5 w-4.5 text-primary shrink-0" />
										) : (
											<Square className="h-4.5 w-4.5 text-muted-foreground shrink-0" />
										)}
										<span>Presupuestos y Cotizaciones</span>
									</div>
								</button>
							</div>
						</div>

						{/* Card 2: Theme Selector */}
						<div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
							<h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
								<Sun className="h-4 w-4" />
								Tema Visual
							</h3>
							<p className="text-xs text-muted-foreground">
								Alterna entre modos claro y oscuro para comodidad de lectura.
							</p>

							<div className="grid grid-cols-2 gap-2">
								<button
									type="button"
									onClick={() => {
										if (theme !== "light") toggleTheme();
									}}
									className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold border transition-all cursor-pointer ${
										theme === "light"
											? "bg-primary text-primary-foreground border-primary shadow-sm"
											: "border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground"
									}`}
								>
									<Sun className="h-4 w-4" />
									Claro
								</button>
								<button
									type="button"
									onClick={() => {
										if (theme !== "dark") toggleTheme();
									}}
									className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold border transition-all cursor-pointer ${
										theme === "dark"
											? "bg-primary text-primary-foreground border-primary shadow-sm"
											: "border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground"
									}`}
								>
									<Moon className="h-4 w-4" />
									Oscuro
								</button>
							</div>
						</div>

						{/* Card 3: Currency */}
						<div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
							<h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
								<DollarSign className="h-4 w-4" />
								Moneda del Sistema
							</h3>
							<p className="text-xs text-muted-foreground">
								La moneda estándar del sistema está fijada de manera rígida.
							</p>

							<div className="flex items-center gap-3 rounded-lg border border-border p-3.5 bg-secondary/20">
								<div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-black">
									$
								</div>
								<div>
									<div className="text-xs text-muted-foreground">
										Moneda Principal
									</div>
									<div className="text-sm font-bold text-foreground">
										Dólar Estadounidense (USD)
									</div>
								</div>
							</div>
						</div>

						{/* Card 4: operational reports */}
						<div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
							<h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
								<FileText className="h-4.5 w-4.5 text-primary" />
								Reportes de Actividad y Ganancias
							</h3>
							<p className="text-xs text-muted-foreground">
								Exporta un resumen de los trabajos realizados, facturación
								total, y el listado de vehículos/clientes atendidos. Los datos
								se filtran de forma segura según tu rol en el taller central.
							</p>

							<div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-secondary/20 p-2.5">
								<label className="flex flex-col gap-1 text-[11px] font-semibold text-muted-foreground">
									Desde
									<input
										type="date"
										value={reporteDesde}
										onChange={(e) => setReporteDesde(e.target.value)}
										className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none"
									/>
								</label>
								<label className="flex flex-col gap-1 text-[11px] font-semibold text-muted-foreground">
									Hasta
									<input
										type="date"
										value={reporteHasta}
										onChange={(e) => setReporteHasta(e.target.value)}
										className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none"
									/>
								</label>
								<label className="flex flex-col gap-1 text-[11px] font-semibold text-muted-foreground col-span-2">
									Estado
									<select
										value={reporteEstado}
										onChange={(e) => setReporteEstado(e.target.value)}
										className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none"
									>
										<option value="">Todos</option>
										<option value="Pendiente">Pendiente</option>
										<option value="En Proceso">En Proceso</option>
										<option value="Listo">Listo</option>
										<option value="Entregado">Entregado</option>
										<option value="Cancelado">Cancelado</option>
									</select>
								</label>
								{(reporteDesde || reporteHasta || reporteEstado) && (
									<button
										type="button"
										onClick={() => {
											setReporteDesde("");
											setReporteHasta("");
											setReporteEstado("");
										}}
										className="col-span-2 rounded border border-border bg-background py-1 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
									>
										Limpiar filtros
									</button>
								)}
							</div>

							<div className="space-y-2">
								<button
									type="button"
									onClick={handleDownloadReportPDF}
									className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90 shadow-sm transition-all cursor-pointer"
								>
									<Download className="h-4 w-4" />
									Descargar Reporte PDF
								</button>

								<button
									type="button"
									onClick={handleDownloadReportExcel}
									className="w-full flex items-center justify-center gap-2 rounded-lg border border-border bg-card py-2.5 text-xs font-semibold text-foreground hover:bg-secondary transition-all cursor-pointer"
								>
									<FileText className="h-4 w-4 text-green-500" />
									Descargar Reporte Excel (CSV)
								</button>
							</div>
						</div>
					</div>
				</div>
			) : (
				<ConfigPlantillas />
			)}
			{/* CONFIRMATION OR SUCCESS OVERLAYS */}
			<SuccessDialog
				isOpen={alertConfig.isOpen}
				onClose={() => setAlertConfig((prev) => ({ ...prev, isOpen: false }))}
				title={alertConfig.title}
				message={alertConfig.message}
				type={alertConfig.type}
				onConfirm={alertConfig.onConfirm}
				confirmText={alertConfig.onConfirm ? "Aceptar" : "Entendido"}
			/>
			{/* WHATSAPP CONFIG MODAL */}
			<WhatsAppConfigModal
				isOpen={isWhatsAppModalOpen}
				onClose={() => setIsWhatsAppModalOpen(false)}
			/>

			{/* TELEGRAM CONFIG MODAL */}
			<TelegramConfigModal
				isOpen={isTelegramModalOpen}
				onClose={() => setIsTelegramModalOpen(false)}
			/>

			{/* CENTRAL WEBHOOKS MANAGER MODAL */}
			<WebhookManagerModal
				isOpen={isWebhookModalOpen}
				onClose={() => setIsWebhookModalOpen(false)}
			/>

			{/* PLOTTIO ASISTENTE MODAL */}
			<PlottioAsistenteModal
				isOpen={isPlottioAsistenteModalOpen}
				onClose={() => setIsPlottioAsistenteModalOpen(false)}
			/>
		</div>
	);
};
