import { useMutation, useQuery } from "convex/react";
import { Layers, PlusCircle, Search, Settings2,
	Tag,
	Edit2,
	Trash2 } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useSessionStore } from "../store/useSessionStore";
import { TableSkeleton } from "./Skeleton";

export function CatalogoView() {
	const currentUser = useSessionStore((s) => s.currentUser);
	const servicios = useQuery(
		api.catalogoServicios.getServicios,
		currentUser ? { usuarioId: currentUser.id as Id<"usuarios"> } : "skip",
	);

	const createServicio = useMutation(api.catalogoServicios.createServicio);
	const toggleActivo = useMutation(api.catalogoServicios.toggleActivo);
	const updateServicio = useMutation(api.catalogoServicios.updateServicio);
	const deleteServicio = useMutation(api.catalogoServicios.deleteServicio);

	const [searchTerm, setSearchTerm] = useState("");
	const [showModal, setShowModal] = useState(false);
	const [showEditModal, setShowEditModal] = useState(false);
	const [editingServicio, setEditingServicio] = useState<{ id: Id<"catalogoServicios">, nombre: string, categoria: string, precioBase: number } | null>(null);
	const [formData, setFormData] = useState({
		nombre: "",
		categoria: "general",
		precioBase: 0,
	});


	const filteredServicios = servicios.filter(
		(s) =>
			s.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
			s.categoria.toLowerCase().includes(searchTerm.toLowerCase()),
	);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!currentUser) return;
		try {
			await createServicio({
				usuarioId: currentUser.id as Id<"usuarios">,
				nombre: formData.nombre,
				categoria: formData.categoria,
				precioBase: Number(formData.precioBase),
			});
			toast.success("Servicio agregado al catálogo");
			setShowModal(false);
			setFormData({ nombre: "", categoria: "general", precioBase: 0 });
		} catch (err) {
			toast.error((err as Error).message || "Error al crear servicio");
		}
	};

	
	const handleEdit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!currentUser || !editingServicio) return;
		try {
			await updateServicio({
				usuarioId: currentUser.id as Id<"usuarios">,
				id: editingServicio.id,
				nombre: editingServicio.nombre,
				categoria: editingServicio.categoria,
				precioBase: Number(editingServicio.precioBase),
			});
			toast.success("Servicio actualizado exitosamente");
			setShowEditModal(false);
			setEditingServicio(null);
		} catch (err) {
			toast.error((err as Error).message || "Error al actualizar servicio");
		}
	};

	const handleDelete = async (id: Id<"catalogoServicios">) => {
		if (!currentUser) return;
		if (!window.confirm("¿Está seguro de eliminar este servicio del catálogo?")) return;
		try {
			await deleteServicio({
				usuarioId: currentUser.id as Id<"usuarios">,
				id,
			});
			toast.success("Servicio eliminado exitosamente");
		} catch (err) {
			toast.error((err as Error).message || "Error al eliminar servicio");
		}
	};

	const handleToggle = async (id: Id<"catalogoServicios">, actual: boolean) => {
		if (!currentUser) return;
		try {
			await toggleActivo({
				id,
				activo: !actual,
				usuarioId: currentUser.id as Id<"usuarios">,
			});
			toast.success(actual ? "Servicio desactivado" : "Servicio activado");
		} catch (_err) {
			toast.error("Error al cambiar estado");
		}
	};

	if (servicios === undefined) return <TableSkeleton />;

	return (
		<div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 p-6">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
						<Layers className="w-6 h-6 text-primary" />
						Catálogo de Servicios
					</h2>
					<p className="text-muted-foreground text-sm mt-1">
						Gestiona los servicios y placas base (Fase 9).
					</p>
				</div>
				<button
					type="button"
					onClick={() => setShowModal(true)}
					className="flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:opacity-90 text-primary-foreground rounded-xl transition-all shadow-sm active:scale-95"
				>
					<PlusCircle className="w-4 h-4" />
					<span className="font-medium">Nuevo Servicio</span>
				</button>
			</div>

			<div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
				<div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4">
					<div className="relative flex-1">
						<Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
						<input
							type="text"
							placeholder="Buscar servicio o categoría..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-background focus:ring-2 focus:ring-ring outline-none transition-all text-foreground"
						/>
					</div>
				</div>

				<div className="overflow-x-auto">
					<table className="w-full text-left text-sm text-foreground">
						<thead className="text-xs uppercase bg-muted text-muted-foreground">
							<tr>
								<th className="px-6 py-4 font-medium">Nombre</th>
								<th className="px-6 py-4 font-medium">Categoría</th>
								<th className="px-6 py-4 font-medium">Precio Base</th>
								<th className="px-6 py-4 font-medium">Estado</th>
								<th className="px-6 py-4 font-medium text-right">Acciones</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{filteredServicios.map((s) => (
								<tr key={s._id} className="hover:bg-muted/50 transition-colors">
									<td className="px-6 py-4">
										<div className="flex items-center gap-3">
											<div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
												<Tag className="w-4 h-4" />
											</div>
											<span className="font-medium text-foreground">
												{s.nombre}
											</span>
										</div>
									</td>
									<td className="px-6 py-4">
										<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground">
											{s.categoria}
										</span>
									</td>
									<td className="px-6 py-4 font-medium">
										${s.precioBase.toFixed(2)}
									</td>
									<td className="px-6 py-4">
										<span
											className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.activo ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-destructive/10 text-destructive"}`}
										>
											{s.activo ? "Activo" : "Inactivo"}
										</span>
									</td>
									
									<td className="px-6 py-4 text-right">
										<div className="flex justify-end gap-1">
											<button
												type="button"
												onClick={() => handleToggle(s._id, s.activo)}
												className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
												title={s.activo ? "Desactivar" : "Activar"}
											>
												<Settings2 className="w-4 h-4" />
											</button>
											<button
												type="button"
												onClick={() => {
													setEditingServicio({
														id: s._id,
														nombre: s.nombre,
														categoria: s.categoria,
														precioBase: s.precioBase
													});
													setShowEditModal(true);
												}}
												className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
												title="Editar"
											>
												<Edit2 className="w-4 h-4" />
											</button>
											<button
												type="button"
												onClick={() => handleDelete(s._id)}
												className="p-2 hover:bg-destructive/10 rounded-lg text-destructive transition-colors cursor-pointer"
												title="Eliminar"
											>
												<Trash2 className="w-4 h-4" />
											</button>
										</div>
									</td>

								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			{showModal && (
				<div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
					<div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
						<div className="p-6 border-b border-border">
							<h3 className="text-xl font-bold text-foreground">
								Nuevo Servicio
							</h3>
						</div>
						<form onSubmit={handleSubmit} className="p-6 space-y-4">
							<div>
								<label
									htmlFor="servicio-nombre"
									className="block text-sm font-medium text-foreground mb-1"
								>
									Nombre
								</label>
								<input
									id="servicio-nombre"
									required
									type="text"
									value={formData.nombre}
									onChange={(e) =>
										setFormData({ ...formData, nombre: e.target.value })
									}
									className="w-full px-4 py-2 rounded-xl border border-border bg-background focus:ring-2 focus:ring-ring outline-none text-foreground"
								/>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label
										htmlFor="servicio-categoria"
										className="block text-sm font-medium text-foreground mb-1"
									>
										Categoría
									</label>
									<select
										id="servicio-categoria"
										value={formData.categoria}
										onChange={(e) =>
											setFormData({ ...formData, categoria: e.target.value })
										}
										className="w-full px-4 py-2 rounded-xl border border-border bg-background focus:ring-2 focus:ring-ring outline-none text-foreground"
									>
										<option value="general">General</option>
										<option value="placa">Placa (Fase 9)</option>
										<option value="rotulado">Rotulado</option>
										<option value="cinta_seguridad">Cinta de Seguridad</option>
										<option value="sello">Sello</option>
										<option value="sticker">Sticker</option>
									</select>
								</div>
								<div>
									<label
										htmlFor="servicio-precio"
										className="block text-sm font-medium text-foreground mb-1"
									>
										Precio Base
									</label>
									<input
										id="servicio-precio"
										required
										type="number"
										step="0.01"
										min="0"
										value={formData.precioBase}
										onChange={(e) =>
											setFormData({
												...formData,
												precioBase: parseFloat(e.target.value),
											})
										}
										className="w-full px-4 py-2 rounded-xl border border-border bg-background focus:ring-2 focus:ring-ring outline-none text-foreground"
									/>
								</div>
							</div>

							<div className="flex gap-3 pt-4">
								<button
									type="button"
									onClick={() => setShowModal(false)}
									className="flex-1 px-4 py-2 border border-border text-foreground rounded-xl hover:bg-muted transition-colors font-medium"
								>
									Cancelar
								</button>
								<button
									type="submit"
									className="flex-1 px-4 py-2 bg-primary hover:opacity-90 text-primary-foreground rounded-xl transition-colors font-medium shadow-sm"
								>
									Guardar
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
