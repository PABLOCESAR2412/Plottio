import {
	AlertCircle,
	Car,
	Check,
	CheckSquare,
	ClipboardCheck,
	Copy,
	ExternalLink,
	FileText,
	Image as ImageIcon,
	Maximize2,
	Square,
	Trash2,
	X,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import type {
	ClienteOption,
	EmpresaOption,
	OrdenTrabajo,
	VehiculoOption,
} from "./types";

export interface CatalogoServicioOption {
	_id: string;
	nombre: string;
	categoria: string;
	precio?: number;
	precioBase?: number;
}

export interface OrderDetailPanelProps {
	order: OrdenTrabajo | null;
	vehiculos: VehiculoOption[];
	clientes: ClienteOption[];
	empresas: EmpresaOption[];
	catalogoServicios: CatalogoServicioOption[];
	onToggleTask: (itemIndex: number) => Promise<void> | void;
	onAddTask: (task: {
		descripcion: string;
		cantidad: number;
		precioUnitario: number;
	}) => Promise<void> | void;
	onRemoveTask: (itemIndex: number) => Promise<void> | void;
	onStatusChange: (newStatus: OrdenTrabajo["estado"]) => Promise<void> | void;
	onDeleteOrder: (order: OrdenTrabajo) => void;
	onSaveSpecifications: (specs: {
		placa: string;
		prioridad: OrdenTrabajo["prioridad"];
		fechaFin: string;
	}) => Promise<void> | void;
	onAddNote: (note: string) => Promise<void> | void;
	onAddPhoto: (file: File) => Promise<void> | void;
	isUploadingPhoto?: boolean;
}

export const OrderDetailPanel: React.FC<OrderDetailPanelProps> = ({
	order,
	vehiculos,
	clientes,
	empresas,
	catalogoServicios,
	onToggleTask,
	onAddTask,
	onRemoveTask,
	onStatusChange,
	onDeleteOrder,
	onSaveSpecifications,
	onAddNote,
	onAddPhoto,
	isUploadingPhoto = false,
}) => {
	// Form inputs for specs editing
	const [editPlaca, setEditPlaca] = useState("");
	const [editPrioridad, setEditPrioridad] =
		useState<OrdenTrabajo["prioridad"]>("Media");
	const [editFechaFin, setEditFechaFin] = useState("");

	// Sub-states
	const [showTimeline, setShowTimeline] = useState(false);
	const [newNote, setNewNote] = useState("");
	const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
	const [copiedInvoice, setCopiedInvoice] = useState(false);
	const [previewImage, setPreviewImage] = useState<string | null>(null);

	// Add task inputs
	const [taskDesc, setTaskDesc] = useState("");
	const [taskCant, setTaskCant] = useState(1);
	const [taskPrice, setTaskPrice] = useState(0);

	const fileInputRef = useRef<HTMLInputElement>(null);

	// Sync editable specs when selected order changes
	useEffect(() => {
		if (order) {
			setEditPlaca(order.placa);
			setEditPrioridad(order.prioridad);
			setEditFechaFin(order.fechaFin);
		}
	}, [order]);

	if (!order) {
		return (
			<div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
				<AlertCircle className="h-10 w-10 opacity-30 animate-pulse" />
				<span>
					Selecciona una orden de trabajo de la lista para verificar el
					progreso.
				</span>
			</div>
		);
	}

	const isLocked =
		order.estado === "Listo" ||
		order.estado === "Entregado" ||
		order.estado === "Cancelado";

	const matchedVehicle = vehiculos.find(
		(v) => v.placa.toUpperCase() === order.placa.toUpperCase(),
	);

	const matchedClient = clientes.find(
		(c) =>
			c.nombre.toLowerCase().trim() ===
			order.clienteNombre.toLowerCase().trim(),
	);
	const matchedEmpresa = matchedClient?.empresaId
		? empresas.find((e) => e.id === matchedClient.empresaId)
		: null;
	const clientAddress =
		matchedClient?.direccion || matchedEmpresa?.direccion || "No especificada";

	const handleSaveSpecs = (e: React.FormEvent) => {
		e.preventDefault();
		if (isLocked) return;
		onSaveSpecifications({
			placa: editPlaca.trim().toUpperCase(),
			prioridad: editPrioridad,
			fechaFin: editFechaFin,
		});
	};

	const handleInsertTask = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!taskDesc.trim() || isLocked) return;
		await onAddTask({
			descripcion: taskDesc.trim(),
			cantidad: Number(taskCant) || 1,
			precioUnitario: Number(taskPrice) || 0,
		});
		setTaskDesc("");
		setTaskCant(1);
		setTaskPrice(0);
	};

	const handleNoteSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newNote.trim() || isLocked) return;
		await onAddNote(newNote.trim());
		setNewNote("");
	};

	const handleFileInputChange = async (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = e.target.files?.[0];
		if (!file) return;
		await onAddPhoto(file);
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	const handleCopyInvoiceToClipboard = () => {
		const serviceBreakdown = order.items
			.map(
				(it) =>
					`- ${it.descripcion} x${it.cantidad} [${
						it.completado ? "COMPLETADO" : "PENDIENTE"
					}]`,
			)
			.join("\n");

		const billingData = `=== DATOS PARA LA FACTURA ===
Cliente: ${order.clienteNombre}
Teléfono: ${order.clienteTelefono}
Dirección: ${clientAddress}
RUC/CI: ${matchedEmpresa ? matchedEmpresa.ruc : "17XXXXXXXX001 (Particular)"}
Vehículo: ${order.vehiculoTipo} (${order.placa})
Detalle de trabajo realizado:
${serviceBreakdown}
Total USD: ${order.total.toFixed(2)}
Fecha de Emisión: ${order.fechaInicio}
=============================`;

		navigator.clipboard.writeText(billingData);
		setCopiedInvoice(true);
		setTimeout(() => setCopiedInvoice(false), 2000);
	};

	return (
		<div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-6">
			{/* Lock Banner if Closed */}
			{isLocked && (
				<div className="rounded-lg border border-red-200 bg-red-50 text-red-700 p-3 text-xs font-bold flex items-center gap-2 animate-pulse select-none">
					<AlertCircle className="h-4 w-4 shrink-0" />
					<span>
						ORDEN CERRADA - HISTORIAL NO EDITABLE (Consistencia de Datos)
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
								<span>{`${order._id.substring(0, 4)}...`}</span>
								<button
									type="button"
									onClick={() => navigator.clipboard.writeText(order._id)}
									className="p-1 rounded hover:bg-secondary/50 text-muted-foreground transition-colors cursor-pointer"
									title="Copiar ID completo"
								>
									<Copy className="h-4 w-4" />
								</button>
							</h2>
							<span
								className={`text-xs font-bold px-2 py-0.5 rounded-full ${
									order.prioridad === "Alta"
										? "bg-destructive/15 text-destructive"
										: order.prioridad === "Media"
											? "bg-yellow-500/15 text-yellow-500"
											: "bg-green-500/15 text-green-500"
								}`}
							>
								Prioridad {order.prioridad}
							</span>
						</div>
						<p className="text-xs text-muted-foreground">
							Cliente:{" "}
							<strong className="text-foreground">{order.clienteNombre}</strong>{" "}
							• Tlf: {order.clienteTelefono}
						</p>
					</div>
				</div>

				<div className="flex flex-wrap gap-2 items-center">
					<button
						type="button"
						onClick={() => setIsInvoiceOpen(true)}
						className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors cursor-pointer"
					>
						<FileText className="h-3.5 w-3.5" />
						Datos para Factura
					</button>

					<select
						value={order.estado}
						onChange={(e) =>
							onStatusChange(e.target.value as OrdenTrabajo["estado"])
						}
						disabled={isLocked}
						className="rounded-lg border border-border bg-card px-2.5 py-2 text-xs font-semibold text-foreground focus:outline-none disabled:opacity-60 cursor-pointer"
					>
						<option value="Pendiente">Pendiente</option>
						<option value="En Proceso">En Proceso</option>
						<option value="Listo">Listo</option>
						<option value="Entregado">Entregado</option>
						<option value="Cancelado">Cancelado</option>
					</select>

					<button
						type="button"
						onClick={() => onDeleteOrder(order)}
						className="flex h-9 w-9 items-center justify-center rounded-lg border border-destructive/20 bg-card text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
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
						{order.items.map((it, idx) => (
							<div
								// biome-ignore lint/suspicious/noArrayIndexKey: lista de tareas controlada por índice
								key={idx}
								className="flex items-center gap-2 group"
							>
								<button
									type="button"
									onClick={() => onToggleTask(idx)}
									className="flex-1 flex items-center justify-between p-2.5 rounded-lg border border-border bg-secondary/10 hover:bg-secondary/40 text-left transition-colors cursor-pointer"
								>
									<div className="flex items-center gap-2 truncate">
										{it.completado ? (
											<CheckSquare className="h-4 w-4 shrink-0 text-foreground" />
										) : (
											<Square className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
										)}
										<span
											className={`text-xs truncate ${
												it.completado
													? "line-through text-muted-foreground"
													: "text-foreground font-medium"
											}`}
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
										onClick={() => onRemoveTask(idx)}
										className="text-destructive hover:bg-destructive/10 p-1.5 rounded transition-colors shrink-0 cursor-pointer"
										title="Eliminar tarea/sticker"
									>
										<Trash2 className="h-4 w-4" />
									</button>
								)}
							</div>
						))}
						{order.items.length === 0 && (
							<div className="text-center py-6 text-muted-foreground text-xs">
								No hay tareas en esta orden.
							</div>
						)}
					</div>

					{!isLocked && (
						<form
							onSubmit={handleInsertTask}
							className="border-t border-border pt-4 mt-3 space-y-2"
						>
							<div className="text-xs font-bold text-foreground">
								Añadir Tarea / Sticker:
							</div>
							<input
								type="text"
								name="taskDesc"
								required
								value={taskDesc}
								list="orden-servicios-list"
								onChange={(e) => {
									const val = e.target.value;
									setTaskDesc(val);
									const found = catalogoServicios.find((s) => s.nombre === val);
									if (found && taskPrice === 0) {
										const precio = found.precio ?? found.precioBase ?? 0;
										setTaskPrice(precio);
									}
								}}
								placeholder="Seleccione o escriba el servicio"
								className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-ring"
							/>
							<datalist id="orden-servicios-list">
								{catalogoServicios.map((s) => {
									const precio = s.precio ?? s.precioBase ?? 0;
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
										value={taskCant}
										onChange={(e) => setTaskCant(Number(e.target.value))}
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
										value={taskPrice}
										onChange={(e) => setTaskPrice(Number(e.target.value))}
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
										{order.progreso}%
									</span>
									<span className="text-xs text-muted-foreground font-semibold">
										Tareas completadas
									</span>
								</div>

								<div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden border border-border">
									<div
										className="bg-primary h-full rounded-full transition-all duration-300"
										style={{ width: `${order.progreso}%` }}
									/>
								</div>
							</div>
						</div>

						{/* MATCHED VEHICLE DETAILS */}
						{matchedVehicle && (
							<div className="rounded-lg border border-border bg-secondary/10 p-3 text-xs space-y-1.5">
								<div className="font-bold text-foreground flex items-center gap-1.5">
									<Car className="h-3.5 w-3.5 text-primary" /> Datos del
									Vehículo
								</div>
								<div className="grid grid-cols-2 gap-1.5 text-muted-foreground">
									<div>
										<span className="font-semibold text-foreground">
											Marca:
										</span>{" "}
										{matchedVehicle.marca} {matchedVehicle.modelo}
									</div>
									<div>
										<span className="font-semibold text-foreground">Año:</span>{" "}
										{matchedVehicle.año}
									</div>
									<div>
										<span className="font-semibold text-foreground">
											Categoría:
										</span>{" "}
										{matchedVehicle.categoria}
									</div>
									<div className="truncate">
										<span className="font-semibold text-foreground">
											Chasis:
										</span>{" "}
										{matchedVehicle.numeroSerie}
									</div>
								</div>
							</div>
						)}

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
										${order.total} USD
									</strong>
								</div>
							</div>
						</div>
					</div>

					{!isLocked && (
						<button
							type="button"
							onClick={handleSaveSpecs}
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
							className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer"
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
								{(order.fotos || []).map((ph, idx) => (
									<button
										// biome-ignore lint/suspicious/noArrayIndexKey: galería de fotos estática
										key={idx}
										type="button"
										onClick={() => setPreviewImage(ph)}
										className="relative aspect-video rounded-lg overflow-hidden border border-border group bg-secondary cursor-pointer hover:border-primary/50 transition-all text-left"
										title="Click para agrandar imagen"
									>
										<img
											src={ph}
											alt="Wrapping sticker installation process"
											className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200"
										/>
										<div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5 backdrop-blur-[1px]">
											<Maximize2 className="h-4 w-4" />
											<span>Agrandar</span>
										</div>
									</button>
								))}

								{!isLocked && (
									<button
										type="button"
										onClick={() => fileInputRef.current?.click()}
										disabled={isUploadingPhoto}
										className="aspect-video rounded-lg border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all gap-1 text-[10px] font-bold disabled:opacity-50 cursor-pointer"
									>
										<ImageIcon className="h-5 w-5 text-muted-foreground/60" />
										{isUploadingPhoto ? "Subiendo..." : "Añadir Foto"}
									</button>
								)}
								<input
									type="file"
									ref={fileInputRef}
									hidden
									accept="image/*"
									onChange={handleFileInputChange}
								/>
							</div>

							{/* Notes Timeline */}
							<div className="space-y-3 bg-secondary/15 rounded-xl p-4 border border-border max-h-[160px] overflow-y-auto">
								{(order.notas || []).map((nt, idx) => (
									<div
										// biome-ignore lint/suspicious/noArrayIndexKey: lista de notas
										key={idx}
										className="text-xs text-foreground flex gap-2"
									>
										<span className="text-muted-foreground select-none">•</span>
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
							Esta orden está cerrada. No se pueden añadir notas de bitácora.
						</p>
					) : (
						<form onSubmit={handleNoteSubmit} className="flex gap-2">
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
								className="rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-colors cursor-pointer"
							>
								Agregar Nota
							</button>
						</form>
					))}
			</div>

			{/* BILLING DATA MODAL ("Datos para la Factura") */}
			{isInvoiceOpen && (
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
								Datos de Facturación ({order._id})
							</h3>
							<button
								type="button"
								onClick={() => setIsInvoiceOpen(false)}
								className="text-muted-foreground hover:text-foreground text-sm font-bold cursor-pointer"
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
									{order.clienteNombre}
								</span>
							</div>
							<div>
								<span className="text-[10px] font-semibold block uppercase">
									RUC / Cédula:
								</span>
								<span className="text-sm font-mono font-bold text-foreground">
									{matchedEmpresa
										? matchedEmpresa.ruc
										: "1792345678001 (Consumidor Final)"}
								</span>
							</div>
							<div>
								<span className="text-[10px] font-semibold block uppercase">
									Teléfono:
								</span>
								<span className="text-sm font-bold text-foreground">
									{order.clienteTelefono}
								</span>
							</div>
							<div>
								<span className="text-[10px] font-semibold block uppercase">
									Dirección:
								</span>
								<span className="text-sm font-bold text-foreground">
									{clientAddress}
								</span>
							</div>
							<div>
								<span className="text-[10px] font-semibold block uppercase">
									Detalle de Trabajo Realizado:
								</span>
								<div className="space-y-1 mt-1 text-foreground font-semibold">
									{order.items.map((it, i) => (
										<div
											// biome-ignore lint/suspicious/noArrayIndexKey: vista estática de ítems
											key={i}
											className="flex justify-between items-center bg-card/45 px-2 py-1 rounded border border-border/40"
										>
											<span>
												{it.descripcion} x{it.cantidad}
											</span>
											<span
												className={`text-[9px] px-1 py-0.2 rounded ${
													it.completado
														? "bg-green-500/10 text-green-500"
														: "bg-yellow-500/10 text-yellow-500"
												}`}
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
									${order.total.toFixed(2)} USD
								</span>
							</div>
							<div>
								<span className="text-[10px] font-semibold block uppercase">
									Fecha Emisión:
								</span>
								<span className="text-sm font-bold text-foreground">
									{order.fechaInicio}
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

			{/* LIGHTBOX MODAL PARA FOTO DE ORDEN DE TRABAJO */}
			{previewImage && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
					<button
						type="button"
						className="fixed inset-0 w-full h-full cursor-default"
						onClick={() => setPreviewImage(null)}
						aria-label="Cerrar imagen"
					/>
					<div className="relative max-w-4xl max-h-[90vh] z-10 flex flex-col items-center">
						<div className="flex items-center justify-between w-full pb-2 text-white">
							<span className="text-xs font-semibold tracking-wider uppercase opacity-80">
								Fotografía de Orden #{order._id.slice(0, 8)}
							</span>
							<div className="flex items-center gap-2">
								<a
									href={previewImage}
									target="_blank"
									rel="noreferrer"
									className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-1 text-xs"
									title="Abrir original en pestaña nueva"
								>
									<ExternalLink className="h-4 w-4" />
									<span>Original</span>
								</a>
								<button
									type="button"
									onClick={() => setPreviewImage(null)}
									className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
									title="Cerrar"
								>
									<X className="h-5 w-5" />
								</button>
							</div>
						</div>
						<img
							src={previewImage}
							alt="Foto ampliada de la orden de trabajo"
							className="max-h-[80vh] max-w-full rounded-xl border border-white/20 shadow-2xl object-contain"
						/>
					</div>
				</div>
			)}
		</div>
	);
};
