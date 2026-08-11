import { useMutation, useQuery } from "convex/react";
import { jsPDF } from "jspdf";
import {
	AlertCircle,
	Briefcase,
	Car,
	Check,
	CheckSquare,
	ChevronRight,
	Download,
	FileText,
	MessageSquare,
	Phone,
	Plus,
	Search,
	Square,
	Trash2,
	User,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useSessionStore } from "../store/useSessionStore";
import { SuccessDialog } from "./SuccessDialog";

interface CotizacionesViewProps {
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
}

// Tipos mínimos que necesitamos localmente (Convex devuelve _id; alias id para no romper la UI)
type LocalCliente = {
	id: string;
	nombre: string;
	telefono: string;
	email: string;
	empresaId: string | null;
	sucursalId?: string;
};

type LocalVehiculo = {
	id: string;
	propietarioId: string;
	propietarioTipo: "cliente" | "empresa";
	placa: string;
	categoria: string;
	marca: string;
	modelo: string;
	año: string;
	anio: string;
	numeroSerie: string;
	estado: "Activo" | "En Mantenimiento" | "Inactivo";
};

type LocalPlantilla = {
	id: string;
	categoriaVehiculo: string;
	concepto: string;
	precioSugerido: number;
};

interface ItemCotizacion {
	descripcion: string;
	cantidad: number;
	precioUnitario: number;
}

interface Cotizacion {
	id: string;
	clienteNombre: string;
	clienteTelefono: string;
	vehiculoTipo: string;
	items: ItemCotizacion[];
	total: number;
	estado: "Pendiente" | "Aceptada" | "Rechazada";
	fecha: string;
	sucursalId?: string;
	pvId?: string;
}

export const CotizacionesView: React.FC<CotizacionesViewProps> = ({
	onNavigate,
}) => {
	const currentUser = useSessionStore((s) => s.currentUser);
	const usuarioId = currentUser?.id;

	// ── QUERIES (sustituyen a los arrays del store) ─────────────────────────
	const rawCotizaciones = useQuery(
		api.cotizaciones.fetchCotizaciones,
		usuarioId ? { usuarioId: usuarioId as Id<"usuarios"> } : "skip",
	) as Array<Cotizacion & { _id: string }> | undefined;

	const rawClientes = useQuery(
		api.clientes.fetchClientes,
		usuarioId ? { usuarioId: usuarioId as Id<"usuarios"> } : "skip",
	) as Array<LocalCliente & { _id: string }> | undefined;

	const rawVehiculos = useQuery(
		api.vehiculos.fetchVehiculos,
		usuarioId ? { usuarioId: usuarioId as Id<"usuarios"> } : "skip",
	) as Array<LocalVehiculo & { _id: string }> | undefined;

	const rawPlantillas = useQuery(
		api.plantillas.getPlantillas,
		usuarioId ? { usuarioId: usuarioId as Id<"usuarios"> } : "skip",
	) as Array<LocalPlantilla & { _id: string }> | undefined;

	const rawCategorias = useQuery(
		api.plantillas.getCategorias,
		usuarioId ? { usuarioId: usuarioId as Id<"usuarios"> } : "skip",
	) as Array<{ _id: string; nombre: string }> | undefined;

	const rawCatalogoServicios = useQuery(
		api.catalogoServicios.getServicios,
		usuarioId ? { usuarioId: usuarioId as Id<"usuarios"> } : "skip",
	) as
		| Array<{ _id: string; nombre: string; categoria: string; precio: number }>
		| undefined;

	// ── MUTATIONS (sustituyen a los setters de Zustand) ─────────────────────
	const createCotizacionMut = useMutation(api.cotizaciones.createCotizacion);
	const deleteCotizacionMut = useMutation(api.cotizaciones.deleteCotizacion);
	const createVehiculoMut = useMutation(api.vehiculos.createVehiculo);
	const createOrdenMut = useMutation(api.ordenes.createOrdenTrabajo);
	const createClienteMut = useMutation(api.clientes.createCliente);

	// ── ADAPTACIÓN: Convex devuelve _id; mapeamos a `id` para mantener la UI ──
	const cotizaciones: Cotizacion[] = useMemo(
		() =>
			(rawCotizaciones ?? []).map((c) => ({
				id: c._id,
				clienteNombre: c.clienteNombre ?? "",
				clienteTelefono: c.clienteTelefono ?? "",
				vehiculoTipo: c.vehiculoTipo ?? "",
				items: (c.items ?? []).map((it) => ({
					descripcion: it.descripcion ?? "",
					cantidad: it.cantidad ?? 1,
					precioUnitario: it.precioUnitario ?? 0,
				})),
				total: c.total ?? 0,
				estado: (c.estado as Cotizacion["estado"]) ?? "Pendiente",
				fecha: c.fecha ?? "",
			})),
		[rawCotizaciones],
	);

	const clientes: LocalCliente[] = useMemo(
		() =>
			(rawClientes ?? []).map((c) => ({
				id: c._id,
				nombre: c.nombre ?? "",
				telefono: c.telefono ?? "",
				email: c.email ?? "",
				empresaId: c.empresaId ?? null,
				sucursalId: c.sucursalId,
			})),
		[rawClientes],
	);

	const vehiculos: LocalVehiculo[] = useMemo(
		() =>
			(rawVehiculos ?? []).map((v) => ({
				id: v._id,
				propietarioId: v.propietarioId ?? "",
				propietarioTipo:
					(v.propietarioTipo as "cliente" | "empresa") ?? "cliente",
				placa: v.placa ?? "",
				categoria: v.categoria ?? "",
				marca: v.marca ?? "",
				modelo: v.modelo ?? "",
				año: v.anio ?? "",
				numeroSerie: v.numeroSerie ?? "",
				estado: (v.estado as LocalVehiculo["estado"]) ?? "Activo",
				anio: v.anio ?? "",
			})),
		[rawVehiculos],
	);

	const plantillasPrecios: LocalPlantilla[] = useMemo(
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
		() => (rawCategorias ?? []).map((c) => c.nombre),
		[rawCategorias],
	);

	const catalogoServicios = rawCatalogoServicios ?? [];

	// Selected Quote for browsing list
	const [selectedCotizacionId, setSelectedCotizacionId] = useState<
		string | null
	>(cotizaciones.length > 0 ? cotizaciones[0].id : null);

	// Quote list search term
	const [quoteSearchTerm, setQuoteSearchTerm] = useState("");

	// Zone 1: Contact & Vehicle (Creation Editor)
	const [clienteNombre, setClienteNombre] = useState("");
	const [clienteTelefono, setClienteTelefono] = useState("");
	const [vehiculoTipo, setVehiculoTipo] = useState<string>(
		categoriasPrecios[0] || "Bus Urbano",
	);
	const [placa, setPlaca] = useState("");

	// Client matching & Vehicle Dual-Lookup states
	const [matchedCliente, setMatchedCliente] = useState<LocalCliente | null>(
		null,
	);
	const [selectedVehiculoId, setSelectedVehiculoId] = useState<string>("nuevo");
	const [showNewVehicleForm, setShowNewVehicleForm] = useState(false);

	// Inline Vehicle Registration Form States
	const [newPlaca, setNewPlaca] = useState("");
	const [newMarca, setNewMarca] = useState("");
	const [newModelo, setNewModelo] = useState("");
	const [newAño, setNewAño] = useState(new Date().getFullYear().toString());
	const [newSerie, setNewSerie] = useState("");

	// Zone 2: Quote Items Editor
	const [items, setItems] = useState<ItemCotizacion[]>([]);
	const [customDesc, setCustomDesc] = useState("");
	const [customCant, setCustomCant] = useState(1);
	const [customPrecio, setCustomPrecio] = useState(0);

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

	// Track checked state of templates
	const [checkedTemplates, setCheckedTemplates] = useState<
		Record<string, boolean>
	>({});

	// 1. Process sessionStorage pre-fills from vehicle flow
	useEffect(() => {
		if (typeof window !== "undefined") {
			const pPlaca = sessionStorage.getItem("prefilled_placa");
			const pCliente = sessionStorage.getItem("prefilled_clienteNombre");
			const pTelefono = sessionStorage.getItem("prefilled_clienteTelefono");
			const pVehTipo = sessionStorage.getItem("prefilled_vehiculoTipo");

			if (pPlaca || pCliente || pTelefono || pVehTipo) {
				setSelectedCotizacionId(null); // Clear viewing mode to open creation mode
				if (pCliente) {
					setClienteNombre(pCliente);
					const found = clientes.find(
						(c) =>
							c.nombre.toLowerCase().trim() === pCliente.toLowerCase().trim(),
					);
					if (found) {
						setMatchedCliente(found);
						setClienteTelefono(found.telefono);
					} else {
						setClienteTelefono(pTelefono || "");
					}
				}

				if (pPlaca) {
					setPlaca(pPlaca);
					const foundVeh = vehiculos.find(
						(v) => v.placa.toUpperCase() === pPlaca.toUpperCase(),
					);
					if (foundVeh) {
						setSelectedVehiculoId(foundVeh.id);
						setVehiculoTipo(foundVeh.categoria);
						setShowNewVehicleForm(false);
					} else {
						setSelectedVehiculoId("nuevo");
						setShowNewVehicleForm(true);
					}
				} else if (pVehTipo) {
					setVehiculoTipo(pVehTipo);
				}

				// Clean up sessionStorage
				sessionStorage.removeItem("prefilled_placa");
				sessionStorage.removeItem("prefilled_clienteNombre");
				sessionStorage.removeItem("prefilled_clienteTelefono");
				sessionStorage.removeItem("prefilled_vehiculoTipo");

				setAlertConfig({
					isOpen: true,
					title: "Datos Transferidos",
					message: "Se cargaron los datos del vehículo y cliente para cotizar.",
					type: "success",
				});
			}
		}
	}, [clientes, vehiculos]);

	// Sync active category if it gets deleted
	useEffect(() => {
		if (
			categoriasPrecios.length > 0 &&
			!categoriasPrecios.includes(vehiculoTipo)
		) {
			setVehiculoTipo(categoriasPrecios[0]);
		}
	}, [categoriasPrecios, vehiculoTipo]);

	// 2. Intelligent Auto-Complete Client Search
	const handleClientNameChange = (val: string) => {
		setClienteNombre(val);
		const matched = clientes.find(
			(c) => c.nombre.toLowerCase().trim() === val.toLowerCase().trim(),
		);
		if (matched) {
			setMatchedCliente(matched);
			setClienteTelefono(matched.telefono);
			setSelectedVehiculoId(""); // Reset selected vehicle
			setShowNewVehicleForm(false);
		} else {
			setMatchedCliente(null);
			setSelectedVehiculoId("nuevo");
			setShowNewVehicleForm(true); // Automatically show vehicle form for new client
		}
	};

	// Find vehicles belonging to the matched client (or client's company)
	const clientVehicles = matchedCliente
		? vehiculos.filter(
				(v) =>
					(v.propietarioTipo === "cliente" &&
						v.propietarioId === matchedCliente.id) ||
					(v.propietarioTipo === "empresa" &&
						matchedCliente.empresaId &&
						v.propietarioId === matchedCliente.empresaId),
			)
		: [];

	// When selected client vehicle changes
	const handleVehicleSelect = (vId: string) => {
		setSelectedVehiculoId(vId);
		if (vId === "nuevo") {
			setShowNewVehicleForm(true);
			setPlaca("");
		} else {
			setShowNewVehicleForm(false);
			const veh = vehiculos.find((v) => v.id === vId);
			if (veh) {
				setPlaca(veh.placa);
				setVehiculoTipo(veh.categoria);
			}
		}
	};

	// Inline Vehicle Registration Save Handler
	const handleInlineRegisterVehicle = async () => {
		if (
			!newPlaca.trim() ||
			!newMarca.trim() ||
			!newModelo.trim() ||
			!matchedCliente ||
			!usuarioId
		) {
			setAlertConfig({
				isOpen: true,
				title: "Error de Registro",
				message:
					"Por favor, completa al menos Placa, Marca y Modelo para registrar el vehículo.",
				type: "alert",
			});
			return;
		}

		try {
			const regVeh = (await createVehiculoMut({
				usuarioId: usuarioId as Id<"usuarios">,
				placa: newPlaca.trim().toUpperCase(),
				marca: newMarca.trim(),
				modelo: newModelo.trim(),
				anio: newAño.trim() || "2025",
				categoria: vehiculoTipo,
				numeroSerie:
					newSerie.trim() || `S/N-${Date.now().toString().slice(-6)}`,
				propietarioId: matchedCliente.id,
				propietarioTipo: "cliente",
				estado: "Activo",
			})) as unknown as LocalVehiculo & { _id: string };

			// Auto-select newly created vehicle
			setSelectedVehiculoId(regVeh._id);
			setPlaca(regVeh.placa);
			setVehiculoTipo(regVeh.categoria);
			setShowNewVehicleForm(false);

			// Reset inputs
			setNewPlaca("");
			setNewMarca("");
			setNewModelo("");
			setNewSerie("");

			setAlertConfig({
				isOpen: true,
				title: "Vehículo Registrado",
				message: `El vehículo ${regVeh.marca} ${regVeh.modelo} (${regVeh.placa}) ha sido vinculado a ${matchedCliente.nombre}.`,
				type: "success",
			});
		} catch (err) {
			setAlertConfig({
				isOpen: true,
				title: "Error al registrar vehículo",
				message: err instanceof Error ? err.message : "Error desconocido",
				type: "alert",
			});
		}
	};

	// 3. Dynamic total calculation
	const quoteTotal = items.reduce(
		(sum, item) => sum + item.cantidad * item.precioUnitario,
		0,
	);

	// Get templates matching current vehicle category
	const relevantTemplates = plantillasPrecios.filter(
		(p) => p.categoriaVehiculo === vehiculoTipo,
	);

	// Checkbox action for template suggestion items
	const handleTemplateCheckboxToggle = (tpl: LocalPlantilla) => {
		const isChecked = !checkedTemplates[tpl.id];
		setCheckedTemplates((prev) => ({ ...prev, [tpl.id]: isChecked }));

		if (isChecked) {
			// Add template item to table
			setItems((prev) => [
				...prev,
				{
					descripcion: tpl.concepto,
					cantidad: 1,
					precioUnitario: tpl.precioSugerido,
				},
			]);
		} else {
			// Remove template item from table
			setItems((prev) =>
				prev.filter((item) => item.descripcion !== tpl.concepto),
			);
		}
	};

	// Reset checkboxes when vehicle category changes
	useEffect(() => {
		setCheckedTemplates({});
		setItems([]);
	}, []);

	// Manually add custom item
	const handleAddCustomItem = (e: React.FormEvent) => {
		e.preventDefault();
		if (!customDesc.trim() || customCant <= 0) return;

		setItems((prev) => [
			...prev,
			{
				descripcion: customDesc.trim(),
				cantidad: Number(customCant),
				precioUnitario: Number(customPrecio),
			},
		]);

		setCustomDesc("");
		setCustomCant(1);
		setCustomPrecio(0);
	};

	// Delete item from list
	const handleDeleteItem = (index: number, desc: string) => {
		setItems((prev) => prev.filter((_, idx) => idx !== index));
		// Also uncheck template if it was a template
		const tpl = relevantTemplates.find((t) => t.concepto === desc);
		if (tpl) {
			setCheckedTemplates((prev) => ({ ...prev, [tpl.id]: false }));
		}
	};

	// 4. SAVE QUOTE
	const handleSaveQuote = async () => {
		if (!clienteNombre.trim() || items.length === 0) {
			setAlertConfig({
				isOpen: true,
				title: "Formulario Incompleto",
				message:
					"Por favor, introduce el nombre del cliente y agrega al menos un ítem al presupuesto.",
				type: "alert",
			});
			return;
		}
		if (!usuarioId) {
			setAlertConfig({
				isOpen: true,
				title: "Sesión requerida",
				message: "Necesitas iniciar sesión para crear cotizaciones.",
				type: "alert",
			});
			return;
		}

		try {
			// Save inline vehicle if new user registered it details manually
			let clienteIdParaVehiculo = matchedCliente?.id;
			if (
				selectedVehiculoId === "nuevo" &&
				newPlaca.trim() &&
				newMarca.trim() &&
				newModelo.trim()
			) {
				// Si no hay cliente matcheado, crearlo primero (reemplaza getOrCreateClienteByName)
				if (!clienteIdParaVehiculo) {
					const nuevoCliente = (await createClienteMut({
						usuarioId: usuarioId as Id<"usuarios">,
						nombre: clienteNombre.trim(),
						telefono: clienteTelefono.trim() || "+593 ",
						email: `${clienteNombre
							.trim()
							.toLowerCase()
							.replace(/\s+/g, ".")}@email.com`,
					})) as unknown as { _id: string };
					clienteIdParaVehiculo = nuevoCliente._id;
				}
				const inlineVeh = (await createVehiculoMut({
					usuarioId: usuarioId as Id<"usuarios">,
					placa: newPlaca.trim().toUpperCase(),
					marca: newMarca.trim(),
					modelo: newModelo.trim(),
					anio: newAño.trim() || "2025",
					categoria: vehiculoTipo,
					numeroSerie:
						newSerie.trim() || `S/N-${Date.now().toString().slice(-6)}`,
					propietarioId: clienteIdParaVehiculo,
					propietarioTipo: "cliente",
					estado: "Activo",
					sucursalId: currentUser?.sucursalId
						? (currentUser.sucursalId as Id<"sucursales">)
						: undefined,
				})) as unknown as { placa: string };
				setPlaca(inlineVeh.placa);
			}

			const savedCot = (await createCotizacionMut({
				usuarioId: usuarioId as Id<"usuarios">,
				clienteNombre: clienteNombre.trim(),
				clienteTelefono: clienteTelefono.trim(),
				vehiculoTipo,
				items: items.map((it) => ({
					descripcion: it.descripcion,
					cantidad: it.cantidad,
					precioUnitario: it.precioUnitario,
				})),
				estado: "Pendiente",
				fecha: new Date().toISOString().split("T")[0],
				sucursalId: currentUser?.sucursalId
					? (currentUser.sucursalId as Id<"sucursales">)
					: undefined,
				pvId: currentUser?.pvId
					? (currentUser.pvId as Id<"puntosVenta">)
					: undefined,
			})) as unknown as Cotizacion & { _id: string };

			setAlertConfig({
				isOpen: true,
				title: "Cotización Guardada",
				message: `El presupuesto para "${clienteNombre.trim()}" se guardó con ID: ${savedCot._id}.`,
				type: "success",
				onConfirm: () => {
					// Automatically switch view to browse the saved quote
					setSelectedCotizacionId(savedCot._id);
				},
			});

			// Reset Form
			setClienteNombre("");
			setClienteTelefono("");
			setItems([]);
			setCheckedTemplates({});
			setPlaca("");
			setMatchedCliente(null);
			setSelectedVehiculoId("nuevo");
			setShowNewVehicleForm(false);
		} catch (err) {
			setAlertConfig({
				isOpen: true,
				title: "Error al guardar cotización",
				message: err instanceof Error ? err.message : "Error desconocido",
				type: "alert",
			});
		}
	};

	// Browse details mapping
	const activeCotizacion = cotizaciones.find(
		(c) => c.id === selectedCotizacionId,
	);

	// 5. EXPORT / EXTRAS
	// Export jsPDF Document with Red/Blue minimalist theme colors
	const handleDownloadPDF = (cot: Cotizacion) => {
		const doc = new jsPDF();

		// Header colors: Minimalist blue header line
		doc.setDrawColor(26, 54, 93); // Dark Blue
		doc.setLineWidth(1.5);
		doc.line(20, 15, 190, 15);

		// Title
		doc.setFont("Helvetica", "bold");
		doc.setFontSize(22);
		doc.setTextColor(26, 54, 93); // Blue
		doc.text("PLOTTIO", 20, 26);

		doc.setFontSize(10);
		doc.setFont("Helvetica", "normal");
		doc.setTextColor(100, 100, 100);
		doc.text("Especialistas en Stickers y Rotulado Vehicular", 20, 32);

		// Quote ID in Accent Red
		doc.setFont("Helvetica", "bold");
		doc.setFontSize(14);
		doc.setTextColor(197, 48, 48); // Accent Red
		doc.text(`PRESUPUESTO #${cot.id}`, 130, 26);

		doc.setFontSize(10);
		doc.setFont("Helvetica", "normal");
		doc.setTextColor(100, 100, 100);
		doc.text(`Fecha: ${cot.fecha}`, 130, 32);

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
		doc.text(`Cliente: ${cot.clienteNombre}`, 20, 55);
		doc.text(`Teléfono: ${cot.clienteTelefono || "Sin registrar"}`, 20, 61);

		doc.text(`Tipo de Vehículo: ${cot.vehiculoTipo}`, 110, 55);
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

		cot.items.forEach((item, index) => {
			// Alternate light blue/grey rows
			if (index % 2 === 0) {
				doc.setFillColor(240, 244, 248);
				doc.rect(20, yPos - 5, 170, 7.5, "F");
			}
			doc.text(item.descripcion, 23, yPos);
			doc.text(item.cantidad.toString(), 127, yPos);
			doc.text(`$${item.precioUnitario.toLocaleString("en-US")}`, 145, yPos);
			doc.text(
				`$${(item.cantidad * item.precioUnitario).toLocaleString("en-US")}`,
				175,
				yPos,
			);
			yPos += 8;
		});

		// Totals Box (accented red borders/bg)
		yPos += 5;
		doc.setDrawColor(26, 54, 93);
		doc.line(20, yPos, 190, yPos);

		doc.setFont("Helvetica", "bold");
		doc.setTextColor(26, 54, 93);
		doc.text("VALOR TOTAL ESTIMADO:", 110, yPos + 8);

		doc.setTextColor(197, 48, 48); // Red for total sum
		doc.setFontSize(13);
		doc.text(`$${cot.total.toLocaleString("en-US")} USD`, 160, yPos + 8);

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
		doc.text("Plottio - Impresión y Rotulación Profesional.", 20, yPos + 32);

		doc.save(
			`Cotizacion-${cot.id}-${cot.clienteNombre.replace(/\s+/g, "_")}.pdf`,
		);
	};

	// WhatsApp formatted message trigger
	const handleSendWhatsApp = (cot: Cotizacion) => {
		let itemsStr = "";
		cot.items.forEach((it, idx) => {
			itemsStr += `${idx + 1}. ${it.descripcion} x${it.cantidad} - $${it.precioUnitario} c/u (%2A$${it.cantidad * it.precioUnitario}%2A)%0A`;
		});

		const msg = `%2ACOTIZACIÓN EN PLOTTIO%2A%0A%0A%2APresupuesto ID:%2A ${cot.id}%0A%2ACliente:%2A ${cot.clienteNombre}%0A%2AVehículo:%2A ${cot.vehiculoTipo}%0A%0A%2ADetalle:%2A%0A${itemsStr}%0A%2ATOTAL ESTIMADO:%2A %2A$${cot.total.toLocaleString("en-US")} USD%2A%0A%0A_Cotización válida por 15 días. ¡Escríbenos para confirmar e iniciar!_`;
		const cleanPhone = cot.clienteTelefono.replace(/[^0-9+]/g, "");
		const url = `https://wa.me/${cleanPhone || ""}?text=${msg}`;
		window.open(url, "_blank");
	};

	// 6. CONVERT QUOTE TO WORK ORDER
	const handleConvertToWorkOrder = (cot: Cotizacion) => {
		setAlertConfig({
			isOpen: true,
			title: "¿Convertir en Orden de Trabajo?",
			message: `Esto generará una Orden de Trabajo activa e iniciará la producción del taller para "${cot.clienteNombre}".`,
			type: "alert",
			onConfirm: async () => {
				if (!usuarioId) {
					setAlertConfig({
						isOpen: true,
						title: "Sesión requerida",
						message: "Necesitas iniciar sesión para crear órdenes.",
						type: "alert",
					});
					return;
				}
				try {
					const orderItems = cot.items.map((it) => ({
						descripcion: it.descripcion,
						cantidad: it.cantidad,
						precioUnitario: it.precioUnitario,
						completado: false,
					}));

					const newOrder = (await createOrdenMut({
						usuarioId: usuarioId as Id<"usuarios">,
						clienteNombre: cot.clienteNombre,
						clienteTelefono: cot.clienteTelefono,
						placa: placa.toUpperCase() || "S/P",
						vehiculoTipo: cot.vehiculoTipo,
						items: orderItems,
						prioridad: "Media" as const,
						estado: "Pendiente" as const,
						fechaInicio: new Date().toISOString().split("T")[0],
						fechaFin: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
							.toISOString()
							.split("T")[0], // 3 days
						notas: [`Generado desde la cotización ${cot.id}.`],
						fotos: [],
						cotizacionId: cot.id as Id<"cotizaciones">,
					})) as { _id: string };

					// Trigger Success feedback
					setAlertConfig({
						isOpen: true,
						title: "Orden Creada",
						message: `Se generó la orden de trabajo ${newOrder._id}. Redirigiendo a producción...`,
						type: "success",
						onConfirm: () => {
							onNavigate("ordenes");
						},
					});
				} catch (err) {
					setAlertConfig({
						isOpen: true,
						title: "Error al crear la orden",
						message: err instanceof Error ? err.message : "Error desconocido",
						type: "alert",
					});
				}
			},
		});
	};

	const handleDeleteCotizacion = (id: string) => {
		setAlertConfig({
			isOpen: true,
			title: "¿Eliminar Cotización?",
			message: `¿Estás seguro de que deseas eliminar permanentemente la cotización "${id}"?`,
			type: "delete",
			onConfirm: async () => {
				if (!usuarioId) return;
				try {
					await deleteCotizacionMut({
						usuarioId: usuarioId as Id<"usuarios">,
						id: id as Id<"cotizaciones">,
					});
					const remaining = cotizaciones.filter((c) => c.id !== id);
					setSelectedCotizacionId(
						remaining.length > 0 ? remaining[0].id : null,
					);
					setAlertConfig({
						isOpen: true,
						title: "Cotización Eliminada",
						message: "El presupuesto ha sido removido del sistema.",
						type: "success",
					});
				} catch (err) {
					setAlertConfig({
						isOpen: true,
						title: "Error al eliminar",
						message: err instanceof Error ? err.message : "Error desconocido",
						type: "alert",
					});
				}
			},
		});
	};

	// Filtered list of quotes
	const filteredCotizaciones = cotizaciones.filter((c) => {
		// SaaS Multi-tenant filtering
		if (currentUser?.rol !== "SuperAdmin") {
			if (
				c.sucursalId &&
				currentUser?.sucursalId &&
				c.sucursalId !== currentUser.sucursalId
			)
				return false;
			if (currentUser?.pvId && c.pvId && c.pvId !== currentUser.pvId)
				return false;
		}

		return (
			c.id.toLowerCase().includes(quoteSearchTerm.toLowerCase()) ||
			c.clienteNombre.toLowerCase().includes(quoteSearchTerm.toLowerCase()) ||
			c.vehiculoTipo.toLowerCase().includes(quoteSearchTerm.toLowerCase())
		);
	});

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight text-foreground">
						Presupuestos y Cotizaciones
					</h1>
					<p className="text-muted-foreground">
						Estructura plantillas y haz seguimiento de cotizaciones guardadas.
					</p>
				</div>
				<button
					type="button"
					onClick={() => setSelectedCotizacionId(null)}
					className={`flex items-center gap-2 rounded-lg py-2.5 px-4 text-sm font-semibold transition-colors cursor-pointer justify-center w-full sm:w-auto shadow-sm ${
						selectedCotizacionId === null
							? "bg-primary text-primary-foreground hover:opacity-95"
							: "bg-primary/10 text-primary hover:bg-primary/20"
					}`}
				>
					<Plus className="h-4 w-4" />
					Nueva Cotización
				</button>
			</div>

			{(() => {
				// Reusable Quote List Panel
				const quoteListMarkup = (
					<div className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col gap-4">
						<div className="relative">
							<Search className="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
							<input
								type="text"
								placeholder="Buscar por ID o cliente..."
								value={quoteSearchTerm}
								onChange={(e) => setQuoteSearchTerm(e.target.value)}
								className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground focus:border-ring focus:outline-none"
							/>
						</div>

						<div className="divide-y divide-border overflow-y-auto max-h-[520px] pr-1">
							{filteredCotizaciones.map((cot) => (
								<button
									key={cot.id}
									type="button"
									onClick={() => setSelectedCotizacionId(cot.id)}
									className={`w-full flex items-center justify-between py-3 px-3 rounded-lg text-left transition-colors my-1 ${
										selectedCotizacionId === cot.id
											? "bg-primary text-primary-foreground shadow-sm"
											: "hover:bg-secondary"
									}`}
								>
									<div className="truncate pr-2">
										<div className="flex items-center gap-1.5 font-bold text-sm">
											<span
												className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
													selectedCotizacionId === cot.id
														? "bg-primary-foreground/15 text-primary-foreground"
														: "bg-secondary text-foreground"
												}`}
											>
												{cot.id}
											</span>
											<span className="truncate">{cot.clienteNombre}</span>
										</div>
										<div className="mt-1 flex items-center gap-2 text-xs">
											<span className="opacity-85">{cot.vehiculoTipo}</span>
											<span className="opacity-50">•</span>
											<span className="font-bold">
												${cot.total.toLocaleString("en-US")}
											</span>
										</div>
									</div>
									<ChevronRight className="h-4 w-4 opacity-50 shrink-0" />
								</button>
							))}
							{filteredCotizaciones.length === 0 && (
								<div className="text-center py-8 text-muted-foreground text-sm">
									No se encontraron cotizaciones.
								</div>
							)}
						</div>
					</div>
				);

				if (selectedCotizacionId !== null && activeCotizacion) {
					/* ==============================================================
             PREVIEW MODE: Sidebar list (1 col) + Detail Panel (2 cols)
             ============================================================== */
					return (
						<div className="grid gap-6 md:grid-cols-3">
							{/* Left Column: Quotes List */}
							{quoteListMarkup}

							{/* Right Columns: Quote Details preview */}
							<div className="md:col-span-2 rounded-xl border border-border bg-card text-foreground p-6 shadow-sm space-y-6">
								{/* Invoice Layout Header */}
								<div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border pb-5">
									<div>
										<h2 className="text-xl font-bold text-foreground">
											Detalle de Cotización
										</h2>
										<p className="text-xs text-muted-foreground mt-0.5">
											Presupuesto para servicios e instalación
										</p>
									</div>
									<div className="text-left sm:text-right">
										<div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
											ID Cotización
										</div>
										<div className="text-lg font-bold text-primary">
											{activeCotizacion.id}
										</div>
										<div className="text-xs text-muted-foreground mt-1">
											Fecha: {activeCotizacion.fecha}
										</div>
									</div>
								</div>

								{/* Client Info Grid */}
								<div className="grid gap-4 sm:grid-cols-2">
									<div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/10 p-3">
										<User className="h-5 w-5 text-muted-foreground shrink-0" />
										<div>
											<div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
												Cliente / Destinatario
											</div>
											<div className="text-sm font-semibold text-foreground">
												{activeCotizacion.clienteNombre}
											</div>
											{activeCotizacion.clienteTelefono && (
												<div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
													<Phone className="h-3.5 w-3.5 text-muted-foreground/75" />
													{activeCotizacion.clienteTelefono}
												</div>
											)}
										</div>
									</div>

									<div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/10 p-3">
										<Car className="h-5 w-5 text-muted-foreground shrink-0" />
										<div>
											<div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
												Vehículo & Servicio
											</div>
											<div className="text-sm font-semibold text-foreground">
												{activeCotizacion.vehiculoTipo}
											</div>
											<div className="text-xs text-muted-foreground mt-0.5">
												Moneda: Dólar (USD)
											</div>
										</div>
									</div>
								</div>

								{/* Items Table */}
								<div className="space-y-2">
									<div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
										Conceptos y Desglose de Precios
									</div>
									<div className="border border-border rounded-lg overflow-hidden">
										<table className="w-full text-left text-xs border-collapse">
											<thead>
												<tr className="bg-secondary/50 text-foreground font-semibold border-b border-border">
													<th className="py-2.5 px-3">
														Descripción de Stickers / Vinilos
													</th>
													<th className="py-2.5 px-3 text-center">Cant.</th>
													<th className="py-2.5 px-3 text-right">
														Precio Unit.
													</th>
													<th className="py-2.5 px-3 text-right">Subtotal</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-border text-foreground">
												{activeCotizacion.items.map((item, idx) => (
													<tr
														// biome-ignore lint/suspicious/noArrayIndexKey: vista estática de ítems de cotización
														key={idx}
														className="hover:bg-secondary/20"
													>
														<td className="py-2.5 px-3 font-medium">
															{item.descripcion}
														</td>
														<td className="py-2.5 px-3 text-center">
															{item.cantidad}
														</td>
														<td className="py-2.5 px-3 text-right">
															${item.precioUnitario.toLocaleString("en-US")}
														</td>
														<td className="py-2.5 px-3 text-right font-semibold text-primary">
															$
															{(
																item.cantidad * item.precioUnitario
															).toLocaleString("en-US")}
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								</div>

								{/* Totals Block */}
								<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-3 border-t border-border gap-4">
									<div className="text-[11px] text-muted-foreground italic">
										* Presupuesto válido por 15 días. Sujeto a cambios según
										complejidad.
									</div>
									<div className="flex items-baseline gap-3 text-right self-end">
										<span className="text-xs font-bold text-muted-foreground uppercase">
											Total Estimado:
										</span>
										<span className="text-2xl font-black text-foreground">
											${activeCotizacion.total.toLocaleString("en-US")} USD
										</span>
									</div>
								</div>

								{/* Form Action Controls */}
								<div className="grid gap-2 sm:grid-cols-4 pt-4 border-t border-border">
									<button
										type="button"
										onClick={() => handleSendWhatsApp(activeCotizacion)}
										className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card py-2.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors cursor-pointer"
									>
										<MessageSquare className="h-4 w-4 text-green-500" />
										Enviar WhatsApp
									</button>
									<button
										type="button"
										onClick={() => handleDownloadPDF(activeCotizacion)}
										className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card py-2.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors cursor-pointer"
									>
										<Download className="h-4 w-4 text-primary" />
										Descargar PDF
									</button>
									<button
										type="button"
										onClick={() => handleConvertToWorkOrder(activeCotizacion)}
										className="flex items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-all cursor-pointer shadow-sm"
									>
										<Briefcase className="h-4 w-4" />
										Iniciar Trabajo
									</button>
									<button
										type="button"
										onClick={() => handleDeleteCotizacion(activeCotizacion.id)}
										className="flex items-center justify-center gap-1.5 rounded-lg border border-destructive/20 bg-card text-destructive hover:bg-destructive/10 py-2.5 text-xs font-semibold transition-all cursor-pointer"
									>
										<Trash2 className="h-4 w-4" />
										Eliminar
									</button>
								</div>
							</div>
						</div>
					);
				} else {
					/* ==============================================================
             CREATION MODE: Restructured spacious 2-row layout
             ============================================================== */
					return (
						<div className="space-y-6 animate-fade-in">
							{/* ROW 1: 3 Equal side-by-side columns (Quote List, Pane 1, Pane 2) */}
							<div className="grid gap-6 lg:grid-cols-3">
								{/* Column 1: Quotes list */}
								{quoteListMarkup}

								{/* Column 2: Creator Pane 1: Client and Vehicle (Dual Search) */}
								<div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4 flex flex-col justify-between">
									<div className="space-y-4">
										<h2 className="text-base font-bold text-foreground flex items-center gap-2 pb-2 border-b border-border">
											<User className="h-5 w-5 text-muted-foreground" />
											1. Cliente y Vehículo
										</h2>

										<div>
											<label
												htmlFor="cot-cliente-nombre"
												className="block text-xs font-semibold text-muted-foreground mb-1"
											>
												Nombre del Cliente *
											</label>
											<input
												id="cot-cliente-nombre"
												type="text"
												required
												value={clienteNombre}
												onChange={(e) => handleClientNameChange(e.target.value)}
												className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
												placeholder="Busca o escribe nombre..."
												list="clientes-autocomp"
											/>
											<datalist id="clientes-autocomp">
												{clientes.map((c) => (
													<option key={c.id} value={c.nombre} />
												))}
											</datalist>
											{matchedCliente ? (
												<p className="text-[10px] text-green-500 font-semibold mt-1 flex items-center gap-1">
													<Check className="h-3 w-3" /> Cliente registrado (ID:{" "}
													{matchedCliente.id})
												</p>
											) : (
												clienteNombre.trim() && (
													<p className="text-[10px] text-yellow-500 font-semibold mt-1">
														Cliente nuevo (se creará al guardar)
													</p>
												)
											)}
										</div>

										{matchedCliente && (
											<div>
												<label
													htmlFor="cot-vehiculos-cliente"
													className="block text-xs font-semibold text-muted-foreground mb-1"
												>
													Vehículos del Cliente
												</label>
												<select
													id="cot-vehiculos-cliente"
													value={selectedVehiculoId}
													onChange={(e) => handleVehicleSelect(e.target.value)}
													className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
												>
													<option value="" disabled>
														-- Selecciona un vehículo --
													</option>
													{clientVehicles.map((v) => (
														<option key={v.id} value={v.id}>
															{v.placa} ({v.marca} {v.modelo})
														</option>
													))}
													<option value="nuevo">
														+ Registrar nuevo vehículo...
													</option>
												</select>
											</div>
										)}

										{/* Inline New Vehicle Form */}
										{(showNewVehicleForm || selectedVehiculoId === "nuevo") && (
											<div className="rounded-xl border border-dashed border-border p-3.5 bg-secondary/10 space-y-3">
												<div className="text-xs font-bold text-foreground flex items-center gap-1.5">
													<Plus className="h-4 w-4 text-primary" />
													Registrar Vehículo del Cliente
												</div>

												<div className="grid grid-cols-2 gap-2">
													<div>
														<label
															htmlFor="cot-placa"
															className="block text-[10px] text-muted-foreground"
														>
															Placa *
														</label>
														<input
															id="cot-placa"
															type="text"
															required
															placeholder="Ej. PBA-1234"
															value={newPlaca}
															onChange={(e) => setNewPlaca(e.target.value)}
															className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none"
														/>
													</div>
													<div>
														<label
															htmlFor="cot-categoria"
															className="block text-[10px] text-muted-foreground"
														>
															Categoría
														</label>
														<select
															id="cot-categoria"
															value={vehiculoTipo}
															onChange={(e) => setVehiculoTipo(e.target.value)}
															className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none"
														>
															{categoriasPrecios.map((cat) => (
																<option key={cat} value={cat}>
																	{cat}
																</option>
															))}
														</select>
													</div>
												</div>

												<div className="grid grid-cols-2 gap-2">
													<div>
														<label
															htmlFor="cot-marca"
															className="block text-[10px] text-muted-foreground"
														>
															Marca *
														</label>
														<input
															id="cot-marca"
															type="text"
															required
															placeholder="Ej. Chevrolet"
															value={newMarca}
															onChange={(e) => setNewMarca(e.target.value)}
															className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none"
														/>
													</div>
													<div>
														<label
															htmlFor="cot-modelo"
															className="block text-[10px] text-muted-foreground"
														>
															Modelo *
														</label>
														<input
															id="cot-modelo"
															type="text"
															required
															placeholder="Ej. Sail"
															value={newModelo}
															onChange={(e) => setNewModelo(e.target.value)}
															className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none"
														/>
													</div>
												</div>

												<div className="grid grid-cols-2 gap-2">
													<div>
														<label
															htmlFor="cot-anio"
															className="block text-[10px] text-muted-foreground"
														>
															Año
														</label>
														<input
															id="cot-anio"
															type="text"
															value={newAño}
															onChange={(e) => setNewAño(e.target.value)}
															className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none"
														/>
													</div>
													<div>
														<label
															htmlFor="cot-serie"
															className="block text-[10px] text-muted-foreground"
														>
															N° Chasis / Serie
														</label>
														<input
															id="cot-serie"
															type="text"
															placeholder="Ej. CHS-123"
															value={newSerie}
															onChange={(e) => setNewSerie(e.target.value)}
															className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none"
														/>
													</div>
												</div>

												{matchedCliente && (
													<button
														type="button"
														onClick={handleInlineRegisterVehicle}
														className="w-full py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded hover:opacity-90 transition-colors"
													>
														Vincular Vehículo al Cliente
													</button>
												)}
											</div>
										)}

										{!showNewVehicleForm &&
											selectedVehiculoId !== "nuevo" &&
											selectedVehiculoId !== "" && (
												<div className="rounded-lg border border-border p-3 bg-secondary/20 space-y-1">
													<div className="text-xs font-bold text-foreground">
														Vehículo Vinculado
													</div>
													<div className="text-xs text-muted-foreground">
														Placa:{" "}
														<strong className="text-foreground">{placa}</strong>{" "}
														• Categoría: {vehiculoTipo}
													</div>
												</div>
											)}

										<div>
											<label
												htmlFor="cot-telefono"
												className="block text-xs font-semibold text-muted-foreground mb-1"
											>
												Teléfono del Cliente
											</label>
											<input
												id="cot-telefono"
												type="text"
												value={clienteTelefono}
												onChange={(e) => setClienteTelefono(e.target.value)}
												className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
												placeholder="+593 "
											/>
										</div>
									</div>

									{clienteNombre.trim() && (
										<div className="rounded-lg bg-secondary/20 border border-border p-3 flex items-start gap-2 mt-4">
											<Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
											<span className="text-xs text-muted-foreground">
												Listo para cotizar a{" "}
												<strong className="text-foreground">
													{clienteNombre}
												</strong>
												.
											</span>
										</div>
									)}
								</div>

								{/* Column 3: Creator Pane 2: Templates & Suggestion Items */}
								<div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
									<h2 className="text-base font-bold text-foreground flex items-center gap-2 pb-2 border-b border-border">
										<Car className="h-5 w-5 text-muted-foreground" />
										2. Servicios y Aditamentos
									</h2>

									{/* SUGGESTIONS CHECKBOXES */}
									<div className="space-y-2">
										<span className="block text-xs font-semibold text-muted-foreground">
											Precios Recomendados ({vehiculoTipo}):
										</span>
										<div className="grid gap-2 max-h-[160px] overflow-y-auto pr-1">
											{relevantTemplates.map((tpl) => (
												<button
													key={tpl.id}
													type="button"
													onClick={() => handleTemplateCheckboxToggle(tpl)}
													className={`w-full flex items-center justify-between rounded-lg border p-2.5 text-left text-xs font-medium transition-all ${
														checkedTemplates[tpl.id]
															? "border-primary bg-secondary/80 text-foreground"
															: "border-border bg-card hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
													}`}
												>
													<div className="flex items-center gap-2 truncate">
														{checkedTemplates[tpl.id] ? (
															<CheckSquare className="h-4 w-4 shrink-0 text-foreground" />
														) : (
															<Square className="h-4 w-4 shrink-0 text-muted-foreground" />
														)}
														<span className="truncate">{tpl.concepto}</span>
													</div>
													<span className="font-bold text-foreground shrink-0">
														${tpl.precioSugerido}
													</span>
												</button>
											))}
										</div>
									</div>

									<div className="border-t border-border pt-3">
										<label
											htmlFor="cot-custom-desc"
											className="block text-xs font-semibold text-muted-foreground mb-2"
										>
											Añadir concepto personalizado:
										</label>
										<form onSubmit={handleAddCustomItem} className="space-y-3">
											<input
												id="cot-custom-desc"
												type="text"
												required
												placeholder="Seleccione o escriba el servicio"
												value={customDesc}
												list="cotizacion-servicios-list"
												onChange={(e) => {
													const val = e.target.value;
													setCustomDesc(val);
													const found = catalogoServicios.find(
														(s) => s.nombre === val,
													);
													if (found && customPrecio === 0) {
														const precio =
															(
																found as {
																	precio?: number;
																	precioBase?: number;
																}
															).precio ??
															(
																found as {
																	precio?: number;
																	precioBase?: number;
																}
															).precioBase ??
															0;
														setCustomPrecio(precio);
													}
												}}
												className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-ring focus:outline-none"
											/>
											<datalist id="cotizacion-servicios-list">
												{catalogoServicios.map((s) => (
													<option key={s._id} value={s.nombre}>
														$
														{(s as { precio?: number; precioBase?: number })
															.precio ??
															(s as { precio?: number; precioBase?: number })
																.precioBase ??
															0}{" "}
														- {s.categoria}
													</option>
												))}
											</datalist>
											<div className="grid grid-cols-2 gap-3">
												<div>
													<label
														htmlFor="cot-cantidad"
														className="block text-[10px] text-muted-foreground mb-0.5"
													>
														Cantidad
													</label>
													<input
														id="cot-cantidad"
														type="number"
														min="1"
														value={customCant}
														onChange={(e) =>
															setCustomCant(Number(e.target.value))
														}
														className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-ring focus:outline-none"
													/>
												</div>
												<div>
													<label
														htmlFor="cot-precio-unit"
														className="block text-[10px] text-muted-foreground mb-0.5"
													>
														Precio Unitario ($)
													</label>
													<input
														id="cot-precio-unit"
														type="number"
														min="0"
														value={customPrecio}
														onChange={(e) =>
															setCustomPrecio(Number(e.target.value))
														}
														className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-ring focus:outline-none"
													/>
												</div>
											</div>
											<button
												type="submit"
												className="w-full rounded-lg border border-border bg-secondary hover:bg-secondary/70 py-2 text-xs font-semibold text-foreground transition-colors cursor-pointer"
											>
												Insertar Concepto
											</button>
										</form>
									</div>
								</div>
							</div>

							{/* ROW 2: Creator Pane 3: Items list, Total & Actions (Full width invoice-like view) */}
							<div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4 w-full">
								<h2 className="text-base font-bold text-foreground flex items-center gap-2 pb-2 border-b border-border">
									<FileText className="h-5 w-5 text-muted-foreground" />
									3. Resumen y Desglose de la Cotización
								</h2>

								<div className="border border-border rounded-lg overflow-hidden">
									<table className="w-full text-left text-xs border-collapse">
										<thead>
											<tr className="bg-secondary/50 text-foreground font-semibold border-b border-border">
												<th className="py-2.5 px-3">
													Descripción de Stickers / Vinilos
												</th>
												<th className="py-2.5 px-3 text-center w-24">
													Cantidad
												</th>
												<th className="py-2.5 px-3 text-right w-32">
													Precio Unit.
												</th>
												<th className="py-2.5 px-3 text-right w-32">
													Subtotal
												</th>
												<th className="py-2.5 px-3 text-center w-16">
													Eliminar
												</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-border text-foreground">
											{items.map((item, idx) => (
												<tr
													// biome-ignore lint/suspicious/noArrayIndexKey: formulario de ítems controlado por índice
													key={idx}
													className="hover:bg-secondary/10"
												>
													<td className="py-2.5 px-3 font-medium">
														{item.descripcion}
													</td>
													<td className="py-2.5 px-3 text-center">
														{item.cantidad}
													</td>
													<td className="py-2.5 px-3 text-right">
														${item.precioUnitario.toLocaleString("en-US")}
													</td>
													<td className="py-2.5 px-3 text-right font-semibold">
														$
														{(
															item.cantidad * item.precioUnitario
														).toLocaleString("en-US")}
													</td>
													<td className="py-2.5 px-3 text-center">
														<button
															type="button"
															onClick={() =>
																handleDeleteItem(idx, item.descripcion)
															}
															className="text-destructive hover:bg-destructive/10 p-1.5 rounded transition-colors"
															title="Eliminar ítem"
														>
															<Trash2 className="h-4 w-4" />
														</button>
													</td>
												</tr>
											))}
											{items.length === 0 && (
												<tr>
													<td
														colSpan={5}
														className="text-center py-12 text-muted-foreground"
													>
														<div className="flex flex-col items-center gap-1.5">
															<AlertCircle className="h-6 w-6 opacity-35" />
															<span>
																No hay stickers o servicios agregados al
																presupuesto.
															</span>
														</div>
													</td>
												</tr>
											)}
										</tbody>
									</table>
								</div>

								<div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-border">
									<span className="text-xs text-muted-foreground italic">
										* Los precios pueden ser ajustados antes de guardar la
										cotización.
									</span>
									<div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto justify-end">
										<div className="flex items-baseline gap-2">
											<span className="text-sm font-bold text-muted-foreground uppercase">
												Total Estimado:
											</span>
											<span className="text-2xl font-black text-foreground">
												${quoteTotal.toLocaleString("en-US")} USD
											</span>
										</div>
										<button
											type="button"
											onClick={handleSaveQuote}
											className="w-full sm:w-auto rounded-lg bg-primary text-primary-foreground hover:opacity-95 px-6 py-2.5 text-sm font-semibold shadow-sm transition-colors cursor-pointer"
										>
											Guardar Cotización
										</button>
									</div>
								</div>
							</div>
						</div>
					);
				}
			})()}

			{/* CONFIRMATION & SUCCESS FEEDBACK OVERLAYS */}
			<SuccessDialog
				isOpen={alertConfig.isOpen}
				onClose={() => setAlertConfig((prev) => ({ ...prev, isOpen: false }))}
				title={alertConfig.title}
				message={alertConfig.message}
				type={alertConfig.type}
				onConfirm={alertConfig.onConfirm}
				confirmText={alertConfig.onConfirm ? "Aceptar" : "Entendido"}
			/>
		</div>
	);
};
