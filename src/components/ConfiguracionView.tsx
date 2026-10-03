import { useMutation, useQuery } from "convex/react";
import {
	Bell,
	BookOpen,
	Bot,
	Brain,
	Bug as BugIcon,
	Building,
	CheckSquare,
	ClipboardList,
	DollarSign,
	Download,
	FileText,
	Mail,
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
import { ApexBrainModal } from "./ApexBrainModal";
import { AuditoriaView } from "./AuditoriaView";
import { ConfigPlantillas } from "./configuracion/ConfigPlantillas";
import { EmailIntegrationModal } from "./EmailIntegrationModal";
import { FinOpsMetricsPanel } from "./FinOpsMetricsPanel";
import { GestionUsuariosView } from "./GestionUsuariosView";
import { RolesView } from "./RolesView";
import { SuccessDialog } from "./SuccessDialog";
import { SucursalesAdminView } from "./SucursalesAdmin";
import { TelegramConfigModal } from "./TelegramConfigModal";
import { WebhookManagerModal } from "./WebhookManagerModal";

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

export const ConfiguracionView: React.FC = () => {
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

	const rawSucursales = useQuery(
		api.organizacion.getSucursales,
		currentUser?.empresaId
			? { empresaId: currentUser.empresaId as Id<"empresas"> }
			: {},
	) as Array<{ _id: string; nombre: string }> | undefined;

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
		| "sucursales"
		| "auditoria"
		| "integraciones"
		| "ia_finops"
	>("general");
	const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
	const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
	const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
	const [isApexBrainModalOpen, setIsApexBrainModalOpen] = useState(false);
	const [showGuidesSection, setShowGuidesSection] = useState(false);
	const [selectedGuideTab, setSelectedGuideTab] = useState<
		"whatsapp" | "telegram" | "email" | "ai" | "pgvector" | "webhooks"
	>("whatsapp");
	const { rag } = useIntegrationsStore();

	const [selectedBugId, setSelectedBugId] = useState<string | null>(null);
	const [newComment, setNewComment] = useState("");
	const [showArchivedBugs, setShowArchivedBugs] = useState(false);

	// Report filters (server-side)
	const [reporteDesde, setReporteDesde] = useState("");
	const [reporteHasta, setReporteHasta] = useState("");
	const [reporteEstado, setReporteEstado] = useState("");
	const [reporteSucursalId, setReporteSucursalId] = useState("");

	const reporteFiltros = useMemo(
		() => ({
			desde: reporteDesde || undefined,
			hasta: reporteHasta || undefined,
			estado: reporteEstado || undefined,
			sucursalId: reporteSucursalId
				? (reporteSucursalId as Id<"sucursales">)
				: undefined,
		}),
		[reporteDesde, reporteHasta, reporteEstado, reporteSucursalId],
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

	const baseVisibleBugs = bugs.filter(
		(b) =>
			!currentUser?.sucursalId ||
			!b.sucursalId ||
			b.sucursalId === currentUser.sucursalId,
	);

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
						<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
							<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
							Activo (pgvector 768d)
						</span>
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

					{currentUser?.rol === "SuperAdmin" && (
						<button
							type="button"
							onClick={() => startTransition(() => setConfigTab("sucursales"))}
							className={`px-4 py-2 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
								configTab === "sucursales"
									? "border-primary text-primary"
									: "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
							}`}
						>
							<Building className="h-4 w-4" />
							Sucursales
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
						<span>IA / FinOps</span>
						<span className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
							<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
							Activo (pgvector 768d)
						</span>
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
							Configuración centralizada de WhatsApp, Telegram, Correo
							Corporativo y Webhooks.
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
						{/* WhatsApp Evolution API Card */}
						<div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col justify-between space-y-4">
							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/15 text-green-600">
											<MessageSquare className="h-5 w-5" />
										</div>
										<div>
											<div className="font-bold text-foreground text-sm flex items-center gap-2">
												<span>WhatsApp (Evolution API)</span>
												<span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-green-500/15 text-green-600">
													Conectado
												</span>
											</div>
											<div className="text-xs text-muted-foreground">
												Instancia: plottio-central
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
								<span className="text-xs text-muted-foreground font-mono">
									https://api.evolution.plottio.com
								</span>
								<button
									type="button"
									onClick={() => {
										setAlertConfig({
											isOpen: true,
											title: "WhatsApp Sincronizado",
											message:
												"La instancia Evolution API responde con estado 200 OK y sesión activa.",
											type: "success",
										});
									}}
									className="px-3 py-1.5 rounded-lg border border-green-500/30 bg-green-500/10 text-green-600 text-xs font-semibold hover:bg-green-500 hover:text-white transition-colors cursor-pointer shadow-xs"
								>
									Verificar Sesión
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

						{/* Corporate Email Card */}
						<div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col justify-between space-y-4">
							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
											<Mail className="h-5 w-5" />
										</div>
										<div>
											<div className="font-bold text-foreground text-sm flex items-center gap-2">
												<span>Correo Corporativo (SMTP/OAuth2)</span>
												<span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-primary/15 text-primary">
													Outlook / 365
												</span>
											</div>
											<div className="text-xs text-muted-foreground">
												contacto@plottio.com
											</div>
										</div>
									</div>
								</div>
								<p className="text-xs text-muted-foreground leading-relaxed">
									Servidor SMTP transaccional para el despacho de presupuestos
									adjuntos en PDF y seguimiento de trabajos.
								</p>
							</div>

							<div className="pt-3 border-t border-border flex items-center justify-between gap-2">
								<span className="text-xs text-muted-foreground font-mono">
									Puerto 587 (TLS)
								</span>
								<button
									type="button"
									onClick={() => setIsEmailModalOpen(true)}
									className="px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 text-primary text-xs font-semibold hover:bg-primary hover:text-white transition-colors cursor-pointer shadow-xs"
								>
									Credenciales SMTP
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
						{/* APEX Brain RAG pgvector Card */}
						<div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col justify-between space-y-4">
							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
											<Brain className="h-5 w-5" />
										</div>
										<div>
											<div className="font-bold text-foreground text-sm flex items-center gap-2">
												<span>APEX Brain (RAG con pgvector)</span>
												<span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
													Activo (pgvector 768d)
												</span>
											</div>
											<div className="text-xs text-muted-foreground">
												{rag.indexedDocumentsCount} entidades indexadas ·
												Similitud: {(rag.similarityThreshold * 100).toFixed(0)}%
											</div>
										</div>
									</div>
								</div>
								<p className="text-xs text-muted-foreground leading-relaxed">
									Recuperación semántica sobre órdenes, cotizaciones y acuerdos
									comerciales. Genera respuestas contextualizadas citando los
									antecedentes del taller.
								</p>
							</div>

							<div className="pt-3 border-t border-border flex items-center justify-between gap-2">
								<span className="text-xs font-mono text-muted-foreground">
									Atajo: Cmd + K
								</span>
								<button
									type="button"
									onClick={() => setIsApexBrainModalOpen(true)}
									className="px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 text-primary text-xs font-semibold hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer shadow-xs"
								>
									Abrir APEX Brain
								</button>
							</div>
						</div>
					</div>

					{/* STEP-BY-STEP OFFICIAL GUIDES SECTION */}
					<div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
							<div className="space-y-1">
								<h3 className="text-base font-bold text-foreground flex items-center gap-2">
									<BookOpen className="h-5 w-5 text-primary" />
									<span>Guías Oficiales de Conexión & Despliegue</span>
								</h3>
								<p className="text-xs text-muted-foreground">
									Comandos Docker, scripts SQL de pgvector, credenciales OAuth2
									y parámetros de configuración paso a paso.
								</p>
							</div>

							<button
								type="button"
								onClick={() => setShowGuidesSection((v) => !v)}
								className="px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-secondary text-xs font-bold text-foreground transition-colors cursor-pointer self-start sm:self-auto shadow-xs"
							>
								{showGuidesSection ? "Ocultar Guías" : "Ver Guías Paso a Paso"}
							</button>
						</div>

						{showGuidesSection && (
							<div className="space-y-4 animate-fade-in text-xs sm:text-sm">
								{/* Guides Sub-tabs */}
								<div className="flex gap-2 overflow-x-auto pb-2 border-b border-border/60 text-xs font-bold">
									{[
										{ id: "whatsapp", label: "1. WhatsApp (Evolution)" },
										{ id: "telegram", label: "2. Telegram Bot" },
										{ id: "email", label: "3. Correo Corporativo" },
										{ id: "ai", label: "4. Modelos IA & FinOps" },
										{ id: "pgvector", label: "5. pgvector (RAG)" },
										{ id: "webhooks", label: "6. Hub Webhooks" },
									].map((tab) => (
										<button
											key={tab.id}
											type="button"
											onClick={() => setSelectedGuideTab(tab.id as any)}
											className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap border ${
												selectedGuideTab === tab.id
													? "bg-primary text-primary-foreground border-primary shadow-xs"
													: "bg-secondary/20 text-muted-foreground border-border hover:text-foreground"
											}`}
										>
											{tab.label}
										</button>
									))}
								</div>

								{/* Guide 1: WhatsApp */}
								{selectedGuideTab === "whatsapp" && (
									<div className="space-y-3 bg-secondary/10 p-4 rounded-xl border border-border leading-relaxed text-xs">
										<div className="font-bold text-foreground text-sm">
											1. WhatsApp Empresarial (Evolution API con Docker)
										</div>
										<p className="text-muted-foreground">
											Evolution API es un servidor open source para automatizar
											WhatsApp sin suscripciones por mensaje.
										</p>
										<ol className="list-decimal list-inside space-y-1.5 text-muted-foreground text-[11px]">
											<li>
												Levanta el contenedor de Evolution API en tu servidor
												VPS:
												<pre className="p-2 mt-1 rounded bg-background border border-border font-mono text-[10px] text-foreground overflow-x-auto">
													docker run -d --name evolution-api -p 8080:8080 \
													<br />
													&nbsp;&nbsp;-e
													AUTHENTICATION_API_KEY=tu_clave_super_secreta \<br />
													&nbsp;&nbsp;atendai/evolution-api:latest
												</pre>
											</li>
											<li>
												Crea la instancia vinculando el número de la empresa:
												<pre className="p-2 mt-1 rounded bg-background border border-border font-mono text-[10px] text-foreground overflow-x-auto">
													curl -X POST http://tu-servidor:8080/instance/create \
													<br />
													&nbsp;&nbsp;-H "apikey: tu_clave_super_secreta" \
													<br />
													&nbsp;&nbsp;-d '&#123;"instanceName":
													"plottio-central"&#125;'
												</pre>
											</li>
											<li>
												Abre el código QR retornado y escanéalo con WhatsApp en
												tu teléfono corporativo.
											</li>
											<li>
												Configura el webhook de sincronización en Evolution API
												apuntando a la URL de tu instancia de PLOTTIO.
											</li>
										</ol>
									</div>
								)}

								{/* Guide 2: Telegram */}
								{selectedGuideTab === "telegram" && (
									<div className="space-y-3 bg-secondary/10 p-4 rounded-xl border border-border leading-relaxed text-xs">
										<div className="font-bold text-foreground text-sm">
											2. Telegram Bot API (ChatOps & Notificaciones Críticas)
										</div>
										<p className="text-muted-foreground">
											Configura un bot dedicado en menos de 2 minutos para
											recibir avisos de nuevas órdenes, asignaciones de taller y
											cambios de estado.
										</p>
										<ol className="list-decimal list-inside space-y-1.5 text-muted-foreground text-[11px]">
											<li>
												Abre Telegram y busca{" "}
												<strong className="text-foreground">@BotFather</strong>.
												Envía el comando <code>/newbot</code>.
											</li>
											<li>
												Ingresa el nombre de tu bot (ej. <em>Plottio Taller</em>
												) y un usuario que termine en <code>bot</code>.
											</li>
											<li>
												Copia el <strong>HTTP API Token</strong> que te entrega
												BotFather.
											</li>
											<li>
												Para obtener tu <strong>Chat ID</strong>:
												<ul className="list-disc list-inside ml-4 mt-0.5 space-y-0.5">
													<li>
														Para chat personal: escribe a <em>@userinfobot</em>{" "}
														y copia tu Id numérico.
													</li>
													<li>
														Para grupo de trabajo: añade tu bot al grupo, agrega
														temporalmente a <em>@RawDataBot</em> y copia el ID
														del chat (ej. <code>-100...</code>).
													</li>
												</ul>
											</li>
											<li>
												Pega las credenciales en la pestaña{" "}
												<em>2. Notificaciones Telegram</em> de esta pantalla o
												en el modal de ChatOps y pulsa{" "}
												<em>Probar Alerta Instantánea</em>.
											</li>
										</ol>
									</div>
								)}

								{/* Guide 3: Email */}
								{selectedGuideTab === "email" && (
									<div className="space-y-3 bg-secondary/10 p-4 rounded-xl border border-border leading-relaxed text-xs">
										<div className="font-bold text-foreground text-sm">
											3. Bandeja de Correo Corporativo (Google Workspace,
											Microsoft 365 & SMTP)
										</div>
										<div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
											<div className="p-3 rounded-lg bg-card border border-border space-y-1">
												<strong className="text-foreground">
													Google Workspace (OAuth2)
												</strong>
												<p className="text-muted-foreground text-[10px]">
													• Habilita Gmail API en Google Cloud Console.
													<br />• Scopes: <code>gmail.modify</code> y{" "}
													<code>gmail.send</code>.<br />• Callback URI:{" "}
													<code>
														https://tudominio.com/api/email/oauth/google/callback
													</code>
												</p>
											</div>
											<div className="p-3 rounded-lg bg-card border border-border space-y-1">
												<strong className="text-foreground">
													Microsoft 365 / Azure AD
												</strong>
												<p className="text-muted-foreground text-[10px]">
													• Azure Portal → Microsoft Entra ID → App
													registrations.
													<br />• Callback:{" "}
													<code>
														https://tudominio.com/api/email/oauth/microsoft/callback
													</code>
													<br />• Permisos Graph: <code>Mail.ReadWrite</code>,{" "}
													<code>Mail.Send</code>.
												</p>
											</div>
											<div className="p-3 rounded-lg bg-card border border-border space-y-1">
												<strong className="text-foreground">
													SMTP Gmail Clásico
												</strong>
												<p className="text-muted-foreground text-[10px]">
													• Cuenta Google → Seguridad → Verificación en 2 pasos.
													<br />• Contraseñas de aplicaciones → Genera clave
													para <em>APEX Suite</em>.<br />• Host:{" "}
													<code>smtp.gmail.com</code>, Puerto: <code>465</code>.
												</p>
											</div>
										</div>
									</div>
								)}

								{/* Guide 4: AI Models */}
								{selectedGuideTab === "ai" && (
									<div className="space-y-3 bg-secondary/10 p-4 rounded-xl border border-border leading-relaxed text-xs">
										<div className="font-bold text-foreground text-sm">
											4. Modelos de Inteligencia Artificial & Optimización
											FinOps
										</div>
										<ul className="space-y-1.5 text-muted-foreground text-[11px]">
											<li>
												<strong>Google Gemini API:</strong> Entra a{" "}
												<a
													href="https://aistudio.google.com/"
													target="_blank"
													rel="noreferrer"
													className="text-primary underline"
												>
													aistudio.google.com
												</a>
												, haz clic en <em>Get API Key</em>, pulsa{" "}
												<em>Create API Key</em> y copia la clave.
											</li>
											<li>
												<strong>OpenAI API:</strong> Entra a{" "}
												<a
													href="https://platform.openai.com/"
													target="_blank"
													rel="noreferrer"
													className="text-primary underline"
												>
													platform.openai.com
												</a>{" "}
												→ API Keys → <em>+ Create new secret key</em>.
											</li>
											<li>
												<strong>Groq & Ollama:</strong> Groq en{" "}
												<a
													href="https://console.groq.com/"
													target="_blank"
													rel="noreferrer"
													className="text-primary underline"
												>
													console.groq.com
												</a>{" "}
												para Llama 3 ultra-rápido, u Ollama local en{" "}
												<code>http://localhost:11434/v1</code>.
											</li>
										</ul>
									</div>
								)}

								{/* Guide 5: pgvector */}
								{selectedGuideTab === "pgvector" && (
									<div className="space-y-3 bg-secondary/10 p-4 rounded-xl border border-border leading-relaxed text-xs">
										<div className="font-bold text-foreground text-sm">
											5. Base de Datos con pgvector (APEX Brain RAG)
										</div>
										<p className="text-muted-foreground">
											El motor vectorial requiere una base de datos PostgreSQL
											con la extensión <code>vector</code> habilitada.
										</p>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
											<div className="p-3 rounded-lg bg-card border border-border space-y-1.5">
												<strong className="text-foreground">
													Opción A: Supabase
												</strong>
												<p className="text-muted-foreground text-[10px]">
													En supabase.com crea un proyecto y en SQL Editor
													corre:
												</p>
												<pre className="p-2 rounded bg-background border border-border font-mono text-[10px] text-primary">
													CREATE EXTENSION IF NOT EXISTS vector;
												</pre>
											</div>
											<div className="p-3 rounded-lg bg-card border border-border space-y-1.5">
												<strong className="text-foreground">
													Opción B: Docker en tu VPS
												</strong>
												<pre className="p-2 rounded bg-background border border-border font-mono text-[10px] text-foreground overflow-x-auto">
													docker run -d --name apex-postgres \<br />
													&nbsp;&nbsp;-e POSTGRES_PASSWORD=tu_password \<br />
													&nbsp;&nbsp;-e POSTGRES_DB=apex_db \<br />
													&nbsp;&nbsp;-p 5432:5432 pgvector/pgvector:pg16
												</pre>
											</div>
										</div>
									</div>
								)}

								{/* Guide 6: Webhooks */}
								{selectedGuideTab === "webhooks" && (
									<div className="space-y-3 bg-secondary/10 p-4 rounded-xl border border-border leading-relaxed text-xs">
										<div className="font-bold text-foreground text-sm">
											6. Hub Centralizado de Webhooks (Zapier, Make &
											Formularios Web)
										</div>
										<ol className="list-decimal list-inside space-y-1.5 text-muted-foreground text-[11px]">
											<li>
												<strong>Zapier / Make:</strong> Crea un módulo{" "}
												<em>Catch Hook</em> o <em>HTTP POST</em> hacia la URL
												del webhook con JSON conteniendo <code>name</code>,{" "}
												<code>email</code>, <code>phone</code>,{" "}
												<code>company</code>. Se validará la firma HMAC SHA-256
												automáticamente y se creará el prospecto en el CRM.
											</li>
											<li>
												<strong>Formularios Web / Landing Pages:</strong> Envía
												solicitudes POST desde tu sitio web o cotizador online
												hacia la URL de tu webhook. Los datos entrarán de forma
												inmediata a la base de clientes.
											</li>
										</ol>
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			) : configTab === "roles" ? (
				<RolesView />
			) : configTab === "usuarios" ? (
				<GestionUsuariosView />
			) : configTab === "sucursales" ? (
				<SucursalesAdminView onNavigate={() => {}} />
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
								se filtran de forma segura según tu rol y sucursal.
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
								<label className="flex flex-col gap-1 text-[11px] font-semibold text-muted-foreground">
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
								{currentUser?.rol === "SuperAdmin" && (
									<label className="flex flex-col gap-1 text-[11px] font-semibold text-muted-foreground">
										Sucursal
										<select
											value={reporteSucursalId}
											onChange={(e) => setReporteSucursalId(e.target.value)}
											className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none"
										>
											<option value="">Todas</option>
											{(rawSucursales ?? []).map((s) => (
												<option key={s._id} value={s._id}>
													{s.nombre}
												</option>
											))}
										</select>
									</label>
								)}
								{(reporteDesde ||
									reporteHasta ||
									reporteEstado ||
									reporteSucursalId) && (
									<button
										type="button"
										onClick={() => {
											setReporteDesde("");
											setReporteHasta("");
											setReporteEstado("");
											setReporteSucursalId("");
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

			{/* TELEGRAM CONFIG MODAL */}
			<TelegramConfigModal
				isOpen={isTelegramModalOpen}
				onClose={() => setIsTelegramModalOpen(false)}
			/>

			{/* CORPORATE EMAIL CONFIG MODAL */}
			<EmailIntegrationModal
				isOpen={isEmailModalOpen}
				onClose={() => setIsEmailModalOpen(false)}
			/>

			{/* CENTRAL WEBHOOKS MANAGER MODAL */}
			<WebhookManagerModal
				isOpen={isWebhookModalOpen}
				onClose={() => setIsWebhookModalOpen(false)}
			/>

			{/* APEX BRAIN MODAL */}
			<ApexBrainModal
				isOpen={isApexBrainModalOpen}
				onClose={() => setIsApexBrainModalOpen(false)}
			/>
		</div>
	);
};
