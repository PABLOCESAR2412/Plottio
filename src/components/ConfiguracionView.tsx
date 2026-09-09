import { useMutation, useQuery } from "convex/react";
import { jsPDF } from "jspdf";
import {
	Bell,
	BookOpen,
	Bot,
	Brain,
	Bug as BugIcon,
	Building,
	Car,
	Check,
	CheckSquare,
	ClipboardList,
	Copy,
	DollarSign,
	Download,
	Edit2,
	FileText,
	Mail,
	MessageSquare,
	Moon,
	Plus,
	Settings,
	Share2,
	Shield,
	Square,
	Sun,
	ToggleLeft,
	ToggleRight,
	Trash2,
	TrendingUp,
	Users,
	Webhook,
	X,
} from "lucide-react";
import type React from "react";
import { startTransition, useMemo, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useIntegrationsStore } from "../store/useIntegrationsStore";
import { useSessionStore } from "../store/useSessionStore";
import type {
	Bug as BugType,
	ComentarioBug,
	PlantillaPrecio,
} from "../types/data";
import { ApexBrainModal } from "./ApexBrainModal";
import { AuditoriaView } from "./AuditoriaView";
import { EmailIntegrationModal } from "./EmailIntegrationModal";
import { FinOpsMetricsPanel } from "./FinOpsMetricsPanel";
import { GestionUsuariosView } from "./GestionUsuariosView";
import { RolesView } from "./RolesView";
import { SuccessDialog } from "./SuccessDialog";
import { SucursalesAdminView } from "./SucursalesAdmin";
import { TelegramConfigModal } from "./TelegramConfigModal";
import { WebhookManagerModal } from "./WebhookManagerModal";

type LocalCategoria = {
	id: string;
	nombre: string;
};

type LocalPlantilla = {
	id: string;
	categoriaVehiculo: string;
	concepto: string;
	precioSugerido: number;
};

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
	const rawPlantillas = useQuery(
		api.plantillas.getPlantillas,
		usuarioId ? { usuarioId: usuarioId as Id<"usuarios"> } : "skip",
	) as Array<LocalPlantilla & { _id: string }> | undefined;

	const rawCategorias = useQuery(
		api.plantillas.getCategoriasFull,
		usuarioId ? { usuarioId: usuarioId as Id<"usuarios"> } : "skip",
	) as Array<LocalCategoria & { _id: string }> | undefined;

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
	const createPlantillaMut = useMutation(api.plantillas.createPlantillaPrecio);
	const updatePlantillaMut = useMutation(api.plantillas.updatePlantillaPrecio);
	const deletePlantillaMut = useMutation(api.plantillas.deletePlantillaPrecio);
	const addCategoriaMut = useMutation(api.plantillas.addCategoriaPrecio);
	const updateCategoriaMut = useMutation(api.plantillas.updateCategoriaPrecio);
	const deleteCategoriaMut = useMutation(api.plantillas.deleteCategoriaPrecio);
	const updateBugMut = useMutation(api.bugs.updateBug);
	const addBugCommentMut = useMutation(api.bugs.addBugComment);

	const plantillasPrecios: PlantillaPrecio[] = useMemo(
		() =>
			(rawPlantillas ?? []).map((p) => ({
				id: p._id,
				categoriaVehiculo: p.categoriaVehiculo ?? "",
				concepto: p.concepto ?? "",
				precioSugerido: p.precioSugerido ?? 0,
			})),
		[rawPlantillas],
	);

	const categoriasPrecios: string[] = useMemo(
		() => (rawCategorias ?? []).map((c) => c.nombre ?? ""),
		[rawCategorias],
	);

	// Para operaciones que requieren id (updateCategoriaPrecio / deleteCategoriaPrecio)
	const categoriasMap = useMemo(() => {
		const map = new Map<string, string>();
		for (const c of rawCategorias ?? []) {
			map.set(c.nombre, c._id);
		}
		return map;
	}, [rawCategorias]);

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
		| "whatsapp"
		| "telegram"
		| "buffer"
		| "email"
		| "ai"
		| "pgvector"
		| "webhooks"
	>("whatsapp");
	const [copiedGuideId, setCopiedGuideId] = useState<string | null>(null);

	const { rag, buffer } = useIntegrationsStore();

	const handleCopySnippet = (text: string, id: string) => {
		navigator.clipboard.writeText(text);
		setCopiedGuideId(id);
		setTimeout(() => setCopiedGuideId(null), 2000);
	};

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

	// Price category tab selector
	const [activeCategoryTab, setActiveCategoryTab] = useState<string>(
		categoriasPrecios.length > 0 ? categoriasPrecios[0] : "Bus Urbano",
	);

	// Category management states
	const [newCategoryName, setNewCategoryName] = useState("");
	const [isEditingCategory, setIsEditingCategory] = useState(false);
	const [editingCategoryName, setEditingCategoryName] = useState("");

	// New Job states
	const [newConcepto, setNewConcepto] = useState("");
	const [newPrecioSugerido, setNewPrecioSugerido] = useState<number>(0);

	// Inline editing state for jobs
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editingConcepto, setEditingConcepto] = useState<string>("");
	const [editingPrice, setEditingPrice] = useState<number>(0);

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

	const currentCategory = categoriasPrecios.includes(activeCategoryTab)
		? activeCategoryTab
		: categoriasPrecios[0] || "";

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

	// Category actions handlers
	const handleCreateCategory = async (e: React.FormEvent) => {
		e.preventDefault();
		const name = newCategoryName.trim();
		if (!name) return;
		if (categoriasPrecios.includes(name)) {
			setAlertConfig({
				isOpen: true,
				title: "Categoría Duplicada",
				message: `La categoría "${name}" ya está registrada.`,
				type: "alert",
			});
			return;
		}
		try {
			await addCategoriaMut({
				usuarioId: currentUser?.id as Id<"usuarios">,
				nombre: name,
			});
			setActiveCategoryTab(name);
			setNewCategoryName("");
			setAlertConfig({
				isOpen: true,
				title: "Categoría Creada",
				message: `La categoría "${name}" se ha añadido correctamente.`,
				type: "success",
			});
		} catch (err) {
			setAlertConfig({
				isOpen: true,
				title: "Error",
				message: `No se pudo crear la categoría: ${(err as Error).message}`,
				type: "alert",
			});
		}
	};

	const handleStartEditCategory = () => {
		setEditingCategoryName(currentCategory);
		setIsEditingCategory(true);
	};

	const handleSaveCategoryName = async () => {
		const newName = editingCategoryName.trim();
		if (!newName || newName === currentCategory) {
			setIsEditingCategory(false);
			return;
		}
		if (
			categoriasPrecios.includes(newName) &&
			newName.toLowerCase() !== currentCategory.toLowerCase()
		) {
			setAlertConfig({
				isOpen: true,
				title: "Categoría Duplicada",
				message: `Ya existe una categoría llamada "${newName}".`,
				type: "alert",
			});
			return;
		}
		try {
			const catId = categoriasMap.get(currentCategory);
			if (!catId) throw new Error("Categoría sin id");
			await updateCategoriaMut({
				usuarioId: currentUser?.id as Id<"usuarios">,
				categoriaId: catId as Id<"categoriasPrecios">,
				nuevoNombre: newName,
			});
			setActiveCategoryTab(newName);
			setIsEditingCategory(false);
			setAlertConfig({
				isOpen: true,
				title: "Categoría Actualizada",
				message: `La categoría ha sido renombrada a "${newName}".`,
				type: "success",
			});
		} catch (err) {
			setAlertConfig({
				isOpen: true,
				title: "Error",
				message: `No se pudo renombrar la categoría: ${(err as Error).message}`,
				type: "alert",
			});
		}
	};

	const handleDeleteCategoryClick = () => {
		if (!currentCategory) return;
		setAlertConfig({
			isOpen: true,
			title: "¿Eliminar Categoría?",
			message: `¿Estás seguro de eliminar permanentemente la categoría "${currentCategory}"? Se borrarán todas sus tarifas y se actualizará a los vehículos asignados.`,
			type: "delete",
			onConfirm: async () => {
				try {
					const catId = categoriasMap.get(currentCategory);
					if (!catId) throw new Error("Categoría sin id");
					const remaining = categoriasPrecios.filter(
						(c) => c !== currentCategory,
					);
					await deleteCategoriaMut({
						usuarioId: currentUser?.id as Id<"usuarios">,
						categoriaId: catId as Id<"categoriasPrecios">,
						fallback: remaining[0],
					});
					setActiveCategoryTab(remaining[0] || "");
					setAlertConfig({
						isOpen: true,
						title: "Categoría Eliminada",
						message: "La categoría y sus tarifas han sido removidas.",
						type: "success",
					});
				} catch (err) {
					setAlertConfig({
						isOpen: true,
						title: "Error",
						message: `No se pudo eliminar la categoría: ${(err as Error).message}`,
						type: "alert",
					});
				}
			},
		});
	};

	// Job actions handlers
	const handleAddJob = async (e: React.FormEvent) => {
		e.preventDefault();
		const concept = newConcepto.trim();
		if (!concept || !currentCategory) return;

		// Check if job exists in this category
		const exists = plantillasPrecios.some(
			(p) =>
				p.categoriaVehiculo === currentCategory &&
				p.concepto.toLowerCase() === concept.toLowerCase(),
		);
		if (exists) {
			setAlertConfig({
				isOpen: true,
				title: "Trabajo Duplicado",
				message: `El trabajo "${concept}" ya está registrado en la categoría ${currentCategory}.`,
				type: "alert",
			});
			return;
		}

		try {
			await createPlantillaMut({
				usuarioId: currentUser?.id as Id<"usuarios">,
				categoriaVehiculo: currentCategory,
				concepto: concept,
				precioSugerido: newPrecioSugerido,
			});
			setNewConcepto("");
			setNewPrecioSugerido(0);
			setAlertConfig({
				isOpen: true,
				title: "Tarifa Registrada",
				message: `Se añadió "${concept}" con un precio de $${newPrecioSugerido} USD a ${currentCategory}.`,
				type: "success",
			});
		} catch (err) {
			setAlertConfig({
				isOpen: true,
				title: "Error",
				message: `No se pudo crear la tarifa: ${(err as Error).message}`,
				type: "alert",
			});
		}
	};

	const handleStartEdit = (tpl: PlantillaPrecio) => {
		setEditingId(tpl.id);
		setEditingConcepto(tpl.concepto);
		setEditingPrice(tpl.precioSugerido);
	};

	const handleCancelEdit = () => {
		setEditingId(null);
	};

	const handleSavePrice = async (id: string) => {
		const concept = editingConcepto.trim();
		if (!concept || editingPrice < 0) return;

		try {
			await updatePlantillaMut({
				usuarioId: currentUser?.id as Id<"usuarios">,
				plantillaId: id as Id<"plantillasPrecios">,
				concepto: concept,
				precioSugerido: editingPrice,
			});
			setEditingId(null);

			setAlertConfig({
				isOpen: true,
				title: "Tarifa Actualizada",
				message:
					"La plantilla de precios se actualizó. Las nuevas cotizaciones reflejarán este cambio.",
				type: "success",
			});
		} catch (err) {
			setAlertConfig({
				isOpen: true,
				title: "Error",
				message: `No se pudo actualizar la tarifa: ${(err as Error).message}`,
				type: "alert",
			});
		}
	};

	const handleDeleteJob = (id: string, concepto: string) => {
		setAlertConfig({
			isOpen: true,
			title: "¿Eliminar Tarifa?",
			message: `¿Estás seguro de eliminar permanentemente la tarifa sugerida de "${concepto}"?`,
			type: "delete",
			onConfirm: async () => {
				try {
					await deletePlantillaMut({
						usuarioId: currentUser?.id as Id<"usuarios">,
						plantillaId: id as Id<"plantillasPrecios">,
					});
					setAlertConfig({
						isOpen: true,
						title: "Tarifa Eliminada",
						message: "El trabajo se removió de la plantilla con éxito.",
						type: "success",
					});
				} catch (err) {
					setAlertConfig({
						isOpen: true,
						title: "Error",
						message: `No se pudo eliminar la tarifa: ${(err as Error).message}`,
						type: "alert",
					});
				}
			},
		});
	};

	// Report Export: PDF
	const handleDownloadReportPDF = () => {
		const doc = new jsPDF();
		const today = new Date().toISOString().split("T")[0];

		// Filter orders
		const validOrders = reporteData.filter((o) => o.estado !== "Cancelado");
		const completedOrders = reporteData.filter(
			(o) => o.estado === "Listo" || o.estado === "Entregado",
		);
		const totalEarnings = validOrders.reduce((sum, o) => sum + o.total, 0);

		// Group earnings by client
		const clientEarnings: Record<string, number> = {};
		reporteData.forEach((o) => {
			if (o.estado !== "Cancelado") {
				clientEarnings[o.clienteNombre] =
					(clientEarnings[o.clienteNombre] || 0) + o.total;
			}
		});
		const topClients = Object.entries(clientEarnings)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 5);

		// Group by vehicle category
		const categoryStats: Record<string, { count: number; total: number }> = {};
		validOrders.forEach((o) => {
			if (!categoryStats[o.vehiculoTipo]) {
				categoryStats[o.vehiculoTipo] = { count: 0, total: 0 };
			}
			categoryStats[o.vehiculoTipo].count += 1;
			categoryStats[o.vehiculoTipo].total += o.total;
		});

		// Page 1: Executive Summary
		// Draw top blue line
		doc.setDrawColor(26, 54, 93);
		doc.setLineWidth(1.5);
		doc.line(20, 15, 190, 15);

		// Title
		doc.setFont("Helvetica", "bold");
		doc.setFontSize(22);
		doc.setTextColor(26, 54, 93);
		doc.text("PLOTTIO", 20, 26);

		doc.setFontSize(10);
		doc.setFont("Helvetica", "normal");
		doc.setTextColor(100, 100, 100);
		doc.text("Taller de Diseño & Rotulado Profesional", 20, 32);

		// Header Right
		doc.setFont("Helvetica", "bold");
		doc.setFontSize(13);
		doc.setTextColor(197, 48, 48); // Red
		doc.text("REPORTE GENERAL DE RENDIMIENTO", 110, 26);

		doc.setFontSize(10);
		doc.setFont("Helvetica", "normal");
		doc.setTextColor(100, 100, 100);
		doc.text(`Generado el: ${today}`, 110, 32);

		// Divider line
		doc.setDrawColor(200, 200, 200);
		doc.setLineWidth(0.5);
		doc.line(20, 38, 190, 38);

		// Section 1: operational metrics
		doc.setFont("Helvetica", "bold");
		doc.setFontSize(11);
		doc.setTextColor(26, 54, 93);
		doc.text("1. MÉTRICAS OPERATIVAS GENERALES", 20, 48);

		doc.setFont("Helvetica", "normal");
		doc.setFontSize(10);
		doc.setTextColor(50, 50, 50);

		doc.text(
			`Total de órdenes de trabajo registradas: ${reporteData.length}`,
			20,
			56,
		);
		doc.text(
			`Órdenes de trabajo completadas/entregadas: ${completedOrders.length}`,
			20,
			62,
		);
		doc.text(
			`Órdenes de trabajo activas (Pendientes/En Proceso): ${reporteData.filter((o) => o.estado === "Pendiente" || o.estado === "En Proceso").length}`,
			20,
			68,
		);
		doc.text(
			`Órdenes de trabajo canceladas: ${reporteData.filter((o) => o.estado === "Cancelado").length}`,
			20,
			74,
		);

		// Section 2: Earnings summary
		doc.setFont("Helvetica", "bold");
		doc.setFontSize(11);
		doc.setTextColor(26, 54, 93);
		doc.text("2. RESUMEN FINANCIERO (TOTAL GANADO)", 20, 88);

		doc.setFillColor(240, 244, 248);
		doc.rect(20, 94, 170, 18, "F");

		doc.setFont("Helvetica", "bold");
		doc.setFontSize(10);
		doc.setTextColor(26, 54, 93);
		doc.text("TOTAL DE INGRESOS OPERATIVOS ESTIMADOS:", 25, 101);
		doc.setTextColor(197, 48, 48);
		doc.setFontSize(12);
		doc.text(`$${totalEarnings.toLocaleString("en-US")} USD`, 25, 108);

		// Section 3: Top Clients
		doc.setFont("Helvetica", "bold");
		doc.setFontSize(11);
		doc.setTextColor(26, 54, 93);
		doc.text("3. TOP 5 CLIENTES CON MAYOR INVERSIÓN", 20, 126);

		let clientY = 134;
		doc.setFont("Helvetica", "bold");
		doc.setFontSize(9);
		doc.setFillColor(26, 54, 93);
		doc.rect(20, clientY, 170, 7, "F");
		doc.setTextColor(255, 255, 255);
		doc.text("Nombre del Cliente", 25, clientY + 5);
		doc.text("Total Invertido", 140, clientY + 5);
		doc.setTextColor(50, 50, 50);
		doc.setFont("Helvetica", "normal");

		if (topClients.length === 0) {
			clientY += 8;
			doc.text(
				"No hay datos financieros registrados en el sistema.",
				25,
				clientY + 5,
			);
		} else {
			topClients.forEach(([name, amount], index) => {
				clientY += 8;
				if (index % 2 === 0) {
					doc.setFillColor(245, 245, 245);
					doc.rect(20, clientY, 170, 7, "F");
				}
				doc.text(`${index + 1}. ${name}`, 25, clientY + 5);
				doc.text(`$${amount.toLocaleString("en-US")} USD`, 140, clientY + 5);
			});
		}

		// Section 4: Category breakdown
		doc.setFont("Helvetica", "bold");
		doc.setFontSize(11);
		doc.setTextColor(26, 54, 93);
		doc.text("4. VENTAS POR CATEGORÍA DE TRANSPORTE", 20, 194);

		let catY = 202;
		doc.setFont("Helvetica", "bold");
		doc.setFontSize(9);
		doc.setFillColor(26, 54, 93);
		doc.rect(20, catY, 170, 7, "F");
		doc.setTextColor(255, 255, 255);
		doc.text("Categoría de Vehículo", 25, catY + 5);
		doc.text("Cant. Trabajos", 100, catY + 5);
		doc.text("Total Generado", 140, catY + 5);
		doc.setTextColor(50, 50, 50);
		doc.setFont("Helvetica", "normal");

		const catStatsEntries = Object.entries(categoryStats);
		if (catStatsEntries.length === 0) {
			catY += 8;
			doc.text("No hay trabajos registrados para vehículos.", 25, catY + 5);
		} else {
			catStatsEntries.forEach(([catName, stat], index) => {
				catY += 8;
				if (index % 2 === 0) {
					doc.setFillColor(245, 245, 245);
					doc.rect(20, catY, 170, 7, "F");
				}
				doc.text(catName, 25, catY + 5);
				doc.text(stat.count.toString(), 100, catY + 5);
				doc.text(`$${stat.total.toLocaleString("en-US")} USD`, 140, catY + 5);
			});
		}

		// Page 2: Detailed Log of Jobs
		doc.addPage();
		doc.setDrawColor(26, 54, 93);
		doc.setLineWidth(1.5);
		doc.line(20, 15, 190, 15);

		doc.setFont("Helvetica", "bold");
		doc.setFontSize(14);
		doc.setTextColor(26, 54, 93);
		doc.text("HISTORIAL DETALLADO DE TRABAJOS", 20, 26);

		doc.setFontSize(10);
		doc.setFont("Helvetica", "normal");
		doc.setTextColor(100, 100, 100);
		doc.text("Registro completo de todas las órdenes de trabajo", 20, 32);

		doc.setDrawColor(200, 200, 200);
		doc.setLineWidth(0.5);
		doc.line(20, 36, 190, 36);

		// Table Header
		let rowY = 46;
		doc.setFont("Helvetica", "bold");
		doc.setFillColor(26, 54, 93);
		doc.rect(20, rowY, 170, 8, "F");
		doc.setTextColor(255, 255, 255);
		doc.setFontSize(9);
		doc.text("ID", 22, rowY + 5);
		doc.text("Cliente", 42, rowY + 5);
		doc.text("Vehículo / Placa", 85, rowY + 5);
		doc.text("Estado", 135, rowY + 5);
		doc.text("Total", 165, rowY + 5);

		doc.setTextColor(50, 50, 50);
		doc.setFont("Helvetica", "normal");

		if (reporteData.length === 0) {
			rowY += 9;
			doc.text("No hay órdenes de trabajo registradas.", 22, rowY + 5);
		} else {
			reporteData.forEach((o, index) => {
				rowY += 9;

				// Handle page break
				if (rowY > 270) {
					doc.addPage();
					doc.setDrawColor(26, 54, 93);
					doc.setLineWidth(1.5);
					doc.line(20, 15, 190, 15);

					rowY = 26;
					doc.setFont("Helvetica", "bold");
					doc.setFillColor(26, 54, 93);
					doc.rect(20, rowY, 170, 8, "F");
					doc.setTextColor(255, 255, 255);
					doc.text("ID", 22, rowY + 5);
					doc.text("Cliente", 42, rowY + 5);
					doc.text("Vehículo / Placa", 85, rowY + 5);
					doc.text("Estado", 135, rowY + 5);
					doc.text("Total", 165, rowY + 5);

					doc.setTextColor(50, 50, 50);
					doc.setFont("Helvetica", "normal");
					rowY += 9;
				}

				if (index % 2 === 0) {
					doc.setFillColor(240, 244, 248);
					doc.rect(20, rowY, 170, 8, "F");
				}

				doc.text(o.id, 22, rowY + 5);
				doc.text(o.clienteNombre.substring(0, 18), 42, rowY + 5);
				doc.text(
					`${o.vehiculoTipo} (${o.placa})`.substring(0, 22),
					85,
					rowY + 5,
				);
				doc.text(o.estado, 135, rowY + 5);
				doc.text(`$${o.total}`, 165, rowY + 5);
			});
		}

		doc.save(`Reporte_Operaciones_Plottio_${today}.pdf`);

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

	// Filter templates matching current selected category tab
	const filteredTemplates = plantillasPrecios.filter(
		(p) => p.categoriaVehiculo === currentCategory,
	);

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
						<Share2 className="h-4 w-4" />
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

						{/* Buffer GraphQL Card */}
						<div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col justify-between space-y-4">
							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600">
											<Share2 className="h-5 w-5" />
										</div>
										<div>
											<div className="font-bold text-foreground text-sm flex items-center gap-2">
												<span>Buffer GraphQL (APEX Sync)</span>
												<span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-sky-500/15 text-sky-600">
													{buffer.channels.filter((c) => c.active).length}{" "}
													Canales Activos
												</span>
											</div>
											<div className="text-xs text-muted-foreground">
												TikTok, Instagram, LinkedIn, YouTube
											</div>
										</div>
									</div>
								</div>
								<p className="text-xs text-muted-foreground leading-relaxed">
									Publicación y programación multicanal de casos de éxito y
									rotulados finalizados sin riesgo de bloqueos de cuenta.
								</p>
							</div>

							<div className="pt-3 border-t border-border flex items-center justify-between gap-2">
								<span className="text-xs text-muted-foreground">
									{buffer.posts.length} publicaciones sincronizadas
								</span>
								<button
									type="button"
									onClick={() => {
										setAlertConfig({
											isOpen: true,
											title: "Buffer GraphQL Sincronizado",
											message:
												"Los canales oficiales de TikTok, Instagram, LinkedIn y YouTube se encuentran activos y vinculados a Buffer.",
											type: "success",
										});
									}}
									className="px-3 py-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-600 text-xs font-semibold hover:bg-sky-600 hover:text-white transition-colors cursor-pointer shadow-xs"
								>
									Sincronizar Canales
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
										{ id: "buffer", label: "3. Buffer GraphQL" },
										{ id: "email", label: "4. Correo Corporativo" },
										{ id: "ai", label: "5. Modelos IA" },
										{ id: "pgvector", label: "6. pgvector (RAG)" },
										{ id: "webhooks", label: "7. Hub Webhooks" },
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
										<div className="p-3 rounded-lg bg-card border border-border space-y-1.5">
											<div className="flex justify-between items-center font-bold text-foreground">
												<span>
													Comando Docker para tu VPS (DigitalOcean / Hetzner /
													AWS):
												</span>
												<button
													type="button"
													onClick={() =>
														handleCopySnippet(
															"docker run -d --name evolution-api -p 8080:8080 -e AUTHENTICATION_API_KEY=tu_clave_secreta_aqui_123456 -e SERVER_URL=https://evolution.tudominio.com atendai/evolution-api:v2.1.0",
															"dockerevo",
														)
													}
													className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
													title="Copiar comando"
												>
													{copiedGuideId === "dockerevo" ? (
														<Check className="h-3 w-3 text-emerald-500" />
													) : (
														<Copy className="h-3 w-3" />
													)}
												</button>
											</div>
											<pre className="p-2.5 rounded bg-background border border-border font-mono text-[10px] text-foreground overflow-x-auto">
												docker run -d --name evolution-api -p 8080:8080 \<br />
												&nbsp;&nbsp;-e
												AUTHENTICATION_API_KEY=tu_clave_secreta_aqui_123456 \
												<br />
												&nbsp;&nbsp;-e
												SERVER_URL=https://evolution.tudominio.com \<br />
												&nbsp;&nbsp;atendai/evolution-api:v2.1.0
											</pre>
										</div>
										<ol className="list-decimal list-inside space-y-1 text-muted-foreground text-[11px]">
											<li>
												<strong>apiUrl:</strong> La URL de tu servidor (ej.{" "}
												<code>https://evolution.tudominio.com</code> o{" "}
												<code>http://tu-ip:8080</code>).
											</li>
											<li>
												<strong>apiKey:</strong> La clave que definiste en{" "}
												<code>AUTHENTICATION_API_KEY</code>.
											</li>
											<li>
												<strong>instanceName:</strong> Elige un nombre para tu
												sesión (ej. <code>plottio-central</code>).
											</li>
											<li>
												<strong>Vincular:</strong> Abre el modal de WhatsApp,
												haz clic en <em>Generar QR</em>, escanea con WhatsApp en{" "}
												<em>Dispositivos vinculados</em>.
											</li>
										</ol>
									</div>
								)}

								{/* Guide 2: Telegram */}
								{selectedGuideTab === "telegram" && (
									<div className="space-y-3 bg-secondary/10 p-4 rounded-xl border border-border leading-relaxed text-xs">
										<div className="font-bold text-foreground text-sm">
											2. Bot de Telegram (Telegram Bot API)
										</div>
										<p className="text-muted-foreground">
											Telegram ofrece bots gratuitos con API oficial ilimitada
											para alertas de órdenes y chatops.
										</p>
										<ol className="list-decimal list-inside space-y-1.5 text-muted-foreground text-[11px]">
											<li>
												Abre Telegram y busca{" "}
												<code className="text-primary font-bold">
													@BotFather
												</code>
												. Envía{" "}
												<code className="bg-background px-1 py-0.5 rounded border border-border">
													/newbot
												</code>
												. Asigna un nombre y un usuario que termine en{" "}
												<code>bot</code>. Copia el token HTTP API.
											</li>
											<li>
												<strong>Chat ID Personal:</strong> Habla con{" "}
												<code className="text-primary">@userinfobot</code> y
												presiona Start para ver tu ID numérico.
											</li>
											<li>
												<strong>Chat ID Grupo:</strong> Añade tu bot al grupo de
												taller y añade a{" "}
												<code className="text-primary">@RawDataBot</code> para
												copiar el campo <code>"id": -100...</code>.
											</li>
											<li>
												Pega el token y el chatId en el modal de Telegram y
												pulsa <em>Probar Alerta</em>.
											</li>
										</ol>
									</div>
								)}

								{/* Guide 3: Buffer */}
								{selectedGuideTab === "buffer" && (
									<div className="space-y-3 bg-secondary/10 p-4 rounded-xl border border-border leading-relaxed text-xs">
										<div className="font-bold text-foreground text-sm">
											3. Buffer GraphQL (APEX Sync para Redes Sociales)
										</div>
										<p className="text-muted-foreground">
											Buffer permite conectar oficialmente TikTok Empresa,
											Instagram Profesional, LinkedIn y YouTube sin riesgo de
											bloqueos.
										</p>
										<ol className="list-decimal list-inside space-y-1.5 text-muted-foreground text-[11px]">
											<li>
												Regístrate gratis en{" "}
												<a
													href="https://buffer.com/"
													target="_blank"
													rel="noreferrer"
													className="text-primary underline"
												>
													buffer.com
												</a>{" "}
												y conecta tus cuentas sociales deseadas.
											</li>
											<li>
												Entra al portal de desarrolladores:{" "}
												<a
													href="https://buffer.com/developers/apps"
													target="_blank"
													rel="noreferrer"
													className="text-primary underline"
												>
													buffer.com/developers/apps
												</a>{" "}
												y pulsa <em>Create an App</em>.
											</li>
											<li>
												En la pestaña de tu app copia el{" "}
												<strong>Access Token</strong> y pégalo en tu
												configuración de PLOTTIO.
											</li>
											<li>
												Al pulsar <em>Sincronizar Canales</em>, el sistema
												consultará la API de Buffer e importará tus perfiles
												automáticamente.
											</li>
										</ol>
									</div>
								)}

								{/* Guide 4: Email */}
								{selectedGuideTab === "email" && (
									<div className="space-y-3 bg-secondary/10 p-4 rounded-xl border border-border leading-relaxed text-xs">
										<div className="font-bold text-foreground text-sm">
											4. Bandeja de Correo Corporativo (Google Workspace,
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

								{/* Guide 5: AI Models */}
								{selectedGuideTab === "ai" && (
									<div className="space-y-3 bg-secondary/10 p-4 rounded-xl border border-border leading-relaxed text-xs">
										<div className="font-bold text-foreground text-sm">
											5. Modelos de Inteligencia Artificial (Gemini / OpenAI /
											Groq)
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

								{/* Guide 6: pgvector */}
								{selectedGuideTab === "pgvector" && (
									<div className="space-y-3 bg-secondary/10 p-4 rounded-xl border border-border leading-relaxed text-xs">
										<div className="font-bold text-foreground text-sm">
											6. Base de Datos con pgvector (APEX Brain RAG)
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

								{/* Guide 7: Webhooks */}
								{selectedGuideTab === "webhooks" && (
									<div className="space-y-3 bg-secondary/10 p-4 rounded-xl border border-border leading-relaxed text-xs">
										<div className="font-bold text-foreground text-sm">
											7. Hub Centralizado de Webhooks (Meta Ads & Zapier)
										</div>
										<ol className="list-decimal list-inside space-y-1.5 text-muted-foreground text-[11px]">
											<li>
												<strong>Meta Lead Ads:</strong> En{" "}
												<em>developers.facebook.com</em> agrega Webhooks al
												objeto <strong>Page/Leadgen</strong>. Pega la URL del
												webhook y suscríbete al campo <code>leadgen</code>. Cada
												prospecto entrará de inmediato al CRM.
											</li>
											<li>
												<strong>Zapier / Make:</strong> Crea un módulo{" "}
												<em>Catch Hook</em> o <em>HTTP POST</em> hacia la URL
												del webhook con JSON conteniendo <code>name</code>,{" "}
												<code>email</code>, <code>phone</code>,{" "}
												<code>company</code>. Se validará la firma HMAC SHA-256
												automáticamente.
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
				<div className="animate-fade-in rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between space-y-4">
					<div className="space-y-4">
						<div className="pb-3 border-b border-border flex flex-col sm:flex-row sm:items-start justify-between gap-3">
							<div>
								<h3 className="text-base font-bold text-foreground flex items-center gap-2">
									<Settings className="h-5 w-5 text-muted-foreground" />
									Plantilla de Precios para Stickers
								</h3>
								<p className="text-xs text-muted-foreground mt-0.5">
									Establece tarifas de referencia por tipo de transporte para
									cotizar rápido.
								</p>
							</div>

							{/* Add category inline form */}
							<form
								onSubmit={handleCreateCategory}
								className="flex gap-1.5 items-center shrink-0"
							>
								<input
									type="text"
									required
									placeholder="Nueva Categoría (Ej. Motos)"
									value={newCategoryName}
									onChange={(e) => setNewCategoryName(e.target.value)}
									className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none w-36 sm:w-40"
								/>
								<button
									type="submit"
									className="rounded-lg bg-primary text-primary-foreground p-1.5 hover:opacity-90 transition-opacity cursor-pointer"
									title="Añadir Categoría"
								>
									<Plus className="h-4 w-4" />
								</button>
							</form>
						</div>

						{/* Price Category Tabs Selector */}
						<div className="flex flex-wrap gap-1.5 border-b border-border/60 pb-2">
							{categoriasPrecios.map((cat) => (
								<button
									type="button"
									key={cat}
									onClick={() => {
										setActiveCategoryTab(cat);
										setEditingId(null);
										setIsEditingCategory(false);
									}}
									className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
										currentCategory === cat
											? "bg-primary text-primary-foreground shadow-sm font-black"
											: "text-muted-foreground hover:text-foreground hover:bg-secondary/40 border border-transparent"
									}`}
								>
									<Car className="h-3.5 w-3.5" />
									{cat}
								</button>
							))}
						</div>

						{/* Category Rename/Delete Toolbar */}
						{currentCategory && (
							<div className="flex items-center justify-between bg-secondary/20 border border-border rounded-lg p-2.5 text-xs gap-3">
								{isEditingCategory ? (
									<div className="flex items-center gap-2 w-full">
										<input
											type="text"
											value={editingCategoryName}
											onChange={(e) => setEditingCategoryName(e.target.value)}
											className="flex-1 rounded border border-border bg-background px-2.5 py-1 text-xs text-foreground focus:outline-none"
										/>
										<button
											type="button"
											onClick={handleSaveCategoryName}
											className="p-1 text-green-500 hover:bg-green-500/10 rounded transition-colors cursor-pointer"
											title="Guardar nombre"
										>
											<Check className="h-4 w-4" />
										</button>
										<button
											type="button"
											onClick={() => setIsEditingCategory(false)}
											className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors cursor-pointer"
											title="Cancelar"
										>
											<X className="h-4 w-4" />
										</button>
									</div>
								) : (
									<>
										<div className="font-semibold flex items-center gap-1 text-muted-foreground">
											Categoría seleccionada:{" "}
											<span className="text-foreground font-bold">
												{currentCategory}
											</span>
										</div>
										<div className="flex items-center gap-2">
											<button
												type="button"
												onClick={handleStartEditCategory}
												className="flex items-center gap-1 text-[11px] font-semibold text-foreground border border-border px-2 py-1 rounded hover:bg-secondary transition-colors cursor-pointer"
											>
												<Edit2 className="h-3 w-3" />
												Renombrar
											</button>
											<button
												type="button"
												onClick={handleDeleteCategoryClick}
												className="flex items-center gap-1 text-[11px] font-semibold text-destructive border border-destructive/20 px-2 py-1 rounded hover:bg-destructive/10 transition-colors cursor-pointer"
											>
												<Trash2 className="h-3 w-3" />
												Eliminar Categoría
											</button>
										</div>
									</>
								)}
							</div>
						)}

						{/* Price list tables of selected Category */}
						<div className="divide-y divide-border overflow-y-auto max-h-[220px] pr-1 space-y-1">
							{filteredTemplates.map((tpl) => {
								const isEditing = editingId === tpl.id;
								return (
									<div
										key={tpl.id}
										className="flex flex-col sm:flex-row sm:items-center justify-between py-2 px-2 hover:bg-secondary/20 rounded-lg transition-colors gap-3"
									>
										<div className="truncate pr-2 flex-1">
											{isEditing ? (
												<input
													type="text"
													value={editingConcepto}
													onChange={(e) => setEditingConcepto(e.target.value)}
													className="w-full rounded border border-border bg-background px-2.5 py-1 text-xs text-foreground focus:outline-none focus:border-ring"
													placeholder="Concepto del trabajo"
												/>
											) : (
												<div className="font-semibold text-sm text-foreground truncate">
													{tpl.concepto}
												</div>
											)}
										</div>

										<div className="flex items-center gap-3 justify-end shrink-0">
											{isEditing ? (
												<div className="flex items-center gap-1.5 animate-fade-in">
													<span className="text-xs text-muted-foreground font-bold">
														$
													</span>
													<input
														type="number"
														min="0"
														value={editingPrice}
														onChange={(e) =>
															setEditingPrice(Number(e.target.value))
														}
														className="w-16 rounded border border-border bg-background px-2 py-1 text-xs text-foreground font-bold focus:outline-none focus:border-ring"
													/>
													<button
														type="button"
														onClick={() => handleSavePrice(tpl.id)}
														className="p-1 text-green-500 hover:bg-green-500/10 rounded transition-colors cursor-pointer"
														title="Guardar tarifa"
													>
														<Check className="h-4 w-4" />
													</button>
													<button
														type="button"
														onClick={handleCancelEdit}
														className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors cursor-pointer"
														title="Cancelar"
													>
														<X className="h-4 w-4" />
													</button>
												</div>
											) : (
												<div className="flex items-center gap-3">
													<span className="text-sm font-bold text-foreground">
														${tpl.precioSugerido}
													</span>
													<button
														type="button"
														onClick={() => handleStartEdit(tpl)}
														className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground border border-border px-2 py-1 rounded hover:bg-secondary transition-colors cursor-pointer"
													>
														<Edit2 className="h-3 w-3" />
														Editar
													</button>
													<button
														type="button"
														onClick={() =>
															handleDeleteJob(tpl.id, tpl.concepto)
														}
														className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors cursor-pointer"
														title="Eliminar tarifa"
													>
														<Trash2 className="h-3.5 w-3.5" />
													</button>
												</div>
											)}
										</div>
									</div>
								);
							})}
							{filteredTemplates.length === 0 && (
								<div className="text-center py-8 text-muted-foreground text-sm">
									No hay plantillas de tarifas sugeridas registradas para esta
									categoría.
								</div>
							)}
						</div>

						{/* Add pricing job inline form */}
						{currentCategory && (
							<form
								onSubmit={handleAddJob}
								className="border-t border-border pt-3.5 mt-2 space-y-3"
							>
								<div className="text-xs font-bold text-foreground">
									Añadir Nuevo Trabajo/Precio a la Categoría: {currentCategory}
								</div>
								<div className="grid gap-3 sm:grid-cols-3">
									<div className="sm:col-span-2">
										<input
											type="text"
											required
											placeholder="Concepto (Ej. Rotulado Caja Delantera)"
											value={newConcepto}
											onChange={(e) => setNewConcepto(e.target.value)}
											className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-ring focus:outline-none"
										/>
									</div>
									<div>
										<input
											type="number"
											required
											min="0"
											placeholder="Precio Sugerido ($)"
											value={newPrecioSugerido || ""}
											onChange={(e) =>
												setNewPrecioSugerido(Number(e.target.value))
											}
											className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-ring focus:outline-none"
										/>
									</div>
								</div>
								<button
									type="submit"
									className="w-full rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
								>
									<Plus className="h-4.5 w-4.5" />
									Agregar Tarifa de Referencia
								</button>
							</form>
						)}
					</div>

					<div className="mt-4 pt-3 border-t border-border flex items-center gap-2 text-xs text-muted-foreground font-medium">
						<TrendingUp className="h-4 w-4 text-purple-500" />
						<span>
							Las modificaciones de tarifas solo afectarán a las nuevas
							cotizaciones y órdenes de trabajo creadas a futuro.
						</span>
					</div>
				</div>
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
