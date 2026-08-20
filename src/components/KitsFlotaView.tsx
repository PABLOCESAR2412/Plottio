import { useMutation, useQuery } from "convex/react";
import { Box, PlusCircle, Truck } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { useSessionStore } from "../store/useSessionStore";
import { TableSkeleton } from "./Skeleton";

interface KitItem {
	servicioId: string;
	nombre: string;
	cantidad_por_unidad: number;
	precio_unitario?: number;
	notas?: string;
}

export function KitsFlotaView() {
	const currentUser = useSessionStore((s) => s.currentUser);

	const kits = useQuery(
		api.kitsFlota.getKits,
		currentUser ? { usuarioId: currentUser.id as Id<"usuarios"> } : "skip",
	);

	const servicios = useQuery(
		api.catalogoServicios.getServicios,
		currentUser ? { usuarioId: currentUser.id as Id<"usuarios"> } : "skip",
	);

	const crearKit = useMutation(api.kitsFlota.crearKitFlota);
	const actualizarKit = useMutation(api.kitsFlota.actualizarKitFlota);
	const eliminarKit = useMutation(api.kitsFlota.eliminarKitFlota);
	const generarMasivo = useMutation(
		api.kitsFlota.generarCotizacionesMasivasDesdeKit,
	);

	const [searchTerm] = useState("");
	const [showModal, setShowModal] = useState(false);
	const [showGenerarModal, setShowGenerarModal] = useState(false);
	const [showEditModal, setShowEditModal] = useState(false);
	const [selectedKit, setSelectedKit] = useState<Doc<"kitsFlota"> | null>(null);

	const [formData, setFormData] = useState({
		nombre: "",
		descripcion: "",
		items: [] as KitItem[],
	});

	const [generarFormData, setGenerarFormData] = useState<{
		modo: string;
		vehiculos: { descripcion_vehiculo: string; vehiculoId?: Id<"vehiculos"> }[];
	}>({
		modo: "padre_con_subgrupos",
		vehiculos: [{ descripcion_vehiculo: "" }],
	});

	const [selectedServicioId, setSelectedServicioId] = useState("");

	const filteredKits = (kits ?? []).filter((k) =>
		k.nombre.toLowerCase().includes(searchTerm.toLowerCase()),
	);

	const addItemToKit = () => {
		if (!selectedServicioId) return;
		const srv = (servicios ?? []).find((s) => s._id === selectedServicioId);
		if (!srv) return;

		setFormData({
			...formData,
			items: [
				...formData.items,
				{
					servicioId: srv._id,
					nombre: srv.nombre,
					cantidad_por_unidad: 1,
					precio_unitario: srv.precioBase,
					notas: "",
				},
			],
		});
		setSelectedServicioId("");
	};

	const updateItem = (index: number, field: string, value: string | number) => {
		const newItems = [...formData.items];
		newItems[index] = { ...newItems[index], [field]: value };
		setFormData({ ...formData, items: newItems });
	};

	const removeItem = (index: number) => {
		const newItems = [...formData.items];
		newItems.splice(index, 1);
		setFormData({ ...formData, items: newItems });
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			if (formData.items.length === 0) {
				toast.error("El kit debe tener al menos un ítem");
				return;
			}
			await crearKit({
				usuarioId: currentUser.id as Id<"usuarios">,
				nombre: formData.nombre,
				descripcion: formData.descripcion,
				items: formData.items.map((item) => ({
					servicioId: item.servicioId as Id<"catalogoServicios">,
					cantidad_por_unidad: item.cantidad_por_unidad,
					precio_unitario: item.precio_unitario,
					notas: item.notas,
				})),
			});

			toast.success("Kit de flota creado exitosamente");
			setShowModal(false);
			setFormData({ nombre: "", descripcion: "", items: [] });
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Error al crear kit");
		}
	};

	const handleEditSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedKit) return;
		try {
			if (formData.items.length === 0) {
				toast.error("El kit debe tener al menos un ítem");
				return;
			}
			await actualizarKit({
				usuarioId: currentUser.id as Id<"usuarios">,
				kitId: selectedKit._id,
				nombre: formData.nombre,
				descripcion: formData.descripcion,
				items: formData.items.map((item) => ({
					servicioId: item.servicioId as Id<"catalogoServicios">,
					cantidad_por_unidad: item.cantidad_por_unidad,
					precio_unitario: item.precio_unitario,
					notas: item.notas,
				})),
			});

			toast.success("Kit actualizado exitosamente");
			setShowEditModal(false);
			setSelectedKit(null);
			setFormData({ nombre: "", descripcion: "", items: [] });
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Error al actualizar kit",
			);
		}
	};

	const handleDelete = async () => {
		if (!selectedKit) return;
		if (confirm("¿Estás seguro de que deseas eliminar este kit?")) {
			try {
				await eliminarKit({
					usuarioId: currentUser.id as Id<"usuarios">,
					kitId: selectedKit._id,
				});
				toast.success("Kit eliminado");
				setShowEditModal(false);
				setSelectedKit(null);
			} catch (_err) {
				toast.error("Error al eliminar kit");
			}
		}
	};

	const handleGenerarMasivoSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedKit) return;

		// Validar vehículos vacíos
		const vehiculosValidos = generarFormData.vehiculos.filter(
			(v) => v.descripcion_vehiculo.trim() !== "",
		);
		if (vehiculosValidos.length === 0) {
			toast.error("Añade al menos un vehículo válido");
			return;
		}

		try {
			await generarMasivo({
				usuarioId: currentUser.id as Id<"usuarios">,
				kitId: selectedKit._id,
				clienteId: selectedKit.clienteId as Id<"clientes">,
				vehiculos: vehiculosValidos.map((v) => ({
					vehiculoId: v.vehiculoId as Id<"vehiculos">,
					placa: v.descripcion_vehiculo,
				})),
				modo: generarFormData.modo,
			});
			toast.success(
				`Se generaron las cotizaciones para ${vehiculosValidos.length} vehículos exitosamente`,
			);
			setShowGenerarModal(false);
			setGenerarFormData({
				modo: "padre_con_subgrupos",
				vehiculos: [{ descripcion_vehiculo: "" }],
			});
			setSelectedKit(null);
		} catch (err) {
			toast.error(
				err instanceof Error
					? err.message
					: "Error al generar cotizaciones masivas",
			);
		}
	};

	if (!currentUser) return <p>Cargando...</p>;
	if (kits === undefined || servicios === undefined) return <TableSkeleton />;

	return (
		<div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 p-6">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
						<Box className="w-6 h-6 text-primary" />
						Kits de Flota
					</h2>
					<p className="text-muted-foreground text-sm mt-1">
						Plantillas para generación masiva (Fase 12).
					</p>
				</div>
				<button
					type="button"
					onClick={() => setShowModal(true)}
					className="flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:opacity-90 text-primary-foreground rounded-xl transition-all shadow-sm active:scale-95"
				>
					<PlusCircle className="w-4 h-4" />
					<span className="font-medium">Nuevo Kit</span>
				</button>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{filteredKits.map((k) => (
					<div
						key={k._id}
						className="bg-card rounded-2xl shadow-sm border border-border p-6 hover:shadow-md transition-shadow cursor-pointer"
						onClick={() => {
							setSelectedKit(k);
							setFormData({
								nombre: k.nombre,
								descripcion: k.descripcion || "",
								items: k.items.map((item) => ({
									servicioId: item.servicioId,
									nombre: "Servicio", // We might not have the name without fetching, but we can do our best. Or let it be.
									cantidad_por_unidad: item.cantidad_por_unidad,
									precio_unitario: item.precio_unitario,
									notas: item.notas,
								})),
							});
							setShowEditModal(true);
						}}
					>
						<div className="flex justify-between items-start mb-4">
							<div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
								<Truck className="w-6 h-6" />
							</div>
							<span className="px-3 py-1 bg-muted text-foreground rounded-full text-xs font-medium">
								{k.items.length} ítems
							</span>
						</div>
						<h3 className="text-lg font-bold text-foreground mb-2">
							{k.nombre}
						</h3>
						<p className="text-sm text-muted-foreground mb-4 line-clamp-2">
							{k.descripcion || "Sin descripción"}
						</p>
						<div className="border-t border-border pt-4 flex justify-between items-center">
							<span className="text-xs text-muted-foreground">
								Creado: {new Date(k.fechaCreacion).toLocaleDateString()}
							</span>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									setSelectedKit(k);
									setShowGenerarModal(true);
								}}
								className="text-primary hover:opacity-80 font-medium text-sm"
							>
								Generar Masivo
							</button>
						</div>
					</div>
				))}
				{filteredKits.length === 0 && (
					<div className="col-span-full py-8 text-center text-muted-foreground">
						No se encontraron kits.
					</div>
				)}
			</div>

			{showModal && (
				<div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
					<div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
						<div className="p-6 border-b border-border">
							<h3 className="text-xl font-bold text-foreground">
								Diseñar Kit de Flota
							</h3>
						</div>

						<div className="overflow-y-auto p-6 flex-1 space-y-6">
							<div className="space-y-4">
								<div>
									<label
										htmlFor="kit-nombre"
										className="block text-sm font-medium text-foreground mb-1"
									>
										Nombre del Kit
									</label>
									<input
										id="kit-nombre"
										required
										type="text"
										value={formData.nombre}
										onChange={(e) =>
											setFormData({ ...formData, nombre: e.target.value })
										}
										placeholder="Ej. Kit Bus Urbano Estándar"
										className="w-full px-4 py-2 rounded-xl border border-border bg-background focus:ring-2 focus:ring-ring outline-none text-foreground"
									/>
								</div>
								<div>
									<label
										htmlFor="kit-descripcion"
										className="block text-sm font-medium text-foreground mb-1"
									>
										Descripción
									</label>
									<input
										id="kit-descripcion"
										type="text"
										value={formData.descripcion}
										onChange={(e) =>
											setFormData({ ...formData, descripcion: e.target.value })
										}
										className="w-full px-4 py-2 rounded-xl border border-border bg-background focus:ring-2 focus:ring-ring outline-none text-foreground"
									/>
								</div>
							</div>

							<div className="border-t border-border pt-6">
								<h4 className="font-semibold text-foreground mb-4">
									Ítems del Kit
								</h4>

								<div className="flex gap-2 mb-4">
									<select
										value={selectedServicioId}
										onChange={(e) => setSelectedServicioId(e.target.value)}
										className="flex-1 px-4 py-2 rounded-xl border border-border bg-background focus:ring-2 focus:ring-ring outline-none text-foreground"
									>
										<option value="">
											Seleccionar un servicio del catálogo...
										</option>
										{servicios?.map((s) => (
											<option key={s._id} value={s._id}>
												{s.nombre} - ${s.precioBase}
											</option>
										))}
									</select>
									<button
										type="button"
										onClick={addItemToKit}
										className="px-4 py-2 bg-primary hover:opacity-90 text-primary-foreground rounded-xl transition-colors"
									>
										Añadir
									</button>
								</div>

								<div className="space-y-3">
									{formData.items.map((item, index) => (
										<div
											// biome-ignore lint/suspicious/noArrayIndexKey: filas de formulario controladas por índice
											key={crypto.randomUUID()}
											className="flex flex-col sm:flex-row gap-3 items-center bg-background p-3 rounded-xl border border-border"
										>
											<div className="flex-1 font-medium text-foreground text-sm">
												{item.nombre}
											</div>
											<div className="w-24">
												<input
													type="number"
													title="Cantidad"
													min="1"
													value={item.cantidad_por_unidad}
													onChange={(e) =>
														updateItem(
															index,
															"cantidad_por_unidad",
															parseInt(e.target.value, 10),
														)
													}
													className="w-full px-2 py-1 text-sm rounded-lg border border-border bg-background outline-none text-foreground"
												/>
											</div>
											<div className="flex-1">
												<input
													type="text"
													title="Notas/Ubicación"
													placeholder="Notas (ej. Frontal)"
													value={item.notas}
													onChange={(e) =>
														updateItem(index, "notas", e.target.value)
													}
													className="w-full px-2 py-1 text-sm rounded-lg border border-border bg-background outline-none text-foreground"
												/>
											</div>
											<button
												type="button"
												onClick={() => removeItem(index)}
												className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
											>
												x
											</button>
										</div>
									))}
									{formData.items.length === 0 && (
										<p className="text-sm text-center text-muted-foreground py-4">
											No hay ítems en este kit todavía.
										</p>
									)}
								</div>
							</div>
						</div>

						<div className="p-6 border-t border-border bg-muted/30 flex gap-3 mt-auto">
							<button
								type="button"
								onClick={() => setShowModal(false)}
								className="flex-1 px-4 py-2 border border-border text-foreground rounded-xl hover:bg-muted transition-colors font-medium"
							>
								Cancelar
							</button>
							<button
								type="button"
								onClick={handleSubmit}
								className="flex-1 px-4 py-2 bg-primary hover:opacity-90 text-primary-foreground rounded-xl transition-colors font-medium shadow-sm"
							>
								Guardar Kit
							</button>
						</div>
					</div>
				</div>
			)}

			{showEditModal && (
				<div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
					<div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
						<div className="p-6 border-b border-border flex justify-between items-center">
							<h3 className="text-xl font-bold text-foreground">
								Editar Kit de Flota
							</h3>
							<button
								onClick={() => setShowEditModal(false)}
								className="text-muted-foreground hover:text-foreground"
							>
								✕
							</button>
						</div>

						<div className="overflow-y-auto p-6 flex-1 space-y-6">
							<div className="space-y-4">
								<div>
									<label
										htmlFor="kit-nombre-edit"
										className="block text-sm font-medium text-foreground mb-1"
									>
										Nombre del Kit
									</label>
									<input
										id="kit-nombre-edit"
										required
										type="text"
										value={formData.nombre}
										onChange={(e) =>
											setFormData({ ...formData, nombre: e.target.value })
										}
										placeholder="Ej. Kit Bus Urbano Estándar"
										className="w-full px-4 py-2 rounded-xl border border-border bg-background focus:ring-2 focus:ring-ring outline-none text-foreground"
									/>
								</div>
								<div>
									<label
										htmlFor="kit-descripcion-edit"
										className="block text-sm font-medium text-foreground mb-1"
									>
										Descripción
									</label>
									<input
										id="kit-descripcion-edit"
										type="text"
										value={formData.descripcion}
										onChange={(e) =>
											setFormData({ ...formData, descripcion: e.target.value })
										}
										className="w-full px-4 py-2 rounded-xl border border-border bg-background focus:ring-2 focus:ring-ring outline-none text-foreground"
									/>
								</div>
							</div>

							<div className="border-t border-border pt-6">
								<h4 className="font-semibold text-foreground mb-4">
									Ítems del Kit
								</h4>

								<div className="flex gap-2 mb-4">
									<select
										value={selectedServicioId}
										onChange={(e) => setSelectedServicioId(e.target.value)}
										className="flex-1 px-4 py-2 rounded-xl border border-border bg-background focus:ring-2 focus:ring-ring outline-none text-foreground"
									>
										<option value="">
											Seleccionar un servicio del catálogo...
										</option>
										{servicios?.map((s) => (
											<option key={s._id} value={s._id}>
												{s.nombre} - ${s.precioBase}
											</option>
										))}
									</select>
									<button
										type="button"
										onClick={addItemToKit}
										className="px-4 py-2 bg-primary hover:opacity-90 text-primary-foreground rounded-xl transition-colors"
									>
										Añadir
									</button>
								</div>

								<div className="space-y-3">
									{formData.items.map((item, index) => (
										<div
											key={crypto.randomUUID()}
											className="flex flex-col sm:flex-row gap-3 items-center bg-background p-3 rounded-xl border border-border"
										>
											<div className="flex-1 font-medium text-foreground text-sm">
												{item.nombre}
											</div>
											<div className="w-24">
												<input
													type="number"
													title="Cantidad"
													min="1"
													value={item.cantidad_por_unidad}
													onChange={(e) =>
														updateItem(
															index,
															"cantidad_por_unidad",
															parseInt(e.target.value, 10),
														)
													}
													className="w-full px-2 py-1 text-sm rounded-lg border border-border bg-background outline-none text-foreground"
												/>
											</div>
											<div className="flex-1">
												<input
													type="text"
													title="Notas/Ubicación"
													placeholder="Notas (ej. Frontal)"
													value={item.notas}
													onChange={(e) =>
														updateItem(index, "notas", e.target.value)
													}
													className="w-full px-2 py-1 text-sm rounded-lg border border-border bg-background outline-none text-foreground"
												/>
											</div>
											<button
												type="button"
												onClick={() => removeItem(index)}
												className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
											>
												x
											</button>
										</div>
									))}
									{formData.items.length === 0 && (
										<p className="text-sm text-center text-muted-foreground py-4">
											No hay ítems en este kit todavía.
										</p>
									)}
								</div>
							</div>
						</div>

						<div className="p-6 border-t border-border bg-muted/30 flex gap-3 mt-auto">
							<button
								type="button"
								onClick={handleDelete}
								className="px-4 py-2 border border-destructive text-destructive rounded-xl hover:bg-destructive/10 transition-colors font-medium mr-auto"
							>
								Eliminar
							</button>
							<button
								type="button"
								onClick={() => setShowEditModal(false)}
								className="px-4 py-2 border border-border text-foreground rounded-xl hover:bg-muted transition-colors font-medium"
							>
								Cancelar
							</button>
							<button
								type="button"
								onClick={handleEditSubmit}
								className="px-4 py-2 bg-primary hover:opacity-90 text-primary-foreground rounded-xl transition-colors font-medium shadow-sm"
							>
								Guardar Cambios
							</button>
						</div>
					</div>
				</div>
			)}

			{showGenerarModal && selectedKit && (
				<div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
					<div className="bg-card border border-border rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
						<div className="p-6 border-b border-border">
							<h3 className="text-xl font-bold text-foreground">
								Generar Órdenes: {selectedKit.nombre}
							</h3>
							<p className="text-sm text-muted-foreground mt-1">
								Aplica este kit a múltiples vehículos de una vez.
							</p>
						</div>

						<div className="overflow-y-auto p-6 flex-1 space-y-6">
							<div className="space-y-4">
								<div>
									<label
										htmlFor="kit-modo"
										className="block text-sm font-medium text-foreground mb-1"
									>
										Modo de Generación
									</label>
									<select
										id="kit-modo"
										value={generarFormData.modo}
										onChange={(e) =>
											setGenerarFormData({
												...generarFormData,
												modo: e.target.value,
											})
										}
										className="w-full px-4 py-2 rounded-xl border border-border bg-background focus:ring-2 focus:ring-ring outline-none text-foreground"
									>
										<option value="padre_con_subgrupos">
											Unir todo en 1 Cotización (Vehículos como Subgrupos)
										</option>
										<option value="independientes">
											Crear{" "}
											{generarFormData.vehiculos.filter(
												(v) => v.descripcion_vehiculo.trim() !== "",
											).length || "N"}{" "}
											Cotizaciones Separadas
										</option>
									</select>
								</div>

								<div className="border-t border-border pt-4">
									<span className="block text-sm font-medium text-foreground mb-2">
										Lista de Vehículos / Placas
									</span>
									<div className="space-y-2">
										{generarFormData.vehiculos.map((v, idx) => (
											<div
												// biome-ignore lint/suspicious/noArrayIndexKey: formulario controlado por índice
												key={idx}
												className="flex gap-2"
											>
												<input
													type="text"
													placeholder={`Ej. Placa ABC-${123 + idx} o Bus #${idx + 1}`}
													value={v.descripcion_vehiculo}
													onChange={(e) => {
														const newVehiculos = [...generarFormData.vehiculos];
														newVehiculos[idx].descripcion_vehiculo =
															e.target.value;
														setGenerarFormData({
															...generarFormData,
															vehiculos: newVehiculos,
														});
													}}
													className="flex-1 px-4 py-2 rounded-xl border border-border bg-background focus:ring-2 focus:ring-ring outline-none text-foreground"
												/>
												<button
													type="button"
													onClick={() => {
														const newVehiculos = [...generarFormData.vehiculos];
														newVehiculos.splice(idx, 1);
														setGenerarFormData({
															...generarFormData,
															vehiculos: newVehiculos,
														});
													}}
													className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
												>
													✕
												</button>
											</div>
										))}
										<button
											type="button"
											onClick={() =>
												setGenerarFormData({
													...generarFormData,
													vehiculos: [
														...generarFormData.vehiculos,
														{ descripcion_vehiculo: "" },
													],
												})
											}
											className="text-sm text-primary font-medium mt-2 flex items-center gap-1 hover:underline"
										>
											+ Añadir otro vehículo
										</button>
									</div>
								</div>
							</div>
						</div>

						<div className="p-6 border-t border-border bg-muted/30 flex justify-end gap-3 shrink-0">
							<button
								type="button"
								onClick={() => setShowGenerarModal(false)}
								className="px-4 py-2 text-foreground font-medium hover:bg-muted rounded-xl transition-colors"
							>
								Cancelar
							</button>
							<button
								type="button"
								onClick={handleGenerarMasivoSubmit}
								className="px-4 py-2 bg-primary hover:opacity-90 text-primary-foreground font-medium rounded-xl shadow-sm transition-all active:scale-95 flex items-center gap-2"
							>
								Generar Cotizaciones
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
