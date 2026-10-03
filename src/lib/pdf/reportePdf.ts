import { jsPDF } from "jspdf";

export interface RegistroReportePdf {
	id?: string;
	_id?: string;
	clienteNombre?: string;
	cliente?: string;
	clienteTelefono?: string;
	vehiculoTipo?: string;
	placa?: string;
	estado?: string;
	total?: number | string;
	progreso?: number;
	fechaInicio?: string;
	fecha_creacion?: string;
	fechaFin?: string;
	// Campos para logs de auditoría
	fecha?: string;
	tablaAfectada?: string;
	accion?: string;
	usuarioNombre?: string;
	registroId?: string;
}

/**
 * Genera y descarga un reporte en formato PDF (rendimiento de operaciones o bitácora de auditoría).
 *
 * @param registros Lista de órdenes operativas o registros de auditoría.
 * @param usuarioFiltro Filtro de usuario aplicado opcionalmente.
 * @param empresaNombre Nombre opcional de la empresa emisora (por defecto "PLOTTIO").
 * @returns Instancia de jsPDF generada.
 */
export function generarPdfReporteAuditoria(
	registros?: RegistroReportePdf[] | null,
	usuarioFiltro?: string,
	empresaNombre?: string,
): jsPDF {
	const doc = new jsPDF();
	const today = new Date().toISOString().split("T")[0];
	const safeRegistros: RegistroReportePdf[] = Array.isArray(registros)
		? registros
		: [];
	const empresa = (empresaNombre || "").trim() || "PLOTTIO";

	const isAuditLog = safeRegistros.some(
		(r) => r && (r.tablaAfectada !== undefined || r.accion !== undefined),
	);

	if (isAuditLog) {
		// ==================== MODO AUDITORÍA ====================
		// Blue header line
		doc.setDrawColor(26, 54, 93);
		doc.setLineWidth(1.5);
		doc.line(20, 15, 190, 15);

		// Header
		doc.setFont("Helvetica", "bold");
		doc.setFontSize(22);
		doc.setTextColor(26, 54, 93);
		doc.text(empresa, 20, 26);

		doc.setFontSize(10);
		doc.setFont("Helvetica", "normal");
		doc.setTextColor(100, 100, 100);
		doc.text("Taller de Diseño & Rotulado Profesional", 20, 32);

		doc.setFont("Helvetica", "bold");
		doc.setFontSize(13);
		doc.setTextColor(197, 48, 48); // Red
		doc.text("REPORTE DE AUDITORÍA Y CONTROL", 110, 26);

		doc.setFontSize(10);
		doc.setFont("Helvetica", "normal");
		doc.setTextColor(100, 100, 100);
		doc.text(`Generado el: ${today}`, 110, 32);
		if (usuarioFiltro) {
			doc.text(`Filtro Usuario: ${usuarioFiltro}`, 110, 37);
		}

		// Divider line
		doc.setDrawColor(200, 200, 200);
		doc.setLineWidth(0.5);
		doc.line(20, 40, 190, 40);

		// Resumen
		doc.setFont("Helvetica", "bold");
		doc.setFontSize(11);
		doc.setTextColor(26, 54, 93);
		doc.text(`Total de eventos registrados: ${safeRegistros.length}`, 20, 48);

		// Table Header
		let rowY = 56;
		doc.setFont("Helvetica", "bold");
		doc.setFillColor(26, 54, 93);
		doc.rect(20, rowY, 170, 8, "F");
		doc.setTextColor(255, 255, 255);
		doc.setFontSize(9);
		doc.text("Fecha", 22, rowY + 5);
		doc.text("Módulo", 62, rowY + 5);
		doc.text("Acción", 95, rowY + 5);
		doc.text("Usuario", 125, rowY + 5);
		doc.text("Registro ID", 158, rowY + 5);

		doc.setTextColor(50, 50, 50);
		doc.setFont("Helvetica", "normal");

		if (safeRegistros.length === 0) {
			rowY += 9;
			doc.text("No hay registros de auditoría disponibles.", 22, rowY + 5);
		} else {
			safeRegistros.forEach((log, index) => {
				rowY += 9;
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
					doc.text("Fecha", 22, rowY + 5);
					doc.text("Módulo", 62, rowY + 5);
					doc.text("Acción", 95, rowY + 5);
					doc.text("Usuario", 125, rowY + 5);
					doc.text("Registro ID", 158, rowY + 5);

					doc.setTextColor(50, 50, 50);
					doc.setFont("Helvetica", "normal");
					rowY += 9;
				}

				if (index % 2 === 0) {
					doc.setFillColor(240, 244, 248);
					doc.rect(20, rowY, 170, 8, "F");
				}

				const fechaStr = log?.fecha
					? String(log.fecha).substring(0, 19).replace("T", " ")
					: today;
				const tabla = String(log?.tablaAfectada || "general").substring(0, 15);
				const accion = String(log?.accion || "acción").substring(0, 14);
				const usuario = String(log?.usuarioNombre || "Sistema").substring(
					0,
					16,
				);
				const regId = String(
					log?.registroId || log?.id || log?._id || "-",
				).substring(0, 14);

				doc.text(fechaStr, 22, rowY + 5);
				doc.text(tabla, 62, rowY + 5);
				doc.text(accion, 95, rowY + 5);
				doc.text(usuario, 125, rowY + 5);
				doc.text(regId, 158, rowY + 5);
			});
		}

		if (typeof window !== "undefined") {
			try {
				doc.save(`Reporte_Auditoria_${empresa}_${today}.pdf`);
			} catch {
				// Silent in test environments
			}
		}

		return doc;
	}

	// ==================== MODO RENDIMIENTO Y OPERACIONES ====================
	// Filter orders
	const validOrders = safeRegistros.filter((o) => o?.estado !== "Cancelado");
	const completedOrders = safeRegistros.filter(
		(o) => o?.estado === "Listo" || o?.estado === "Entregado",
	);
	const activeOrders = safeRegistros.filter(
		(o) => o?.estado === "Pendiente" || o?.estado === "En Proceso",
	);
	const cancelledOrders = safeRegistros.filter(
		(o) => o?.estado === "Cancelado",
	);
	const totalEarnings = validOrders.reduce((sum, o) => {
		const val = typeof o?.total === "number" ? o.total : Number(o?.total) || 0;
		return sum + val;
	}, 0);

	// Group earnings by client
	const clientEarnings: Record<string, number> = {};
	safeRegistros.forEach((o) => {
		if (o?.estado !== "Cancelado") {
			const cName = o?.clienteNombre || o?.cliente || "Consumidor Final";
			const val =
				typeof o?.total === "number" ? o.total : Number(o?.total) || 0;
			clientEarnings[cName] = (clientEarnings[cName] || 0) + val;
		}
	});
	const topClients = Object.entries(clientEarnings)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 5);

	// Group by vehicle category
	const categoryStats: Record<string, { count: number; total: number }> = {};
	validOrders.forEach((o) => {
		const cat = o?.vehiculoTipo || "Sin Categoría";
		const val = typeof o?.total === "number" ? o.total : Number(o?.total) || 0;
		if (!categoryStats[cat]) {
			categoryStats[cat] = { count: 0, total: 0 };
		}
		categoryStats[cat].count += 1;
		categoryStats[cat].total += val;
	});

	// Page 1: Executive Summary
	doc.setDrawColor(26, 54, 93);
	doc.setLineWidth(1.5);
	doc.line(20, 15, 190, 15);

	// Title
	doc.setFont("Helvetica", "bold");
	doc.setFontSize(22);
	doc.setTextColor(26, 54, 93);
	doc.text(empresa, 20, 26);

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
	if (usuarioFiltro) {
		doc.text(`Filtro Usuario: ${usuarioFiltro}`, 110, 37);
	}

	// Divider line
	doc.setDrawColor(200, 200, 200);
	doc.setLineWidth(0.5);
	doc.line(20, 39, 190, 39);

	// Section 1: operational metrics
	doc.setFont("Helvetica", "bold");
	doc.setFontSize(11);
	doc.setTextColor(26, 54, 93);
	doc.text("1. MÉTRICAS OPERATIVAS GENERALES", 20, 48);

	doc.setFont("Helvetica", "normal");
	doc.setFontSize(10);
	doc.setTextColor(50, 50, 50);

	doc.text(
		`Total de órdenes de trabajo registradas: ${safeRegistros.length}`,
		20,
		56,
	);
	doc.text(
		`Órdenes de trabajo completadas/entregadas: ${completedOrders.length}`,
		20,
		62,
	);
	doc.text(
		`Órdenes de trabajo activas (Pendientes/En Proceso): ${activeOrders.length}`,
		20,
		68,
	);
	doc.text(`Órdenes de trabajo canceladas: ${cancelledOrders.length}`, 20, 74);

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
			doc.text(`${index + 1}. ${name.substring(0, 45)}`, 25, clientY + 5);
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
			doc.text(catName.substring(0, 35), 25, catY + 5);
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

	if (safeRegistros.length === 0) {
		rowY += 9;
		doc.text("No hay órdenes de trabajo registradas.", 22, rowY + 5);
	} else {
		safeRegistros.forEach((o, index) => {
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

			const oId = String(o?.id || o?._id || "-").substring(0, 12);
			const cName = String(
				o?.clienteNombre || o?.cliente || "Sin cliente",
			).substring(0, 18);
			const vTipo = o?.vehiculoTipo || "General";
			const placaStr = o?.placa ? ` (${o.placa})` : "";
			const vehiculoDesc = `${vTipo}${placaStr}`.substring(0, 22);
			const estado = String(o?.estado || "Pendiente");
			const totalVal =
				typeof o?.total === "number" ? o.total : Number(o?.total) || 0;

			doc.text(oId, 22, rowY + 5);
			doc.text(cName, 42, rowY + 5);
			doc.text(vehiculoDesc, 85, rowY + 5);
			doc.text(estado, 135, rowY + 5);
			doc.text(`$${totalVal}`, 165, rowY + 5);
		});
	}

	if (typeof window !== "undefined") {
		try {
			doc.save(`Reporte_Operaciones_Plottio_${today}.pdf`);
		} catch {
			// Silent in test environments
		}
	}

	return doc;
}

/**
 * Alias de generarPdfReporteAuditoria para compatibilidad con vistas de operaciones.
 */
export const generarPdfReporte = generarPdfReporteAuditoria;
