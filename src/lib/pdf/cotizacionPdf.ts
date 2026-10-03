import { jsPDF } from "jspdf";

export interface ItemCotizacionPdf {
	descripcion?: string;
	cantidad?: number | string;
	precioUnitario?: number | string;
}

export interface CotizacionPdfData {
	_id?: string;
	fecha?: string;
	clienteNombre?: string;
	clienteTelefono?: string;
	vehiculoTipo?: string;
	placa?: string;
	total?: number | string;
	items?: ItemCotizacionPdf[];
}

/**
 * Genera y descarga un documento PDF estilizado para una cotización o presupuesto de Plottio.
 *
 * @param cot Datos de la cotización (cliente, vehículo, items, totales).
 * @param empresaNombre Nombre opcional de la empresa emisora (por defecto "PLOTTIO").
 * @returns Instancia de jsPDF generada.
 */
export function generarPdfCotizacion(
	cot?: CotizacionPdfData | null,
	empresaNombre?: string,
): jsPDF {
	const doc = new jsPDF();
	const safeCot = cot ?? {};

	const cotId = safeCot._id ? String(safeCot._id) : "S-N";
	const fecha = safeCot.fecha
		? String(safeCot.fecha)
		: new Date().toISOString().split("T")[0];
	const empresa = (empresaNombre || "").trim() || "PLOTTIO";
	const clienteNombre = safeCot.clienteNombre
		? String(safeCot.clienteNombre)
		: "Consumidor Final";
	const clienteTelefono = safeCot.clienteTelefono
		? String(safeCot.clienteTelefono)
		: "Sin registrar";
	const vehiculoTipo = safeCot.vehiculoTipo
		? String(safeCot.vehiculoTipo)
		: "General";
	const placa = safeCot.placa ? ` (${safeCot.placa})` : "";
	const rawItems: ItemCotizacionPdf[] = Array.isArray(safeCot.items)
		? safeCot.items
		: [];

	// Header colors: Minimalist blue header line
	doc.setDrawColor(26, 54, 93); // Dark Blue
	doc.setLineWidth(1.5);
	doc.line(20, 15, 190, 15);

	// Title
	doc.setFont("Helvetica", "bold");
	doc.setFontSize(22);
	doc.setTextColor(26, 54, 93); // Blue
	doc.text(empresa, 20, 26);

	doc.setFontSize(10);
	doc.setFont("Helvetica", "normal");
	doc.setTextColor(100, 100, 100);
	doc.text("Especialistas en Stickers y Rotulado Vehicular", 20, 32);

	// Quote ID in Accent Red
	doc.setFont("Helvetica", "bold");
	doc.setFontSize(14);
	doc.setTextColor(197, 48, 48); // Accent Red
	doc.text(`PRESUPUESTO #${cotId}`, 130, 26);

	doc.setFontSize(10);
	doc.setFont("Helvetica", "normal");
	doc.setTextColor(100, 100, 100);
	doc.text(`Fecha: ${fecha}`, 130, 32);

	// Divider line
	doc.setDrawColor(200, 200, 200);
	doc.setLineWidth(0.5);
	doc.line(20, 38, 190, 38);

	// Client information
	doc.setFont("Helvetica", "bold");
	doc.setFontSize(11);
	doc.setTextColor(26, 54, 93);
	doc.text("DATOS DEL CLIENTE Y VEHÍCULO", 20, 48);

	doc.setFont("Helvetica", "normal");
	doc.setFontSize(10);
	doc.setTextColor(50, 50, 50);
	doc.text(`Cliente: ${clienteNombre}`, 20, 55);
	doc.text(`Teléfono: ${clienteTelefono}`, 20, 61);

	doc.text(`Tipo de Vehículo: ${vehiculoTipo}${placa}`, 110, 55);
	doc.text(`Moneda: USD ($)`, 110, 61);

	// Table Header
	doc.setFont("Helvetica", "bold");
	doc.setFillColor(26, 54, 93); // Blue row background
	doc.rect(20, 72, 170, 8, "F");
	doc.setTextColor(255, 255, 255);
	doc.text("Descripción del Concepto / Sticker", 23, 77);
	doc.text("Cant", 125, 77);
	doc.text("Precio Unit.", 145, 77);
	doc.text("Total", 175, 77);

	// Table Content
	let yPos = 87;
	doc.setFont("Helvetica", "normal");
	doc.setTextColor(50, 50, 50);

	let calculatedTotal = 0;
	if (rawItems.length === 0) {
		doc.text("Sin conceptos registrados en el presupuesto", 23, yPos);
		yPos += 8;
	} else {
		rawItems.forEach((item, index) => {
			if (yPos > 260) {
				doc.addPage();
				doc.setDrawColor(26, 54, 93);
				doc.setLineWidth(1.5);
				doc.line(20, 15, 190, 15);

				// Redraw table header on new page
				doc.setFont("Helvetica", "bold");
				doc.setFillColor(26, 54, 93);
				doc.rect(20, 22, 170, 8, "F");
				doc.setTextColor(255, 255, 255);
				doc.text("Descripción del Concepto / Sticker", 23, 27);
				doc.text("Cant", 125, 27);
				doc.text("Precio Unit.", 145, 27);
				doc.text("Total", 175, 27);

				yPos = 37;
				doc.setFont("Helvetica", "normal");
				doc.setTextColor(50, 50, 50);
			}

			// Alternate light blue/grey rows
			if (index % 2 === 0) {
				doc.setFillColor(240, 244, 248);
				doc.rect(20, yPos - 5, 170, 7.5, "F");
			}

			const desc = String(item?.descripcion || "Servicio / Ítem").substring(
				0,
				45,
			);
			const cantidad =
				typeof item?.cantidad === "number"
					? item.cantidad
					: Number(item?.cantidad) || 1;
			const pu =
				typeof item?.precioUnitario === "number"
					? item.precioUnitario
					: Number(item?.precioUnitario) || 0;
			const subtotal = cantidad * pu;
			calculatedTotal += subtotal;

			doc.text(desc, 23, yPos);
			doc.text(cantidad.toString(), 127, yPos);
			doc.text(`$${pu.toLocaleString("en-US")}`, 145, yPos);
			doc.text(`$${subtotal.toLocaleString("en-US")}`, 175, yPos);
			yPos += 8;
		});
	}

	const total =
		typeof safeCot.total === "number"
			? safeCot.total
			: safeCot.total !== undefined && !Number.isNaN(Number(safeCot.total))
				? Number(safeCot.total)
				: calculatedTotal;

	// Totals Box (accented red borders/bg)
	yPos += 5;
	if (yPos > 250) {
		doc.addPage();
		yPos = 25;
	}

	doc.setDrawColor(26, 54, 93);
	doc.line(20, yPos, 190, yPos);

	doc.setFont("Helvetica", "bold");
	doc.setTextColor(26, 54, 93);
	doc.text("VALOR TOTAL ESTIMADO:", 110, yPos + 8);

	doc.setTextColor(197, 48, 48); // Red for total sum
	doc.setFontSize(13);
	doc.text(`$${total.toLocaleString("en-US")} USD`, 160, yPos + 8);

	// Terms
	doc.setFontSize(8);
	doc.setFont("Helvetica", "italic");
	doc.setTextColor(120, 120, 120);
	doc.text(
		"* Este presupuesto tiene una validez de 15 días laborables.",
		20,
		yPos + 22,
	);
	doc.text(
		"* El tiempo estimado de producción inicia con el anticipo acordado.",
		20,
		yPos + 26,
	);
	doc.text(`${empresa} - Impresión y Rotulación Profesional.`, 20, yPos + 32);

	const safeFilename = `Cotizacion-${cotId}-${String(clienteNombre).replace(/\s+/g, "_")}.pdf`;
	if (typeof window !== "undefined") {
		try {
			doc.save(safeFilename);
		} catch {
			// Silent in headless test environments where save may not be supported
		}
	}

	return doc;
}
