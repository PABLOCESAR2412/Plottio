import { useMutation, useQuery } from "convex/react";
import {
	AlertCircle,
	Car,
	Check,
	CheckSquare,
	ChevronRight,
	ClipboardCheck,
	Copy,
	FileText,
	Image as ImageIcon,
	Plus,
	Search,
	Square,
	Trash2,
} from "lucide-react";
import type React from "react";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useSessionStore } from "../store/useSessionStore";
import { TableSkeleton } from "./Skeleton";
import { SuccessDialog } from "./SuccessDialog";

interface OrdenesTrabajoViewProps {
	preselectedOrderId?: string | null;
	clearPreselectedOrder?: () => void;
}

type LocalVehiculo = {
	_id: string;
	placa: string;
	categoria: string;
	marca: string;
	modelo: string;
	año: string;
	anio: string;
	numeroSerie: string;
};

interface ItemOrdenTrabajo {
	descripcion: string;
	cantidad: number;
	precioUnitario: number;
	completado: boolean;
}

interface OrdenTrabajo {
	_id: string;
	clienteNombre: string;
	clienteTelefono: string;
	placa: string;
	vehiculoTipo: string;
	items: ItemOrdenTrabajo[];
	total: number;
	prioridad: "Alta" | "Media" | "Baja";
	progreso: number;
	estado: "Pendiente" | "En Proceso" | "Listo" | "Entregado" | "Cancelado";
	fechaInicio: string;
	fechaFin: string;
	notas?: string[];
	fotos?: string[];
	sucursalId?: string;
	pvId?: string;
}

export const OrdenesTrabajoView: React.FC<OrdenesTrabajoViewProps> = ({
	preselectedOrderId,
	clearPreselectedOrder,
}) => {
	const currentUser = useSessionStore((s) => s.currentUser);
	const usuarioId = currentUser?.id;

	// ── QUERIES ──────────────────────────────────────────────────────────────
	const ordenesTrabajo = useQuery(
		api.ordenes.fetchOrdenes,
		currentUser ? { usuarioId: currentUser.id as Id<"usuarios"> } : "skip",
	);
	const rawClientes = useQuery(
		api.clientes.fetchClientes,
		usuarioId ? { usuarioId: usuarioId as Id<"usuarios"> } : "skip",
	) as any[] | undefined;
	const rawEmpresas = useQuery(api.organizacion.getEmpresas, {}) as
		| any[]
		| undefined;
	const rawVehiculos = useQuery(
		api.vehiculos.fetchVehiculos,
		usuarioId ? { usuarioId: usuarioId as Id<"usuarios"> } : "skip",
	) as Array<LocalVehiculo & { _id: string }> | undefined;
	const rawCategorias = useQuery(
		api.plantillas.getCategorias,
		usuarioId ? { usuarioId: usuarioId as Id<"usuarios"> } : "skip",
	) as Array<{ _id: string; nombre: string }> | undefined;
	const rawCatalogo = useQuery(
		api.catalogoServicios.getServicios,
		usuarioId ? { usuarioId: usuarioId as Id<"usuarios"> } : "skip",
	) as
		| Array<{ _id: string; nombre: string; categoria: string; precio: number }>
		| undefined;

	// ── MUTATIONS ────────────────────────────────────────────────────────────
	const createOrdenMut = useMutation(api.ordenes.createOrdenTrabajo);
	const updateOrdenMut = useMutation(api.ordenes.updateOrdenTrabajo);
	const deleteOrdenMut = useMutation(api.ordenes.deleteOrdenTrabajo);
	const generateUploadUrlMut = useMutation(
		api.organizacion.generateLogoUploadUrl,
	);
	const addFotoMut = useMutation(api.ordenes.addFoto);
	const toggleItemMut = useMutation(
		api.ordenes.toggleItemCompletado,
	).withOptimisticUpdate((localStore, args) => {
		const current = localStore.getQuery(api.ordenes.fetchOrdenes, {
			usuarioId: args.usuarioId,
		});
		if (current === undefined) return;
		const updated = current.map((orden) => {
			if (orden._id !== args.ordenId) return orden;
			const items = orden.items.map((item, idx) =>
				idx === args.itemIndex
					? { ...item, completado: args.completado }
					: item,
			);
			const total = items.reduce(
				(acc, item) => acc + item.cantidad * item.precioUnitario,
				0,
			);
			const progreso =
				items.length > 0
					? Math.round(
							(items.filter((i) => i.completado).length / items.length) * 100,
						)
					: 0;
			return { ...orden, items, total, progreso };
		});
		localStore.setQuery(
			api.ordenes.fetchOrdenes,
			{ usuarioId: args.usuarioId },
			updated,
		);
	});

	const clientes: any[] = useMemo(
		() =>
			(rawClientes ?? []).map((c) => ({
				id: c._id,
				nombre: c.nombre ?? "",
				telefono: c.telefono ?? "",
				email: c.email ?? "",
				empresaId: c.empresaId ?? null,
				direccion: c.direccion,
			})),
		[rawClientes],
	);

	const empresas: any[] = useMemo(
		() =>
			(rawEmpresas ?? []).map((e) => ({
				id: e._id,
				nombre: e.nombre ?? "",
				ruc: e.ruc ?? "",
				direccion: e.direccion,
			})),
		[rawEmpresas],
	);

	const vehiculos: any[] = useMemo(
		() =>
			(rawVehiculos ?? []).map((v) => ({
				id: v._id,
				placa: v.placa ?? "",
				categoria: v.categoria ?? "",
				marca: v.marca ?? "",
				modelo: v.modelo ?? "",
				año: v.anio ?? "",
				anio: v.anio ?? "",
				numeroSerie: v.numeroSerie ?? "",
			})),
		[rawVehiculos],
	);

	const categoriasPrecios: string[] = useMemo(
		() => (rawCategorias ?? []).map((c) => c.nombre),
		[rawCategorias],
	);

	const catalogoServicios = rawCatalogo ?? [];

	const [searchTerm, setSearchTerm] = useState("");
	const deferredSearchTerm = useDeferredValue(searchTerm);
	const [selectedStatusTab, setSelectedStatusTab] = useState<
		"Todos" | "Pendiente" | "En Proceso" | "Listo" | "Entregado" | "Cancelado"
	>("Todos");

	const [selectedOrderId, setSelectedOrderId] = useState<string | null>(
		ordenesTrabajo && ordenesTrabajo.length > 0 ? ordenesTrabajo[0]._id : null,
	);

	// Modals
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

	// Clipboard animation state
	const [copiedInvoice, setCopiedInvoice] = useState(false);

	// Success dialog config
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

	// New Order Form States
	const [clienteNombre, setClienteNombre] = useState("");
	const [clienteTelefono, setClienteTelefono] = useState("");
	const [placa, setPlaca] = useState("");
	const [vehiculoTipo, setVehiculoTipo] = useState<string>(
		categoriasPrecios[0] || "Bus Urbano",
	);
	const [prioridad, setPrioridad] = useState<"Alta" | "Media" | "Baja">(
		"Media",
	);
	const [fechaFin, setFechaFin] = useState(
		new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
	);

	// Order items form states
	const [orderItems, setOrderItems] = useState<ItemOrdenTrabajo[]>([]);
	const [itemDesc, setItemDesc] = useState("");
	const [itemCant, setItemCant] = useState(1);
	const [itemPrecio, setItemPrecio] = useState(0);

	// Timeline note state
	const [newNote, setNewNote] = useState("");
	const [showTimeline, setShowTimeline] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [isUploading, setIsUploading] = useState(false);

	// Filter orders
	const filteredOrders = (ordenesTrabajo ?? []).filter((o) => {
		// SaaS Multi-tenant filtering
		if (
			o.sucursalId &&
			currentUser?.sucursalId &&
			o.sucursalId !== currentUser.sucursalId
		)
			return false;
		if (currentUser?.pvId && o.pvOrigen && o.pvOrigen !== currentUser.pvId)
			return false;

		const matchesSearch =
			o._id.toLowerCase().includes(deferredSearchTerm.toLowerCase()) ||
			o.clienteNombre
				.toLowerCase()
				.includes(deferredSearchTerm.toLowerCase()) ||
			o.placa.toLowerCase().includes(deferredSearchTerm.toLowerCase());

		const matchesStatus =
			selectedStatusTab === "Todos" || o.estado === selectedStatusTab;

		return matchesSearch && matchesStatus;
	});

	const activeOrderId = filteredOrders.find((o) => o._id === selectedOrderId)
		? selectedOrderId
		: filteredOrders.length > 0
			? filteredOrders[0]._id
			: null;

	const selectedOrder = (ordenesTrabajo ?? []).find(
		(o) => o._id === activeOrderId,
	);

	// Edit states for selected order
	const [editPlaca, setEditPlaca] = useState("");
	const [editPrioridad, setEditPrioridad] = useState<"Alta" | "Media" | "Baja">(
		"Media",
	);
	const [editFechaFin, setEditFechaFin] = useState("");

	// Lock flag: lists Listo, Entregado, Cancelado as locked
	const isLocked = selectedOrder
		? selectedOrder.estado === "Listo" ||
			selectedOrder.estado === "Entregado" ||
			selectedOrder.estado === "Cancelado"
		: false;

	useEffect(() => {
		if (selectedOrder) {
			setEditPlaca(selectedOrder.placa);
			setEditPrioridad(selectedOrder.prioridad as "Alta" | "Media" | "Baja");
			setEditFechaFin(selectedOrder.fechaFin);
		}
	}, [
		selectedOrder?._id,
		selectedOrder?.fechaFin,
		selectedOrder?.placa,
		selectedOrder,
	]);

	const handleSaveOrderChanges = async () => {
		if (!selectedOrder || isLocked || !usuarioId) return;
		try {
			await updateOrdenMut({
				usuarioId: usuarioId as Id<"usuarios">,
				ordenId: selectedOrder._id as Id<"ordenesTrabajo">,
				placa: editPlaca.trim().toUpperCase(),
				prioridad: editPrioridad,
				fechaFin: editFechaFin,
				notas: [
					...(selectedOrder.notas || []),
					"Se actualizaron los datos principales de la orden.",
				],
			});
			setAlertConfig({
				isOpen: true,
				title: "Cambios Guardados",
				message:
					"Los cambios a las especificaciones se guardaron correctamente.",
				type: "success",
			});
		} catch (err) {
			setAlertConfig({
				isOpen: true,
				title: "Error al guardar",
				message: err instanceof Error ? err.message : "Error desconocido",
				type: "alert",
			});
		}
	};

	// Handle redirection and auto-selection of work order
	useEffect(() => {
		if (preselectedOrderId) {
			setSelectedOrderId(preselectedOrderId);
			setSelectedStatusTab("Todos"); // Clear any status filter to make sure it's visible
			if (clearPreselectedOrder) {
				clearPreselectedOrder();
			}
		}
	}, [preselectedOrderId, clearPreselectedOrder]);

	// 1. Load prefilled sessionStorage from vehicle flow
	useEffect(() => {
		if (typeof window !== "undefined") {
			const pPlaca = sessionStorage.getItem("prefilled_placa");
			const pCliente = sessionStorage.getItem("prefilled_clienteNombre");
			const pTelefono = sessionStorage.getItem("prefilled_clienteTelefono");
			const pVehTipo = sessionStorage.getItem("prefilled_vehiculoTipo");

			if (pPlaca || pCliente || pTelefono || pVehTipo) {
				// Automatically open the creation modal and prefill it
				setPlaca(pPlaca || "");
				setClienteNombre(pCliente || "");
				setClienteTelefono(pTelefono || "");
				if (pVehTipo) {
					setVehiculoTipo(pVehTipo);
				}

				// Clean up sessionStorage
				sessionStorage.removeItem("prefilled_placa");
				sessionStorage.removeItem("prefilled_clienteNombre");
				sessionStorage.removeItem("prefilled_clienteTelefono");
				sessionStorage.removeItem("prefilled_vehiculoTipo");

				setIsCreateOpen(true);

				setAlertConfig({
					isOpen: true,
					title: "Orden Pre-cargada",
					message:
						"Se autocompletaron los datos del vehículo para la orden de trabajo.",
					type: "success",
				});
			}
		}
	}, []);

	// Sync category if deleted
	useEffect(() => {
		if (
			categoriasPrecios.length > 0 &&
			!categoriasPrecios.includes(vehiculoTipo)
		) {
			setVehiculoTipo(categoriasPrecios[0]);
		}
	}, [categoriasPrecios, vehiculoTipo]);

	const handleOpenCreate = () => {
		setClienteNombre("");
		setClienteTelefono("");
		setPlaca("");
		setVehiculoTipo(categoriasPrecios[0] || "Bus Urbano");
		setPrioridad("Media");
		setFechaFin(
			new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
				.toISOString()
				.split("T")[0],
		);
		setOrderItems([]);
		setIsCreateOpen(true);
	};

	const handleAddItemToForm = (e: React.FormEvent) => {
		e.preventDefault();
		if (!itemDesc.trim() || itemCant <= 0) return;

		setOrderItems((prev) => [
			...prev,
			{
				descripcion: itemDesc.trim(),
				cantidad: Number(itemCant),
				precioUnitario: Number(itemPrecio),
				completado: false,
			},
		]);

		setItemDesc("");
		setItemCant(1);
		setItemPrecio(0);
	};

	const handleRemoveItemFromForm = (idx: number) => {
		setOrderItems((prev) => prev.filter((_, i) => i !== idx));
	};

	const handleCreateOrder = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!clienteNombre.trim() || orderItems.length === 0 || !usuarioId) return;

		try {
			const newOrd = (await createOrdenMut({
				usuarioId: usuarioId as Id<"usuarios">,
				clienteNombre: clienteNombre.trim(),
				clienteTelefono: clienteTelefono.trim(),
				placa: placa.trim().toUpperCase() || "S/P",
				vehiculoTipo,
				items: orderItems,
				prioridad,
				estado: "Pendiente" as const,
				fechaInicio: new Date().toISOString().split("T")[0],
				fechaFin: fechaFin,
				notas: ["Orden de trabajo iniciada."],
				fotos: [],
				sucursalId: currentUser?.sucursalId
					? (currentUser.sucursalId as Id<"sucursales">)
					: undefined,
				pvOrigen: currentUser?.pvId ?? undefined,
			})) as unknown as { _id: string };

			setIsCreateOpen(false);
			setSelectedOrderId(newOrd._id);

			setAlertConfig({
				isOpen: true,
				title: "Orden Iniciada",
				message: `La orden de trabajo "${newOrd._id}" ha sido creada exitosamente.`,
				type: "success",
			});
		} catch (err) {
			setAlertConfig({
				isOpen: true,
				title: "Error al iniciar la orden",
				message: err instanceof Error ? err.message : "Error desconocido",
				type: "alert",
			});
		}
	};

	// Realtime Checkbox toggle for subtasks
	const handleToggleTask = async (itemIdx: number) => {
		if (!selectedOrder || isLocked || !usuarioId) return;
		const item = selectedOrder.items[itemIdx];
		if (!item) return;
		try {
			await toggleItemMut({
				usuarioId: usuarioId as Id<"usuarios">,
				ordenId: selectedOrder._id as Id<"ordenesTrabajo">,
				itemIndex: itemIdx,
				completado: !item.completado,
			});
		} catch (err) {
			setAlertConfig({
				isOpen: true,
				title: "Error al actualizar",
				message: err instanceof Error ? err.message : "Error desconocido",
				type: "alert",
			});
		}
	};

	// Status changes from drop-down
	const handleStatusChange = async (
		newStatus: "Pendiente" | "En Proceso" | "Listo" | "Entregado" | "Cancelado",
	) => {
		if (!selectedOrder || !usuarioId) return;
		try {
			await updateOrdenMut({
				usuarioId: usuarioId as Id<"usuarios">,
				ordenId: selectedOrder._id as Id<"ordenesTrabajo">,
				estado: newStatus,
				notas: [
					...(selectedOrder.notas || []),
					`Estado cambiado a: ${newStatus}.`,
				],
			});
		} catch (err) {
			setAlertConfig({
				isOpen: true,
				title: "Error al cambiar estado",
				message: err instanceof Error ? err.message : "Error desconocido",
				type: "alert",
			});
		}
	};

	const handleDeleteOrderClick = (ord: { _id: string }) => {
		setAlertConfig({
			isOpen: true,
			title: "¿Eliminar Orden de Trabajo?",
			message: `¿Estás seguro de que deseas eliminar la orden "${ord._id}"? Esta acción removerá el registro del panel de control permanentemente.`,
			type: "delete",
			onConfirm: async () => {
				if (!usuarioId) return;
				try {
					await deleteOrdenMut({
						usuarioId: usuarioId as Id<"usuarios">,
						ordenId: ord._id as Id<"ordenesTrabajo">,
					});
					const remaining = (ordenesTrabajo ?? []).filter(
						(o) => o._id !== ord._id,
					);
					setSelectedOrderId(remaining.length > 0 ? remaining[0]._id : null);
					setAlertConfig({
						isOpen: true,
						title: "Orden Eliminada",
						message: "La orden fue removida del historial.",
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

	// Timeline: Add custom text notes
	const handleAddNote = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedOrder || !newNote.trim() || !usuarioId) return;
		try {
			await updateOrdenMut({
				usuarioId: usuarioId as Id<"usuarios">,
				ordenId: selectedOrder._id as Id<"ordenesTrabajo">,
				notas: [...(selectedOrder.notas || []), newNote.trim()],
			});
			setNewNote("");
		} catch (err) {
			setAlertConfig({
				isOpen: true,
				title: "Error al añadir nota",
				message: err instanceof Error ? err.message : "Error desconocido",
				type: "alert",
			});
		}
	};

	// Timeline: Photo upload
	const handleAddPhoto = () => {
		if (!selectedOrder || !usuarioId || isLocked) return;
		fileInputRef.current?.click();
	};

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file || !selectedOrder || !usuarioId) return;

		setIsUploading(true);
		try {
			// Convert image to webp using an off-screen canvas to compress
			const bitmap = await createImageBitmap(file);
			const canvas = document.createElement("canvas");
			// Optional: resize image if too large (max 1920x1080)
			let width = bitmap.width;
			let height = bitmap.height;
			const MAX_WIDTH = 1920;
			const MAX_HEIGHT = 1080;
			if (width > height) {
				if (width > MAX_WIDTH) {
					height *= MAX_WIDTH / width;
					width = MAX_WIDTH;
				}
			} else {
				if (height > MAX_HEIGHT) {
					width *= MAX_HEIGHT / height;
					height = MAX_HEIGHT;
				}
			}
			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext("2d");
			if (!ctx) throw new Error("Could not get canvas context");
			ctx.drawImage(bitmap, 0, 0, width, height);

			const blob = await new Promise<Blob>((resolve, reject) => {
				canvas.toBlob(
					(b) => {
						if (b) resolve(b);
						else reject(new Error("Failed to convert image to WebP"));
					},
					"image/webp",
					0.8,
				);
			});

			const uploadUrl = await generateUploadUrlMut();
			const response = await fetch(uploadUrl, {
				method: "POST",
				headers: { "Content-Type": "image/webp" },
				body: blob,
			});

			if (!response.ok) throw new Error("Error al subir archivo a Convex");
			const { storageId } = await response.json();

			await addFotoMut({
				usuarioId: usuarioId as Id<"usuarios">,
				ordenId: selectedOrder._id as Id<"ordenesTrabajo">,
				storageId: storageId as Id<"_storage">,
			});

			setAlertConfig({
				isOpen: true,
				title: "Imagen Registrada",
				message: "Se cargó una foto de instalación en el timeline de la orden.",
				type: "success",
			});
		} catch (err) {
			setAlertConfig({
				isOpen: true,
				title: "Error al subir foto",
				message: err instanceof Error ? err.message : "Error desconocido",
				type: "alert",
			});
		} finally {
			setIsUploading(false);
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		}
	};

	// INVOICE COPY HANDLER
	const handleCopyInvoiceToClipboard = () => {
		if (!selectedOrder) return;

		// Look for RUC if the customer belongs to a fleet
		const matchedClient = clientes.find(
			(c) =>
				c.nombre.toLowerCase().trim() ===
				selectedOrder.clienteNombre.toLowerCase().trim(),
		);
		const matchedEmp = matchedClient?.empresaId
			? empresas.find((e) => e.id === matchedClient.empresaId)
			: null;

		// Address resolution
		const address =
			matchedClient?.direccion || matchedEmp?.direccion || "No especificada";

		// Detailed service breakdown
		const serviceBreakdown = selectedOrder.items
			.map(
				(it) =>
					`- ${it.descripcion} x${it.cantidad} [${it.completado ? "COMPLETADO" : "PENDIENTE"}]`,
			)
			.join("\n");

		const billingData = `=== DATOS PARA LA FACTURA ===
Cliente: ${selectedOrder.clienteNombre}
Teléfono: ${selectedOrder.clienteTelefono}
Dirección: ${address}
RUC/CI: ${matchedEmp ? matchedEmp.ruc : "17XXXXXXXX001 (Particular)"}
Vehículo: ${selectedOrder.vehiculoTipo} (${selectedOrder.placa})
Detalle de trabajo realizado:
${serviceBreakdown}
Total USD: ${selectedOrder.total.toFixed(2)}
Fecha de Emisión: ${selectedOrder.fechaInicio}
=============================`;

		navigator.clipboard.writeText(billingData);
		setCopiedInvoice(true);
		setTimeout(() => setCopiedInvoice(false), 2000);
	};

	if (ordenesTrabajo === undefined) return <TableSkeleton />;

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight text-foreground">
						Órdenes de Trabajo
					</h1>
					<p className="text-muted-foreground">
						Monitorea el progreso de stickers y rotulado de vehículos en el
						taller.
					</p>
				</div>
				<button
					type="button"
					onClick={handleOpenCreate}
					className="flex items-center gap-2 rounded-lg bg-primary px-4 py-3 sm:py-2.5 text-[16px] sm:text-sm font-medium text-primary-foreground shadow hover:opacity-90 transition-colors w-full sm:w-auto justify-center"
				>
					<Plus className="h-4 w-4" />
					Nueva Orden de Trabajo
				</button>
			</div>

			{/* Filter status tabs */}
			<div className="flex flex-wrap gap-1.5 border-b border-border pb-1">
				{(
					[
						"Todos",
						"Pendiente",
						"En Proceso",
						"Listo",
						"Entregado",
						"Cancelado",
					] as const
				).map((st) => (
					<button
						type="button"
						key={st}
						onClick={() => setSelectedStatusTab(st)}
						className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
							selectedStatusTab === st
								? "bg-primary text-primary-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground hover:border-border"
						}`}
					>
						{st}
					</button>
				))}
			</div>

			{/* Split grid */}
			<div className="grid gap-4 lg:gap-6 grid-cols-1 lg:grid-cols-3">
				{/* Left Col: list of orders */}
				<div className="lg:col-span-1 rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col gap-4">
					<div className="relative">
						<Search className="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
						<input
							type="text"
							placeholder="Buscar por ID, placa o cliente..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground focus:border-ring focus:outline-none"
						/>
					</div>

					<div className="divide-y divide-border overflow-y-auto max-h-[500px] pr-1">
						{filteredOrders.map((ord) => (
							<button
								type="button"
								key={ord._id}
								onClick={() => setSelectedOrderId(ord._id)}
								className={`w-full flex items-center justify-between py-3 px-3 rounded-lg text-left transition-colors my-1 ${
									selectedOrderId === ord._id
										? "bg-primary text-primary-foreground shadow-sm"
										: "hover:bg-secondary"
								}`}
							>
								<div className="truncate pr-2">
									<div className="font-bold text-sm flex items-center gap-1.5">
										<span>{`${ord._id.substring(0, 4)}...`}</span>
										<span
											className={`text-[10px] px-1 py-0.2 rounded font-mono ${
												selectedOrderId === ord._id
													? "bg-primary-foreground/15 text-primary-foreground"
													: "bg-secondary/60 text-foreground"
											}`}
										>
											{ord.placa}
										</span>
									</div>
									<div
										className={`text-xs truncate ${selectedOrderId === ord._id ? "text-primary-foreground/80" : "text-muted-foreground"}`}
									>
										Prop: {ord.clienteNombre}
									</div>
									<div className="mt-1.5 flex items-center gap-2">
										<span
											className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
												ord.prioridad === "Alta"
													? "bg-destructive/10 text-destructive"
													: selectedOrderId === ord._id
														? "bg-primary-foreground/15 text-primary-foreground"
														: "bg-secondary text-foreground"
											}`}
										>
											{ord.prioridad}
										</span>
										<span className="text-[10px] font-medium opacity-80">
											{ord.progreso}%
										</span>
									</div>
								</div>
								<ChevronRight className="h-4 w-4 opacity-50 shrink-0" />
							</button>
						))}
						{filteredOrders.length === 0 && (
							<div className="text-center py-8 text-muted-foreground text-sm">
								No se encontraron órdenes.
							</div>
						)}
					</div>
				</div>

				{/* Right Col: Details workspace */}
				<div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-sm">
					{isCreateOpen ? (
						<div className="animate-fade-in space-y-6">
							<h3 className="text-lg font-bold text-foreground mb-4">
								Nueva Orden de Trabajo
							</h3>

							<div className="grid gap-4 sm:grid-cols-2 max-h-[450px] overflow-y-auto pr-1">
								{/* Client and parameters */}
								<div className="space-y-4">
									<div>
										<label
											htmlFor="ot-clienteNombre"
											className="block text-xs font-semibold text-muted-foreground mb-1"
										>
											Cliente *
										</label>
										<input
											id="ot-clienteNombre"
											type="text"
											required
											value={clienteNombre}
											onChange={(e) => {
												setClienteNombre(e.target.value);
												const matched = clientes.find(
													(c) =>
														c.nombre.toLowerCase() ===
														e.target.value.toLowerCase(),
												);
												if (matched) setClienteTelefono(matched.telefono);
											}}
											className="w-full rounded-lg border border-border bg-background px-3 py-3 sm:py-2 text-[16px] sm:text-sm text-foreground focus:border-ring focus:outline-none"
											placeholder="Búsqueda / Creación inteligente"
											list="ot-clientes-list"
										/>
										<datalist id="ot-clientes-list">
											{clientes.map((c) => (
												<option key={c.id} value={c.nombre} />
											))}
										</datalist>
									</div>

									<div>
										<label
											htmlFor="ot-clienteTelefono"
											className="block text-xs font-semibold text-muted-foreground mb-1"
										>
											Teléfono
										</label>
										<input
											id="ot-clienteTelefono"
											type="text"
											value={clienteTelefono}
											onChange={(e) => setClienteTelefono(e.target.value)}
											className="w-full rounded-lg border border-border bg-background px-3 py-3 sm:py-2 text-[16px] sm:text-sm text-foreground focus:border-ring focus:outline-none"
										/>
									</div>

									<div className="grid grid-cols-2 gap-3">
										<div>
											<label
												htmlFor="ot-placa"
												className="block text-xs font-semibold text-muted-foreground mb-1"
											>
												Placa *
											</label>
											<input
												id="ot-placa"
												type="text"
												required
												value={placa}
												onChange={(e) => setPlaca(e.target.value)}
												className="w-full rounded-lg border border-border bg-background px-3 py-3 sm:py-2 text-[16px] sm:text-sm text-foreground focus:border-ring focus:outline-none"
												placeholder="PBA-0000"
											/>
										</div>
										<div>
											<label
												htmlFor="ot-categoria"
												className="block text-xs font-semibold text-muted-foreground mb-1"
											>
												Categoría *
											</label>
											<select
												value={vehiculoTipo}
												id="ot-categoria"
												onChange={(e) => setVehiculoTipo(e.target.value)}
												className="w-full rounded-lg border border-border bg-background px-3 py-3 sm:py-2 text-[16px] sm:text-sm text-foreground focus:border-ring focus:outline-none"
											>
												{categoriasPrecios.map((cat) => (
													<option key={cat} value={cat}>
														{cat}
													</option>
												))}
											</select>
										</div>
									</div>

									<div className="grid grid-cols-2 gap-3">
										<div>
											<label
												htmlFor="ot-prioridad"
												className="block text-xs font-semibold text-muted-foreground mb-1"
											>
												Prioridad
											</label>
											<select
												value={prioridad}
												id="ot-prioridad"
												onChange={(e) =>
													setPrioridad(
														e.target.value as OrdenTrabajo["prioridad"],
													)
												}
												className="w-full rounded-lg border border-border bg-background px-3 py-3 sm:py-2 text-[16px] sm:text-sm text-foreground focus:border-ring focus:outline-none"
											>
												<option value="Baja">Baja</option>
												<option value="Media">Media</option>
												<option value="Alta">Alta</option>
											</select>
										</div>
										<div>
											<label
												htmlFor="ot-fechaFin"
												className="block text-xs font-semibold text-muted-foreground mb-1"
											>
												Fecha Entrega *
											</label>
											<input
												id="ot-fechaFin"
												type="date"
												required
												value={fechaFin}
												onChange={(e) => setFechaFin(e.target.value)}
												className="w-full rounded-lg border border-border bg-background px-3 py-3 sm:py-2 text-[16px] sm:text-sm text-foreground focus:border-ring focus:outline-none"
											/>
										</div>
									</div>
								</div>

								{/* Items builder */}
								<div className="space-y-4">
									<div className="border border-border rounded-lg p-3 bg-secondary/5">
										<h4 className="text-xs font-bold text-foreground mb-2">
											Añadir Stickers / Servicios
										</h4>
										<form onSubmit={handleAddItemToForm} className="space-y-2">
											<input
												type="text"
												placeholder="Ej. Visera de parabrisas publicitaria"
												value={itemDesc}
												onChange={(e) => setItemDesc(e.target.value)}
												className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
											/>
											<div className="grid grid-cols-2 gap-2">
												<input
													type="number"
													min="1"
													placeholder="Cant"
													value={itemCant}
													onChange={(e) => setItemCant(Number(e.target.value))}
													className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
												/>
												<input
													type="number"
													min="0"
													placeholder="Precio unitario ($)"
													value={itemPrecio}
													onChange={(e) =>
														setItemPrecio(Number(e.target.value))
													}
													className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
												/>
											</div>
											<button
												type="submit"
												className="w-full rounded bg-primary py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
											>
												Insertar Item
											</button>
										</form>
									</div>

									{/* Items preview list */}
									<div className="max-h-[140px] overflow-y-auto divide-y divide-border pr-1">
										{orderItems.map((it, idx) => (
											<div
												// biome-ignore lint/suspicious/noArrayIndexKey: filas de formulario controladas por índice
												key={idx}
												className="flex justify-between items-center py-1.5 text-xs"
											>
												<div className="truncate">
													<div className="font-semibold text-foreground truncate">
														{it.descripcion}
													</div>
													<div className="text-muted-foreground text-[10px]">
														{it.cantidad} x ${it.precioUnitario}
													</div>
												</div>
												<button
													type="button"
													onClick={() => handleRemoveItemFromForm(idx)}
													className="text-destructive hover:bg-destructive/10 p-1 rounded"
												>
													<Trash2 className="h-3.5 w-3.5" />
												</button>
											</div>
										))}
										{orderItems.length === 0 && (
											<div className="text-center py-6 text-muted-foreground text-xs">
												Agrega al menos una tarea a la orden de trabajo.
											</div>
										)}
									</div>
								</div>
							</div>

							<div className="flex gap-3 justify-end pt-4 border-t border-border mt-4">
								<button
									type="button"
									onClick={() => setIsCreateOpen(false)}
									className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
								>
									Cancelar
								</button>
								<button
									type="button"
									disabled={!clienteNombre.trim() || orderItems.length === 0}
									onClick={handleCreateOrder}
									className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-colors disabled:opacity-50"
								>
									Iniciar Trabajo
								</button>
							</div>
						</div>
					) : selectedOrder ? (
						<div className="space-y-6">
							{/* Lock Banner if Closed */}
							{isLocked && (
								<div className="rounded-lg border border-red-200 bg-red-50 text-red-700 p-3 text-xs font-bold flex items-center gap-2 animate-pulse select-none">
									<AlertCircle className="h-4 w-4 shrink-0" />
									<span>
										ORDEN CERRADA - HISTORIAL NO EDITABLE (Consistencia de
										Datos)
									</span>
								</div>
							)}

							{/* Header section with state controls */}
							<div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-border pb-4 gap-4">
								<div className="flex items-center gap-3">
									<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-foreground shrink-0">
										<ClipboardCheck className="h-6 w-6" />
									</div>
									<div>
										<div className="flex items-center gap-2 flex-wrap">
											<h2 className="text-lg font-black text-foreground flex items-center gap-2">
												<span>{`${selectedOrder._id.substring(0, 4)}...`}</span>
												<button
													onClick={() =>
														navigator.clipboard.writeText(selectedOrder._id)
													}
													className="p-1 rounded hover:bg-secondary/50 text-muted-foreground transition-colors cursor-pointer"
													title="Copiar ID completo"
												>
													<Copy className="h-4 w-4" />
												</button>
											</h2>
											<span
												className={`text-xs font-bold px-2 py-0.5 rounded-full ${
													selectedOrder.prioridad === "Alta"
														? "bg-destructive/15 text-destructive"
														: selectedOrder.prioridad === "Media"
															? "bg-yellow-500/15 text-yellow-500"
															: "bg-green-500/15 text-green-500"
												}`}
											>
												Prioridad {selectedOrder.prioridad}
											</span>
										</div>
										<p className="text-xs text-muted-foreground">
											Cliente:{" "}
											<strong className="text-foreground">
												{selectedOrder.clienteNombre}
											</strong>{" "}
											• Tlf: {selectedOrder.clienteTelefono}
										</p>
									</div>
								</div>

								<div className="flex flex-wrap gap-2 items-center">
									<button
										type="button"
										onClick={() => setIsInvoiceOpen(true)}
										className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
									>
										<FileText className="h-3.5 w-3.5" />
										Datos para Factura
									</button>

									<select
										value={selectedOrder.estado}
										onChange={(e) =>
											handleStatusChange(
												e.target.value as OrdenTrabajo["estado"],
											)
										}
										disabled={isLocked}
										className="rounded-lg border border-border bg-card px-2.5 py-2 text-xs font-semibold text-foreground focus:outline-none disabled:opacity-60"
									>
										<option value="Pendiente">Pendiente</option>
										<option value="En Proceso">En Proceso</option>
										<option value="Listo">Listo</option>
										<option value="Entregado">Entregado</option>
										<option value="Cancelado">Cancelado</option>
									</select>

									<button
										type="button"
										onClick={() => handleDeleteOrderClick(selectedOrder)}
										className="flex h-9 w-9 items-center justify-center rounded-lg border border-destructive/20 bg-card text-destructive hover:bg-destructive/10 transition-colors"
										title="Eliminar Orden"
									>
										<Trash2 className="h-4 w-4" />
									</button>
								</div>
							</div>

							{/* Progress and Realtime checklists */}
							<div className="flex flex-col gap-6">
								{/* Realtime checklist and task editor */}
								<div className="rounded-lg border border-border p-5 space-y-4">
									<h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
										Tareas y Stickers
									</h3>
									<div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
										{selectedOrder.items.map((it, idx) => (
											<div
												// biome-ignore lint/suspicious/noArrayIndexKey: lista de tareas controlada por índice
												key={idx}
												className="flex items-center gap-2 group"
											>
												<button
													type="button"
													onClick={() => handleToggleTask(idx)}
													className="flex-1 flex items-center justify-between p-2.5 rounded-lg border border-border bg-secondary/10 hover:bg-secondary/40 text-left transition-colors cursor-pointer"
												>
													<div className="flex items-center gap-2 truncate">
														{it.completado ? (
															<CheckSquare className="h-4 w-4 shrink-0 text-foreground" />
														) : (
															<Square className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
														)}
														<span
															className={`text-xs truncate ${it.completado ? "line-through text-muted-foreground" : "text-foreground font-medium"}`}
														>
															{it.descripcion}
														</span>
													</div>
													<div className="flex items-center gap-1.5 text-xs shrink-0 select-none">
														<span className="text-muted-foreground">
															${it.precioUnitario}
														</span>
														<span className="font-bold text-foreground">
															x{it.cantidad}
														</span>
													</div>
												</button>

												{!isLocked && (
													<button
														type="button"
														onClick={async () => {
															if (!selectedOrder || !usuarioId) return;
															const updatedItems = selectedOrder.items.filter(
																(_, i) => i !== idx,
															);
															try {
																await updateOrdenMut({
																	usuarioId: usuarioId as Id<"usuarios">,
																	ordenId:
																		selectedOrder._id as Id<"ordenesTrabajo">,
																	items: updatedItems,
																});
															} catch (err) {
																console.error(err);
															}
														}}
														className="text-destructive hover:bg-destructive/10 p-1.5 rounded transition-colors shrink-0"
														title="Eliminar tarea/sticker"
													>
														<Trash2 className="h-4 w-4" />
													</button>
												)}
											</div>
										))}
										{selectedOrder.items.length === 0 && (
											<div className="text-center py-6 text-muted-foreground text-xs">
												No hay tareas en esta orden.
											</div>
										)}
									</div>

									{!isLocked && (
										<form
											onSubmit={async (e) => {
												e.preventDefault();
												const form = e.currentTarget;
												const descInput = form.elements.namedItem(
													"taskDesc",
												) as HTMLInputElement;
												const cantInput = form.elements.namedItem(
													"taskCant",
												) as HTMLInputElement;
												const priceInput = form.elements.namedItem(
													"taskPrice",
												) as HTMLInputElement;

												const desc = descInput.value.trim();
												const cant = Number(cantInput.value) || 1;
												const price = Number(priceInput.value) || 0;

												if (!desc) return;

												const updatedItems = [
													...selectedOrder.items,
													{
														descripcion: desc,
														cantidad: cant,
														precioUnitario: price,
														completado: false,
													},
												];

												if (usuarioId) {
													try {
														await updateOrdenMut({
															usuarioId: usuarioId as Id<"usuarios">,
															ordenId:
																selectedOrder._id as Id<"ordenesTrabajo">,
															items: updatedItems,
														});
													} catch (err) {
														console.error(err);
													}
												}

												form.reset();
											}}
											className="border-t border-border pt-4 mt-3 space-y-2"
										>
											<div className="text-xs font-bold text-foreground">
												Añadir Tarea / Sticker:
											</div>
											<input
												type="text"
												name="taskDesc"
												required
												list="orden-servicios-list"
												onChange={(e) => {
													const val = e.target.value;
													const found = catalogoServicios.find(
														(s) => s.nombre === val,
													);
													if (found) {
														const priceInput =
															e.target.form?.elements.namedItem(
																"taskPrice",
															) as HTMLInputElement;
														if (priceInput && Number(priceInput.value) === 0) {
															const precio =
																(found as { precio?: number }).precio ??
																(found as { precioBase?: number }).precioBase ??
																0;
															priceInput.value = precio.toString();
														}
													}
												}}
												placeholder="Seleccione o escriba el servicio"
												className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-ring"
											/>
											<datalist id="orden-servicios-list">
												{catalogoServicios.map((s) => {
													const precio =
														(s as { precio?: number }).precio ??
														(s as { precioBase?: number }).precioBase ??
														0;
													return (
														<option key={s._id} value={s.nombre}>
															${precio} - {s.categoria}
														</option>
													);
												})}
											</datalist>
											<div className="grid grid-cols-2 gap-2">
												<div>
													<label
														htmlFor="taskCant"
														className="block text-[9px] text-muted-foreground mb-0.5"
													>
														Cantidad
													</label>
													<input
														type="number"
														name="taskCant"
														id="taskCant"
														min="1"
														defaultValue="1"
														className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-ring"
													/>
												</div>
												<div>
													<label
														htmlFor="taskPrice"
														className="block text-[9px] text-muted-foreground mb-0.5"
													>
														Precio Unit. ($)
													</label>
													<input
														type="number"
														name="taskPrice"
														id="taskPrice"
														min="0"
														defaultValue="0"
														className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-ring"
													/>
												</div>
											</div>
											<button
												type="submit"
												className="w-full py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded hover:opacity-90 transition-colors shadow-sm cursor-pointer"
											>
												Insertar Tarea
											</button>
										</form>
									)}
								</div>

								{/* Progress bar, vehicle specifications and editing card */}
								<div className="rounded-lg border border-border p-5 space-y-4 flex flex-col justify-between">
									<div className="space-y-4">
										<div>
											<h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-2">
												Progreso de la Orden
											</h3>
											<div className="space-y-2">
												<div className="flex justify-between items-baseline">
													<span className="text-2xl font-black text-foreground">
														{selectedOrder.progreso}%
													</span>
													<span className="text-xs text-muted-foreground font-semibold">
														Tareas completadas
													</span>
												</div>

												<div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden border border-border">
													<div
														className="bg-primary h-full rounded-full transition-all duration-300"
														style={{ width: `${selectedOrder.progreso}%` }}
													/>
												</div>
											</div>
										</div>

										{/* MATCHED VEHICLE DETAILS */}
										{(() => {
											const vehMatch = vehiculos.find(
												(v) =>
													v.placa.toUpperCase() ===
													selectedOrder.placa.toUpperCase(),
											);
											if (!vehMatch) return null;
											return (
												<div className="rounded-lg border border-border bg-secondary/10 p-3 text-xs space-y-1.5">
													<div className="font-bold text-foreground flex items-center gap-1.5">
														<Car className="h-3.5 w-3.5 text-primary" /> Datos
														del Vehículo
													</div>
													<div className="grid grid-cols-2 gap-1.5 text-muted-foreground">
														<div>
															<span className="font-semibold text-foreground">
																Marca:
															</span>{" "}
															{vehMatch.marca} {vehMatch.modelo}
														</div>
														<div>
															<span className="font-semibold text-foreground">
																Año:
															</span>{" "}
															{vehMatch.año}
														</div>
														<div>
															<span className="font-semibold text-foreground">
																Categoría:
															</span>{" "}
															{vehMatch.categoria}
														</div>
														<div className="truncate">
															<span className="font-semibold text-foreground">
																Chasis:
															</span>{" "}
															{vehMatch.numeroSerie}
														</div>
													</div>
												</div>
											);
										})()}

										{/* EDITABLE FIELDS */}
										<div className="border-t border-border pt-3.5 space-y-3">
											<div className="font-bold text-xs text-foreground">
												Editar Especificaciones
											</div>

											<div className="grid grid-cols-2 gap-3 text-xs">
												<div>
													<label
														htmlFor="editPlaca"
														className="block text-[10px] text-muted-foreground mb-0.5"
													>
														Placa
													</label>
													<input
														type="text"
														value={editPlaca}
														id="editPlaca"
														onChange={(e) => setEditPlaca(e.target.value)}
														disabled={isLocked}
														className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none disabled:opacity-60"
													/>
												</div>
												<div>
													<label
														htmlFor="editPrioridad"
														className="block text-[10px] text-muted-foreground mb-0.5"
													>
														Prioridad
													</label>
													<select
														value={editPrioridad}
														id="editPrioridad"
														onChange={(e) =>
															setEditPrioridad(
																e.target.value as OrdenTrabajo["prioridad"],
															)
														}
														disabled={isLocked}
														className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none disabled:opacity-60"
													>
														<option value="Baja">Baja</option>
														<option value="Media">Media</option>
														<option value="Alta">Alta</option>
													</select>
												</div>
											</div>

											<div className="grid grid-cols-2 gap-3 text-xs">
												<div>
													<label
														htmlFor="editFechaFin"
														className="block text-[10px] text-muted-foreground mb-0.5"
													>
														Fecha Entrega
													</label>
													<input
														type="date"
														value={editFechaFin}
														id="editFechaFin"
														onChange={(e) => setEditFechaFin(e.target.value)}
														disabled={isLocked}
														className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none disabled:opacity-60"
													/>
												</div>
												<div className="flex flex-col justify-end">
													<span className="text-[10px] text-muted-foreground">
														Total Presupuesto
													</span>
													<strong className="text-xs text-foreground mt-1">
														${selectedOrder.total} USD
													</strong>
												</div>
											</div>
										</div>
									</div>

									{!isLocked && (
										<button
											type="button"
											onClick={handleSaveOrderChanges}
											className="w-full py-2 bg-primary text-primary-foreground text-xs font-semibold rounded hover:opacity-90 transition-colors shadow-sm cursor-pointer mt-3"
										>
											Guardar Cambios
										</button>
									)}
								</div>
							</div>

							{/* Progress timeline logs, notes and photos */}
							<div className="border-t border-border pt-6 space-y-6">
								<div>
									<div className="flex items-center justify-between mb-3">
										<h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
											Línea de Tiempo y Fotos de Producción
										</h3>
										<button
											type="button"
											onClick={() => setShowTimeline(!showTimeline)}
											className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
										>
											{showTimeline
												? "Ocultar Línea de Tiempo"
												: "Mostrar Línea de Tiempo"}
										</button>
									</div>

									{showTimeline && (
										<>
											{/* Photo Gallery Grid */}
											<div className="grid gap-3 grid-cols-3 sm:grid-cols-4 mb-4">
												{selectedOrder.fotos.map((ph, idx) => (
													<div
														// biome-ignore lint/suspicious/noArrayIndexKey: galería de fotos estática
														key={idx}
														className="relative aspect-video rounded-lg overflow-hidden border border-border group bg-secondary"
													>
														<img
															src={ph}
															alt="Wrapping sticker installation process"
															className="object-cover w-full h-full"
														/>
													</div>
												))}

												{!isLocked && (
													<button
														type="button"
														onClick={handleAddPhoto}
														disabled={isUploading}
														className="aspect-video rounded-lg border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all gap-1 text-[10px] font-bold disabled:opacity-50"
													>
														<ImageIcon className="h-5 w-5 text-muted-foreground/60" />
														{isUploading ? "Subiendo..." : "Añadir Foto"}
													</button>
												)}
												<input
													type="file"
													ref={fileInputRef}
													hidden
													accept="image/*"
													onChange={handleFileChange}
												/>
											</div>

											{/* Notes Timeline */}
											<div className="space-y-3 bg-secondary/15 rounded-xl p-4 border border-border max-h-[160px] overflow-y-auto">
												{selectedOrder.notas.map((nt, idx) => (
													<div
														// biome-ignore lint/suspicious/noArrayIndexKey: lista de notas, las notas pueden repetirse
														key={idx}
														className="text-xs text-foreground flex gap-2"
													>
														<span className="text-muted-foreground select-none">
															•
														</span>
														<p>{nt}</p>
													</div>
												))}
											</div>
										</>
									)}
								</div>

								{/* Add notes to timeline form */}
								{showTimeline &&
									(isLocked ? (
										<p className="text-xs text-muted-foreground italic bg-secondary/10 p-2.5 rounded border border-border">
											Esta orden está cerrada. No se pueden añadir notas de
											bitácora.
										</p>
									) : (
										<form onSubmit={handleAddNote} className="flex gap-2">
											<input
												type="text"
												required
												placeholder="Escribe una actualización o nota en la bitácora..."
												value={newNote}
												onChange={(e) => setNewNote(e.target.value)}
												className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-ring focus:outline-none"
											/>
											<button
												type="submit"
												className="rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-colors"
											>
												Agregar Nota
											</button>
										</form>
									))}
							</div>
						</div>
					) : (
						<div className="text-center py-20 text-muted-foreground flex flex-col items-center gap-2 justify-center">
							<AlertCircle className="h-10 w-10 opacity-30 animate-pulse" />
							<span>
								Selecciona una orden de trabajo de la lista para verificar el
								progreso.
							</span>
						</div>
					)}
				</div>
			</div>

			{/* BILLING DATA MODAL ("Datos para la Factura") */}
			{isInvoiceOpen && selectedOrder && (
				<div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4">
					<button
						type="button"
						aria-label="Cerrar modal"
						className="fixed inset-0 bg-black/50 backdrop-blur-sm"
						onClick={() => setIsInvoiceOpen(false)}
					/>
					<div className="relative w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xl animate-slide-in mx-0 sm:mx-4">
						<div className="flex items-center justify-between pb-3 border-b border-border mb-4">
							<h3 className="text-base font-bold text-foreground flex items-center gap-2">
								<FileText className="h-5 w-5 text-muted-foreground" />
								Datos de Facturación ({selectedOrder._id})
							</h3>
							<button
								type="button"
								onClick={() => setIsInvoiceOpen(false)}
								className="text-muted-foreground hover:text-foreground text-sm font-bold"
							>
								Cerrar
							</button>
						</div>

						{/* Billing fields preview */}
						<div className="space-y-4 text-xs font-medium text-muted-foreground bg-secondary/20 p-4 rounded-xl border border-border max-h-[300px] overflow-y-auto">
							<div>
								<span className="text-[10px] font-semibold block uppercase">
									Nombre / Razón Social:
								</span>
								<span className="text-sm font-bold text-foreground">
									{selectedOrder.clienteNombre}
								</span>
							</div>
							<div>
								<span className="text-[10px] font-semibold block uppercase">
									RUC / Cédula:
								</span>
								<span className="text-sm font-mono font-bold text-foreground">
									{(() => {
										const matchedClient = clientes.find(
											(c) =>
												c.nombre.toLowerCase().trim() ===
												selectedOrder.clienteNombre.toLowerCase().trim(),
										);
										const matchedEmp = matchedClient?.empresaId
											? empresas.find((e) => e.id === matchedClient.empresaId)
											: null;
										return matchedEmp
											? matchedEmp.ruc
											: "1792345678001 (Consumidor Final)";
									})()}
								</span>
							</div>
							<div>
								<span className="text-[10px] font-semibold block uppercase">
									Teléfono:
								</span>
								<span className="text-sm font-bold text-foreground">
									{selectedOrder.clienteTelefono}
								</span>
							</div>
							<div>
								<span className="text-[10px] font-semibold block uppercase">
									Dirección:
								</span>
								<span className="text-sm font-bold text-foreground">
									{(() => {
										const matchedClient = clientes.find(
											(c) =>
												c.nombre.toLowerCase().trim() ===
												selectedOrder.clienteNombre.toLowerCase().trim(),
										);
										const matchedEmp = matchedClient?.empresaId
											? empresas.find((e) => e.id === matchedClient.empresaId)
											: null;
										return (
											matchedClient?.direccion ||
											matchedEmp?.direccion ||
											"No especificada"
										);
									})()}
								</span>
							</div>
							<div>
								<span className="text-[10px] font-semibold block uppercase">
									Detalle de Trabajo Realizado:
								</span>
								<div className="space-y-1 mt-1 text-foreground font-semibold">
									{selectedOrder.items.map((it, i) => (
										<div
											// biome-ignore lint/suspicious/noArrayIndexKey: vista estática de ítems
											key={i}
											className="flex justify-between items-center bg-card/45 px-2 py-1 rounded border border-border/40"
										>
											<span>
												{it.descripcion} x{it.cantidad}
											</span>
											<span
												className={`text-[9px] px-1 py-0.2 rounded ${it.completado ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500"}`}
											>
												{it.completado ? "Completado" : "Pendiente"}
											</span>
										</div>
									))}
								</div>
							</div>
							<div>
								<span className="text-[10px] font-semibold block uppercase">
									Total a Facturar:
								</span>
								<span className="text-sm font-bold text-foreground font-black">
									${selectedOrder.total.toFixed(2)} USD
								</span>
							</div>
							<div>
								<span className="text-[10px] font-semibold block uppercase">
									Fecha Emisión:
								</span>
								<span className="text-sm font-bold text-foreground">
									{selectedOrder.fechaInicio}
								</span>
							</div>
						</div>

						<div className="mt-6 flex gap-3">
							<button
								type="button"
								onClick={handleCopyInvoiceToClipboard}
								className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-all cursor-pointer"
							>
								{copiedInvoice ? (
									<>
										<Check className="h-4 w-4" />
										Copiado al Portapapeles
									</>
								) : (
									<>
										<Copy className="h-4 w-4" />
										Copiar Datos
									</>
								)}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* CONFIRMATION OR ALERT OVERLAYS */}
			<SuccessDialog
				isOpen={alertConfig.isOpen}
				onClose={() => setAlertConfig((prev) => ({ ...prev, isOpen: false }))}
				title={alertConfig.title}
				message={alertConfig.message}
				type={alertConfig.type}
				onConfirm={alertConfig.onConfirm}
				confirmText={alertConfig.onConfirm ? "Eliminar" : "Entendido"}
			/>
		</div>
	);
};
