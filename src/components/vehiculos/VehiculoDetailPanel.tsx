import {
	Activity,
	AlertCircle,
	Car,
	ClipboardCheck,
	Clock,
	Edit2,
	FileText,
	Hash,
	Plus,
	Trash2,
	User,
	Wrench,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import type {
	OrdenVehiculoResumen,
	OwnerDetails,
	ServicioVehiculo,
	Vehiculo,
} from "./types";

export interface VehiculoDetailPanelProps {
	vehiculo: Vehiculo | null;
	ownerDetails: OwnerDetails;
	ordenesVehiculo: OrdenVehiculoResumen[];
	onOpenEdit: (veh: Vehiculo) => void;
	onDeleteVehiculo: (veh: Vehiculo) => void;
	onSelectServiceFlow: (flowType: "cotizacion" | "orden") => void;
	onAddHistoryService: (srv: {
		descripcion: string;
		costo: number;
		fecha: string;
		estado: string;
	}) => Promise<void> | void;
	onEditHistoryService: (
		srvId: string,
		srv: {
			descripcion: string;
			costo: number;
			fecha: string;
			estado: string;
		},
	) => Promise<void> | void;
	onDeleteHistoryService: (srvId: string) => Promise<void> | void;
}

export const VehiculoDetailPanel: React.FC<VehiculoDetailPanelProps> = ({
	vehiculo,
	ownerDetails,
	ordenesVehiculo,
	onOpenEdit,
	onDeleteVehiculo,
	onSelectServiceFlow,
	onAddHistoryService,
	onEditHistoryService,
	onDeleteHistoryService,
}) => {
	// Submodales
	const [isNewServiceFlowOpen, setIsNewServiceFlowOpen] = useState(false);
	const [isAddHistoryServiceOpen, setIsAddHistoryServiceOpen] = useState(false);
	const [isEditHistoryServiceOpen, setIsEditHistoryServiceOpen] =
		useState(false);
	const [selectedDetailService, setSelectedDetailService] =
		useState<ServicioVehiculo | null>(null);

	// Form inputs for service history
	const [selectedServiceId, setSelectedServiceId] = useState<string | null>(
		null,
	);
	const [srvDescripcion, setSrvDescripcion] = useState("");
	const [srvCosto, setSrvCosto] = useState(0);
	const [srvFecha, setSrvFecha] = useState(
		new Date().toISOString().split("T")[0],
	);
	const [srvEstado, setSrvEstado] = useState("Entregado");

	if (!vehiculo) {
		return (
			<div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
				<AlertCircle className="h-10 w-10 opacity-30 animate-pulse" />
				<span>
					Selecciona un vehículo de la lista para ver su cronología de rotulado.
				</span>
			</div>
		);
	}

	const handleOpenAddHistoryService = () => {
		setSrvDescripcion("");
		setSrvCosto(0);
		setSrvFecha(new Date().toISOString().split("T")[0]);
		setSrvEstado("Entregado");
		setIsAddHistoryServiceOpen(true);
	};

	const handleOpenEditHistory = (srv: ServicioVehiculo) => {
		setSelectedServiceId(srv.id);
		setSrvDescripcion(srv.descripcion);
		setSrvCosto(srv.costo);
		setSrvFecha(srv.fecha);
		setSrvEstado(srv.estado);
		setIsEditHistoryServiceOpen(true);
	};

	const handleAddHistorySubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!srvDescripcion.trim()) return;
		await onAddHistoryService({
			descripcion: srvDescripcion.trim(),
			costo: Number(srvCosto),
			fecha: srvFecha,
			estado: srvEstado,
		});
		setIsAddHistoryServiceOpen(false);
	};

	const handleEditHistorySubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedServiceId || !srvDescripcion.trim()) return;
		await onEditHistoryService(selectedServiceId, {
			descripcion: srvDescripcion.trim(),
			costo: Number(srvCosto),
			fecha: srvFecha,
			estado: srvEstado,
		});
		setIsEditHistoryServiceOpen(false);
	};

	return (
		<div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-6">
			{/* Card header */}
			<div className="flex items-start justify-between border-b border-border pb-4">
				<div className="flex items-center gap-3">
					<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-foreground shrink-0">
						<Car className="h-6 w-6" />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h2 className="text-xl font-extrabold text-foreground">
								{vehiculo.marca} {vehiculo.modelo}
							</h2>
							<span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full font-bold">
								{vehiculo.año}
							</span>
						</div>
						<p className="text-sm text-muted-foreground">
							Placa:{" "}
							<strong className="text-foreground">{vehiculo.placa}</strong> •{" "}
							{vehiculo.categoria}
						</p>
					</div>
				</div>

				<div className="flex gap-2">
					<button
						type="button"
						onClick={() => setIsNewServiceFlowOpen(true)}
						className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-colors cursor-pointer"
					>
						<Plus className="h-3.5 w-3.5" />
						Nuevo Servicio
					</button>
					<button
						type="button"
						onClick={() => onOpenEdit(vehiculo)}
						className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-secondary transition-colors cursor-pointer"
						title="Editar Vehículo"
					>
						<Edit2 className="h-4 w-4" />
					</button>
					<button
						type="button"
						onClick={() => onDeleteVehiculo(vehiculo)}
						className="flex h-9 w-9 items-center justify-center rounded-lg border border-destructive/20 bg-card text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
						title="Eliminar Vehículo"
					>
						<Trash2 className="h-4 w-4" />
					</button>
				</div>
			</div>

			{/* Technical Specifications Grid */}
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<div className="rounded-lg border border-border p-3">
					<div className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
						<User className="h-3 w-3" /> Propietario
					</div>
					<div className="text-sm font-bold text-foreground truncate mt-1">
						{ownerDetails.nombre}
					</div>
					<div className="text-[10px] text-muted-foreground font-medium">
						{ownerDetails.tipo}
					</div>
				</div>

				<div className="rounded-lg border border-border p-3">
					<div className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
						<Hash className="h-3 w-3" /> Número de Serie
					</div>
					<div
						className="text-sm font-mono font-semibold text-foreground truncate mt-1"
						title={vehiculo.numeroSerie}
					>
						{vehiculo.numeroSerie}
					</div>
				</div>

				<div className="rounded-lg border border-border p-3">
					<div className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
						<Activity className="h-3 w-3" /> Estado
					</div>
					<div className="mt-1">
						<span
							className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
								vehiculo.estado === "Activo"
									? "bg-green-500/10 text-green-500"
									: vehiculo.estado === "En Mantenimiento"
										? "bg-yellow-500/10 text-yellow-500"
										: "bg-muted text-muted-foreground"
							}`}
						>
							{vehiculo.estado}
						</span>
					</div>
				</div>

				<div className="rounded-lg border border-border p-3">
					<div className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
						<Wrench className="h-3 w-3" /> Inversión Acumulada
					</div>
					<div className="text-sm font-bold text-foreground mt-1">
						$
						{vehiculo.servicios
							.reduce((sum, s) => sum + s.costo, 0)
							.toLocaleString("en-US")}
					</div>
				</div>
			</div>

			{/* Services History (Cronológico) */}
			<div className="space-y-4 pt-2">
				<div className="flex items-center justify-between border-b border-border pb-2">
					<h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
						<Clock className="h-4 w-4" />
						Historial de Servicios
					</h3>
					<button
						type="button"
						onClick={handleOpenAddHistoryService}
						className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1 cursor-pointer"
					>
						<Plus className="h-3.5 w-3.5" />
						Añadir Registro Histórico
					</button>
				</div>

				<div className="relative border-l border-border pl-6 ml-3 space-y-6">
					{vehiculo.servicios.map((srv) => (
						<div key={srv.id} className="relative">
							{/* Timeline dot */}
							<span className="absolute -left-9 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-secondary border border-border text-[10px] text-foreground font-bold">
								•
							</span>

							<div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 p-3 rounded-lg border border-border/60 bg-secondary/5 hover:bg-secondary/20 transition-all cursor-pointer group">
								<button
									type="button"
									onClick={() => setSelectedDetailService(srv)}
									className="flex-1 min-w-0 text-left cursor-pointer"
								>
									<div className="flex items-center gap-2">
										<span className="text-xs font-semibold bg-secondary px-2 py-0.5 rounded text-foreground">
											{srv.fecha}
										</span>
										<span className="text-xs font-bold text-foreground">
											${srv.costo}
										</span>
									</div>
									<p className="text-sm text-foreground mt-1 font-medium group-hover:text-primary transition-colors truncate">
										{srv.descripcion}
									</p>
									<span className="text-[10px] text-green-500 font-semibold bg-green-500/10 px-1.5 py-0.5 rounded inline-block mt-1">
										{srv.estado}
									</span>
								</button>

								<div className="flex items-center gap-2 justify-end">
									<button
										type="button"
										onClick={() => handleOpenEditHistory(srv)}
										className="p-1.5 rounded text-muted-foreground hover:bg-card hover:text-foreground transition-colors cursor-pointer"
										title="Editar entrada"
									>
										<Edit2 className="h-3.5 w-3.5" />
									</button>
									<button
										type="button"
										onClick={() => onDeleteHistoryService(srv.id)}
										className="p-1.5 rounded text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
										title="Eliminar entrada"
									>
										<Trash2 className="h-3.5 w-3.5" />
									</button>
								</div>
							</div>
						</div>
					))}

					{/* ORDENES DE TRABAJO (CONVEX) */}
					{ordenesVehiculo.map((orden) => (
						<div key={orden._id} className="relative">
							<span className="absolute -left-9 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 border border-primary/30 text-[10px] text-primary font-bold">
								<Wrench className="h-3 w-3" />
							</span>
							<div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 p-3 rounded-lg border border-border/60 bg-secondary/5 hover:bg-secondary/20 transition-all group">
								<div className="flex-1 min-w-0 text-left">
									<div className="flex items-center gap-2">
										<span className="text-xs font-semibold bg-primary/20 text-primary px-2 py-0.5 rounded">
											{orden.fechaInicio}
										</span>
										<span className="text-xs font-bold px-2 py-0.5 rounded border border-border/50 text-foreground">
											{orden.estado}
										</span>
									</div>
									<div className="mt-2 text-sm text-foreground space-y-1">
										{orden.items.map((s, idx) => (
											<div
												// biome-ignore lint/suspicious/noArrayIndexKey: lista de ítems de orden
												key={`servicio-${idx}-${s.descripcion}`}
												className="flex items-center gap-1.5"
											>
												<div className="h-1.5 w-1.5 rounded-full bg-primary" />
												<span>
													{s.descripcion} (x{s.cantidad})
												</span>
											</div>
										))}
									</div>
								</div>
							</div>
						</div>
					))}

					{vehiculo.servicios.length === 0 && ordenesVehiculo.length === 0 && (
						<div className="text-center py-6 text-muted-foreground text-sm border border-dashed border-border rounded-lg ml-[-12px]">
							Aún no hay registros en la cronología de este vehículo.
						</div>
					)}
				</div>
			</div>

			{/* NEW SERVICE FLOW OVERLAY DIALOG */}
			{isNewServiceFlowOpen && (
				<div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4">
					<button
						type="button"
						aria-label="Cerrar"
						className="fixed inset-0 bg-black/50 backdrop-blur-sm"
						onClick={() => setIsNewServiceFlowOpen(false)}
					/>
					<div className="relative w-full max-w-md overflow-hidden rounded-xl border border-border bg-card p-6 shadow-xl text-center animate-slide-in">
						<h3 className="text-lg font-bold text-foreground mb-2">
							Nuevo Servicio para {vehiculo.placa}
						</h3>
						<p className="text-sm text-muted-foreground mb-6">
							Elige si deseas estructurar una cotización o registrar
							directamente una orden de trabajo activa. Los datos se
							transferirán automáticamente.
						</p>
						<div className="grid gap-3 grid-cols-2">
							<button
								type="button"
								onClick={() => {
									setIsNewServiceFlowOpen(false);
									onSelectServiceFlow("cotizacion");
								}}
								className="flex flex-col items-center gap-3 p-4 rounded-xl border border-border hover:bg-secondary hover:border-ring/30 transition-all text-center group cursor-pointer"
							>
								<div className="p-3 bg-secondary rounded-full group-hover:bg-card border border-border transition-colors">
									<FileText className="h-6 w-6 text-foreground" />
								</div>
								<div className="text-sm font-bold text-foreground">
									Crear Cotización
								</div>
								<div className="text-[10px] text-muted-foreground">
									Estructurar plantilla y precios sugeridos
								</div>
							</button>

							<button
								type="button"
								onClick={() => {
									setIsNewServiceFlowOpen(false);
									onSelectServiceFlow("orden");
								}}
								className="flex flex-col items-center gap-3 p-4 rounded-xl border border-border hover:bg-secondary hover:border-ring/30 transition-all text-center group cursor-pointer"
							>
								<div className="p-3 bg-secondary rounded-full group-hover:bg-card border border-border transition-colors">
									<ClipboardCheck className="h-6 w-6 text-foreground" />
								</div>
								<div className="text-sm font-bold text-foreground">
									Orden de Trabajo
								</div>
								<div className="text-[10px] text-muted-foreground">
									Iniciar producción e instalación inmediata
								</div>
							</button>
						</div>

						<button
							type="button"
							onClick={() => setIsNewServiceFlowOpen(false)}
							className="mt-6 w-full rounded-lg border border-border px-4 py-3 sm:py-2.5 text-[16px] sm:text-sm font-semibold text-foreground hover:bg-secondary transition-colors cursor-pointer"
						>
							Cancelar
						</button>
					</div>
				</div>
			)}

			{/* HISTORIC SERVICE: ADD MODAL */}
			{isAddHistoryServiceOpen && (
				<div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4">
					<button
						type="button"
						aria-label="Cerrar"
						className="fixed inset-0 bg-black/50 backdrop-blur-sm"
						onClick={() => setIsAddHistoryServiceOpen(false)}
					/>
					<div className="relative w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xl animate-slide-in mx-0 sm:mx-4">
						<h3 className="text-lg font-bold text-foreground mb-4">
							Agregar Servicio Histórico
						</h3>
						<form onSubmit={handleAddHistorySubmit} className="space-y-4">
							<div>
								<label
									htmlFor="add-srv-descripcion"
									className="block text-xs font-semibold text-muted-foreground mb-1"
								>
									Descripción del Trabajo Realizado *
								</label>
								<input
									id="add-srv-descripcion"
									type="text"
									required
									value={srvDescripcion}
									onChange={(e) => setSrvDescripcion(e.target.value)}
									className="w-full rounded-lg border border-border bg-background px-3 py-3 sm:py-2 text-[16px] sm:text-sm text-foreground focus:border-ring focus:outline-none"
									placeholder="Ej. Rotulado de franja de seguridad lateral"
								/>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<label
										htmlFor="add-srv-costo"
										className="block text-xs font-semibold text-muted-foreground mb-1"
									>
										Costo Total ($ USD) *
									</label>
									<input
										id="add-srv-costo"
										type="number"
										required
										min="0"
										value={srvCosto}
										onChange={(e) => setSrvCosto(Number(e.target.value))}
										className="w-full rounded-lg border border-border bg-background px-3 py-3 sm:py-2 text-[16px] sm:text-sm text-foreground focus:border-ring focus:outline-none"
									/>
								</div>
								<div>
									<label
										htmlFor="add-srv-fecha"
										className="block text-xs font-semibold text-muted-foreground mb-1"
									>
										Fecha de Entrega *
									</label>
									<input
										id="add-srv-fecha"
										type="date"
										required
										value={srvFecha}
										onChange={(e) => setSrvFecha(e.target.value)}
										className="w-full rounded-lg border border-border bg-background px-3 py-3 sm:py-2 text-[16px] sm:text-sm text-foreground focus:border-ring focus:outline-none"
									/>
								</div>
							</div>

							<div>
								<label
									htmlFor="add-srv-estado"
									className="block text-xs font-semibold text-muted-foreground mb-1"
								>
									Estado de Entrega
								</label>
								<input
									id="add-srv-estado"
									type="text"
									disabled
									value={srvEstado}
									className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground"
								/>
							</div>

							<div className="flex gap-3 justify-end pt-2">
								<button
									type="button"
									onClick={() => setIsAddHistoryServiceOpen(false)}
									className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary transition-colors cursor-pointer"
								>
									Cancelar
								</button>
								<button
									type="submit"
									className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-colors cursor-pointer"
								>
									Agregar Registro
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* HISTORIC SERVICE: EDIT MODAL */}
			{isEditHistoryServiceOpen && (
				<div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4">
					<button
						type="button"
						aria-label="Cerrar"
						className="fixed inset-0 bg-black/50 backdrop-blur-sm"
						onClick={() => setIsEditHistoryServiceOpen(false)}
					/>
					<div className="relative w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xl animate-slide-in mx-0 sm:mx-4">
						<h3 className="text-lg font-bold text-foreground mb-4">
							Editar Entrada Histórica
						</h3>
						<form onSubmit={handleEditHistorySubmit} className="space-y-4">
							<div>
								<label
									htmlFor="edit-srv-descripcion"
									className="block text-xs font-semibold text-muted-foreground mb-1"
								>
									Descripción del Trabajo *
								</label>
								<input
									id="edit-srv-descripcion"
									type="text"
									required
									value={srvDescripcion}
									onChange={(e) => setSrvDescripcion(e.target.value)}
									className="w-full rounded-lg border border-border bg-background px-3 py-3 sm:py-2 text-[16px] sm:text-sm text-foreground focus:border-ring focus:outline-none"
								/>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<label
										htmlFor="edit-srv-costo"
										className="block text-xs font-semibold text-muted-foreground mb-1"
									>
										Costo ($ USD) *
									</label>
									<input
										id="edit-srv-costo"
										type="number"
										required
										min="0"
										value={srvCosto}
										onChange={(e) => setSrvCosto(Number(e.target.value))}
										className="w-full rounded-lg border border-border bg-background px-3 py-3 sm:py-2 text-[16px] sm:text-sm text-foreground focus:border-ring focus:outline-none"
									/>
								</div>
								<div>
									<label
										htmlFor="edit-srv-fecha"
										className="block text-xs font-semibold text-muted-foreground mb-1"
									>
										Fecha *
									</label>
									<input
										id="edit-srv-fecha"
										type="date"
										required
										value={srvFecha}
										onChange={(e) => setSrvFecha(e.target.value)}
										className="w-full rounded-lg border border-border bg-background px-3 py-3 sm:py-2 text-[16px] sm:text-sm text-foreground focus:border-ring focus:outline-none"
									/>
								</div>
							</div>

							<div className="flex gap-3 justify-end pt-2">
								<button
									type="button"
									onClick={() => setIsEditHistoryServiceOpen(false)}
									className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary transition-colors cursor-pointer"
								>
									Cancelar
								</button>
								<button
									type="submit"
									className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-colors cursor-pointer"
								>
									Guardar Registro
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* DETALLE DE SERVICIO MODAL */}
			{selectedDetailService && (
				<div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4">
					<button
						type="button"
						aria-label="Cerrar"
						className="fixed inset-0 bg-black/50 backdrop-blur-sm"
						onClick={() => setSelectedDetailService(null)}
					/>
					<div className="relative w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xl animate-slide-in mx-0 sm:mx-4">
						<div className="flex items-center justify-between pb-3 border-b border-border mb-4">
							<h3 className="text-lg font-bold text-foreground flex items-center gap-2">
								<Wrench className="h-5 w-5 text-primary" />
								Detalle del Servicio
							</h3>
							<button
								type="button"
								onClick={() => setSelectedDetailService(null)}
								className="text-muted-foreground hover:text-foreground text-sm font-bold cursor-pointer"
							>
								Cerrar
							</button>
						</div>

						<div className="space-y-4">
							<div>
								<span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
									Trabajo Realizado
								</span>
								<p className="text-sm font-semibold text-foreground mt-1">
									{selectedDetailService.descripcion}
								</p>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
										Costo
									</span>
									<p className="text-base font-black text-foreground mt-1">
										${selectedDetailService.costo} USD
									</p>
								</div>
								<div>
									<span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
										Fecha de Entrega
									</span>
									<p className="text-sm font-semibold text-foreground mt-1">
										{selectedDetailService.fecha}
									</p>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
										Estado
									</span>
									<div className="mt-1">
										<span className="inline-flex items-center rounded-md bg-green-500/10 px-2 py-0.5 text-xs font-semibold text-green-500">
											{selectedDetailService.estado}
										</span>
									</div>
								</div>
								<div>
									<span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
										Vehículo
									</span>
									<p className="text-sm font-semibold text-foreground mt-1">
										{vehiculo.marca} {vehiculo.modelo}
									</p>
									<p className="text-xs text-muted-foreground">
										Placa: {vehiculo.placa}
									</p>
								</div>
							</div>

							<div className="border-t border-border pt-3">
								<span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
									Propietario
								</span>
								<p className="text-sm font-semibold text-foreground mt-1">
									{ownerDetails.nombre}
								</p>
								<p className="text-xs text-muted-foreground">
									{ownerDetails.tipo}
								</p>
							</div>
						</div>

						<button
							type="button"
							onClick={() => setSelectedDetailService(null)}
							className="mt-6 w-full rounded-lg bg-secondary hover:bg-secondary/80 py-3 sm:py-2.5 text-[16px] sm:text-sm font-semibold text-foreground transition-colors cursor-pointer"
						>
							Cerrar
						</button>
					</div>
				</div>
			)}
		</div>
	);
};
