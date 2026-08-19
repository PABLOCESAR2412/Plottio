import { useMutation, useQuery } from "convex/react";
import {
	AlertTriangle,
	ArrowRightLeft,
	Loader2,
	Package,
	PackageSearch,
	Plus,
	Settings2,
	Edit2,
	Trash2,
	TrendingDown,
	TrendingUp,
	X,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useSessionStore } from "../store/useSessionStore";
import { TableSkeleton } from "./Skeleton";

export const InventarioView: React.FC = () => {
	const currentUser = useSessionStore((s) => s.currentUser);
	const rawSucursales = useQuery(api.organizacion.getSucursales, {}) as
		| Array<{ id: string; nombre: string }>
		| undefined;
	const sucursales = (rawSucursales ?? []).map((s) => ({
		id: (s as { _id?: string })._id ?? s.id,
		nombre: s.nombre,
	}));
	const inventario = useQuery(
		api.inventario.getInventarioConsolidado,
		currentUser ? { usuarioId: currentUser.id as Id<"usuarios"> } : "skip",
	);

	const createItemMutation = useMutation(api.inventario.createInventarioItems);
	const transferirMutation = useMutation(api.inventario.transferirInventario);
	const updateItemMutation = useMutation(api.inventario.updateInventarioItem);
	const deleteItemMutation = useMutation(api.inventario.deleteInventarioItem);

	const [activeTab, setActiveTab] = useState<
		"items" | "movimientos" | "alertas"
	>("items");

	// Modals state
	const [showNewItemModal, setShowNewItemModal] = useState(false);
	const [showEditItemModal, setShowEditItemModal] = useState(false);
	const [editingItem, setEditingItem] = useState<{ id: Id<"inventarioItems">, nombre: string, tipo: string, descripcion: string, costoUnitario: number, unidadMedida: string } | null>(null);
	const [showTransferModal, setShowTransferModal] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// New Item Form
	const [newItem, setNewItem] = useState({
		nombre: "",
		tipo: "",
		descripcion: "",
		costoUnitario: 0,
		unidadMedida: "Unidades",
	});

	// Transfer Form
	const [transfer, setTransfer] = useState({
		desde: "",
		hacia: "",
		itemId: "",
		cantidad: 0,
	});



	const handleCreateItem = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!currentUser) return;
		setIsSubmitting(true);
		try {
			await createItemMutation({
				usuarioId: currentUser.id as Id<"usuarios">,
				items: [
					{
						...newItem,
						costoUnitario: Number.isNaN(newItem.costoUnitario)
							? 0
							: newItem.costoUnitario,
					},
				],
			});
			toast.success("Ítem creado exitosamente");
			setShowNewItemModal(false);
			setNewItem({
				nombre: "",
				tipo: "",
				descripcion: "",
				costoUnitario: NaN,
				unidadMedida: "Unidades",
			});
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Error al crear ítem",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	
	const handleEditItem = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!currentUser || !editingItem) return;
		setIsSubmitting(true);
		try {
			await updateItemMutation({
				usuarioId: currentUser.id as Id<"usuarios">,
				itemId: editingItem.id,
				nombre: editingItem.nombre,
				tipo: editingItem.tipo,
				descripcion: editingItem.descripcion,
				costoUnitario: Number.isNaN(editingItem.costoUnitario) ? 0 : editingItem.costoUnitario,
				unidadMedida: editingItem.unidadMedida,
			});
			toast.success("Ítem actualizado exitosamente");
			setShowEditItemModal(false);
			setEditingItem(null);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Error al actualizar ítem");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDeleteItem = async (itemId: Id<"inventarioItems">) => {
		if (!currentUser) return;
		if (!window.confirm("¿Está seguro de eliminar este ítem y su stock?")) return;
		try {
			await deleteItemMutation({
				usuarioId: currentUser.id as Id<"usuarios">,
				itemId,
			});
			toast.success("Ítem eliminado exitosamente");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Error al eliminar ítem");
		}
	};

	const handleTransfer = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!currentUser) return;
		setIsSubmitting(true);
		try {
			await transferirMutation({
				usuarioId: currentUser.id as Id<"usuarios">,
				desde: transfer.desde as Id<"sucursales">,
				hacia: transfer.hacia as Id<"sucursales">,
				itemId: transfer.itemId as Id<"inventarioItems">,
				cantidad: transfer.cantidad,
			});
			toast.success("Transferencia realizada con éxito");
			setShowTransferModal(false);
			setTransfer({ desde: "", hacia: "", itemId: "", cantidad: 0 });
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Error al transferir",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	if (inventario === undefined) {
		return <TableSkeleton />;
	}

	return (
		<div className="space-y-6 animate-fade-in relative">
			<div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
						<PackageSearch className="h-8 w-8 text-primary" />
						Inventario Distribuido
					</h1>
					<p className="text-muted-foreground mt-1">
						Gestión de stock, transferencias entre sucursales y alertas de
						reabastecimiento.
					</p>
				</div>
				<div className="flex gap-2">
					<button
						type="button"
						onClick={() => setShowTransferModal(true)}
						className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground font-semibold rounded-lg hover:bg-secondary/80 transition-colors cursor-pointer"
					>
						<ArrowRightLeft className="h-4 w-4" />
						Transferir
					</button>
					<button
						type="button"
						onClick={() => setShowNewItemModal(true)}
						className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:opacity-90 transition-colors cursor-pointer"
					>
						<Plus className="h-4 w-4" />
						Nuevo Ítem
					</button>
				</div>
			</div>

			{/* Stats row */}
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<div className="p-4 bg-card border border-border rounded-xl shadow-sm flex items-center gap-4">
					<div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg">
						<Package className="h-6 w-6" />
					</div>
					<div>
						<p className="text-sm font-medium text-muted-foreground">
							Total Ítems
						</p>
						<p className="text-2xl font-bold text-foreground">
							{inventario ? inventario.length : "..."}
						</p>
					</div>
				</div>

				<div className="p-4 bg-card border border-border rounded-xl shadow-sm flex items-center gap-4">
					<div className="p-3 bg-orange-500/10 text-orange-500 rounded-lg">
						<AlertTriangle className="h-6 w-6" />
					</div>
					<div>
						<p className="text-sm font-medium text-muted-foreground">
							Alertas Stock
						</p>
						<p className="text-2xl font-bold text-foreground">
							{inventario
								? (inventario ?? []).filter(
										(i) => i.cantidad_total <= i.cantidad_minima_total,
									).length
								: "..."}
						</p>
					</div>
				</div>

				<div className="p-4 bg-card border border-border rounded-xl shadow-sm flex items-center gap-4">
					<div className="p-3 bg-green-500/10 text-green-500 rounded-lg">
						<TrendingUp className="h-6 w-6" />
					</div>
					<div>
						<p className="text-sm font-medium text-muted-foreground">
							Entradas (Mes)
						</p>
						<p className="text-2xl font-bold text-foreground">--</p>
					</div>
				</div>

				<div className="p-4 bg-card border border-border rounded-xl shadow-sm flex items-center gap-4">
					<div className="p-3 bg-red-500/10 text-red-500 rounded-lg">
						<TrendingDown className="h-6 w-6" />
					</div>
					<div>
						<p className="text-sm font-medium text-muted-foreground">
							Salidas (Mes)
						</p>
						<p className="text-2xl font-bold text-foreground">--</p>
					</div>
				</div>
			</div>

			<div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col h-[500px]">
				{/* Tabs */}
				<div className="flex border-b border-border px-4 pt-2 gap-4 bg-secondary/20 shrink-0">
					<button
						type="button"
						onClick={() => setActiveTab("items")}
						className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
							activeTab === "items"
								? "border-primary text-primary"
								: "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
						}`}
					>
						Ítems de Inventario
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("movimientos")}
						className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
							activeTab === "movimientos"
								? "border-primary text-primary"
								: "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
						}`}
					>
						Movimientos y Auditoría
					</button>
				</div>

				{/* List Content */}
				<div className="flex-1 overflow-auto p-0">
					<table className="w-full text-left text-sm whitespace-nowrap">
						<thead className="bg-secondary/40 sticky top-0 z-10 backdrop-blur-md">
							<tr>
								<th className="px-6 py-3 font-semibold text-muted-foreground">
									Ítem / Código
								</th>
								<th className="px-6 py-3 font-semibold text-muted-foreground">
									Categoría
								</th>
								<th className="px-6 py-3 font-semibold text-muted-foreground text-right">
									Stock Actual
								</th>
								<th className="px-6 py-3 font-semibold text-muted-foreground text-right">
									Stock Mínimo
								</th>
								<th className="px-6 py-3 font-semibold text-muted-foreground text-center">
									Estado
								</th>
								<th className="px-6 py-3 font-semibold text-muted-foreground text-right">
									Acciones
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border/50">
							{inventario?.length === 0 ? (
								<tr>
									<td
										colSpan={6}
										className="px-6 py-12 text-center text-muted-foreground"
									>
										No hay ítems en el inventario.
									</td>
								</tr>
							) : (
								inventario.map((item) => (
									<tr
										key={item.item_id}
										className="hover:bg-muted/30 transition-colors"
									>
										<td className="px-6 py-4">
											<p className="font-semibold text-foreground">
												{item.nombre}
											</p>
											<p className="text-xs text-muted-foreground">
												ID: {item.item_id.substring(0, 8)}
											</p>
										</td>
										<td className="px-6 py-4">
											<span className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs font-medium">
												{item.tipo || "General"}
											</span>
										</td>
										<td className="px-6 py-4 text-right font-bold text-foreground">
											{item.cantidad_total} {item.unidadMedida}
										</td>
										<td className="px-6 py-4 text-right text-muted-foreground">
											{item.cantidad_minima_total} {item.unidadMedida}
										</td>
										<td className="px-6 py-4 text-center">
											{item.cantidad_total <= item.cantidad_minima_total ? (
												<span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-500 rounded text-xs font-bold uppercase">
													<AlertTriangle className="h-3 w-3" />
													Bajo
												</span>
											) : (
												<span className="inline-flex px-2 py-1 bg-green-500/10 text-green-500 rounded text-xs font-bold uppercase">
													Óptimo
												</span>
											)}
										</td>
										<td className="px-6 py-4 text-right">

											<div className="flex justify-end gap-1">
												<button
													type="button"
													onClick={() => {
														setTransfer({ desde: "", hacia: "", itemId: item.item_id, cantidad: 0 });
														setShowTransferModal(true);
													}}
													className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
													title="Transferir"
												>
													<ArrowRightLeft className="h-4 w-4" />
												</button>
												<button
													type="button"
													onClick={() => {
														setEditingItem({
															id: item.item_id,
															nombre: item.nombre,
															tipo: item.tipo || "",
															descripcion: "",
															costoUnitario: item.costo_unitario || 0,
															unidadMedida: item.unidadMedida
														});
														setShowEditItemModal(true);
													}}
													className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
													title="Editar"
												>
													<Edit2 className="h-4 w-4" />
												</button>
												<button
													type="button"
													onClick={() => handleDeleteItem(item.item_id as Id<"inventarioItems">)}
													className="p-2 hover:bg-destructive/10 rounded-lg text-destructive transition-colors cursor-pointer"
													title="Eliminar"
												>
													<Trash2 className="h-4 w-4" />
												</button>
											</div>

										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>

			{/* MODAL: Nuevo Ítem */}
			{showNewItemModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
					<div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-fade-in">
						<div className="p-4 border-b border-border flex justify-between items-center bg-secondary/50">
							<h3 className="font-bold text-foreground flex items-center gap-2">
								<Plus className="h-5 w-5 text-primary" />
								Crear Nuevo Ítem
							</h3>
							<button
								type="button"
								onClick={() => setShowNewItemModal(false)}
								className="text-muted-foreground hover:text-foreground"
							>
								<X className="h-5 w-5" />
							</button>
						</div>
						<form onSubmit={handleCreateItem} className="p-5 space-y-4">
							<div>
								<label
									htmlFor="itemNombre"
									className="block text-xs font-semibold text-foreground mb-1.5"
								>
									Nombre del material
								</label>
								<input
									id="itemNombre"
									type="text"
									required
									value={newItem.nombre}
									onChange={(e) =>
										setNewItem({ ...newItem, nombre: e.target.value })
									}
									className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
									placeholder="Ej. Vinilo Reflectivo 3M"
								/>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label
										htmlFor="itemTipo"
										className="block text-xs font-semibold text-foreground mb-1.5"
									>
										Categoría
									</label>
									<input
										id="itemTipo"
										type="text"
										value={newItem.tipo}
										onChange={(e) =>
											setNewItem({ ...newItem, tipo: e.target.value })
										}
										className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
										placeholder="Ej. Vinilos"
									/>
								</div>
								<div>
									<label
										htmlFor="itemUnidadMedida"
										className="block text-xs font-semibold text-foreground mb-1.5"
									>
										Unidad
									</label>
									<select
										id="itemUnidadMedida"
										value={newItem.unidadMedida}
										onChange={(e) =>
											setNewItem({ ...newItem, unidadMedida: e.target.value })
										}
										className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
									>
										<option value="Metros">Metros</option>
										<option value="Rollos">Rollos</option>
										<option value="Unidades">Unidades</option>
										<option value="Litros">Litros</option>
									</select>
								</div>
							</div>
							<div>
								<label
									htmlFor="itemCostoUnitario"
									className="block text-xs font-semibold text-foreground mb-1.5"
								>
									Costo Unitario ($)
								</label>
								<input
									id="itemCostoUnitario"
									type="number"
									min="0"
									step="0.01"
									value={
										Number.isNaN(newItem.costoUnitario)
											? ""
											: newItem.costoUnitario
									}
									onChange={(e) =>
										setNewItem({
											...newItem,
											costoUnitario:
												e.target.value === ""
													? NaN
													: parseFloat(e.target.value),
										})
									}
									className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
									placeholder="0.00"
								/>
							</div>
							<div>
								<label
									htmlFor="itemDescripcion"
									className="block text-xs font-semibold text-foreground mb-1.5"
								>
									Descripción (Opcional)
								</label>
								<textarea
									id="itemDescripcion"
									rows={2}
									value={newItem.descripcion}
									onChange={(e) =>
										setNewItem({ ...newItem, descripcion: e.target.value })
									}
									className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none resize-none"
									placeholder="Detalles del material..."
								/>
							</div>
							<div className="pt-4 flex gap-3">
								<button
									type="button"
									onClick={() => setShowNewItemModal(false)}
									className="w-full py-2.5 rounded-lg border border-border text-foreground font-semibold text-sm hover:bg-secondary transition-colors cursor-pointer"
								>
									Cancelar
								</button>
								<button
									type="submit"
									disabled={isSubmitting}
									className="w-full flex justify-center py-2.5 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
								>
									{isSubmitting ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										"Guardar Ítem"
									)}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			
			{/* MODAL: Editar Ítem */}
			{showEditItemModal && editingItem && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
					<div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-fade-in">
						<div className="p-4 border-b border-border flex justify-between items-center bg-secondary/50">
							<h3 className="font-bold text-foreground flex items-center gap-2">
								<Edit2 className="h-5 w-5 text-primary" />
								Editar Ítem
							</h3>
							<button
								type="button"
								onClick={() => setShowEditItemModal(false)}
								className="text-muted-foreground hover:text-foreground"
							>
								<X className="h-5 w-5" />
							</button>
						</div>
						<form onSubmit={handleEditItem} className="p-5 space-y-4">
							<div>
								<label
									htmlFor="editItemNombre"
									className="block text-xs font-semibold text-foreground mb-1.5"
								>
									Nombre del material
								</label>
								<input
									id="editItemNombre"
									type="text"
									required
									value={editingItem.nombre}
									onChange={(e) =>
										setEditingItem({ ...editingItem, nombre: e.target.value })
									}
									className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
								/>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label
										htmlFor="editItemTipo"
										className="block text-xs font-semibold text-foreground mb-1.5"
									>
										Categoría
									</label>
									<input
										id="editItemTipo"
										type="text"
										value={editingItem.tipo}
										onChange={(e) =>
											setEditingItem({ ...editingItem, tipo: e.target.value })
										}
										className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
									/>
								</div>
								<div>
									<label
										htmlFor="editItemUnidadMedida"
										className="block text-xs font-semibold text-foreground mb-1.5"
									>
										Unidad
									</label>
									<select
										id="editItemUnidadMedida"
										value={editingItem.unidadMedida}
										onChange={(e) =>
											setEditingItem({ ...editingItem, unidadMedida: e.target.value })
										}
										className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
									>
										<option value="Metros">Metros</option>
										<option value="Rollos">Rollos</option>
										<option value="Unidades">Unidades</option>
										<option value="Litros">Litros</option>
									</select>
								</div>
							</div>
							<div>
								<label
									htmlFor="editItemCostoUnitario"
									className="block text-xs font-semibold text-foreground mb-1.5"
								>
									Costo Unitario ($)
								</label>
								<input
									id="editItemCostoUnitario"
									type="number"
									min="0"
									step="0.01"
									value={
										Number.isNaN(editingItem.costoUnitario)
											? ""
											: editingItem.costoUnitario
									}
									onChange={(e) =>
										setEditingItem({
											...editingItem,
											costoUnitario:
												e.target.value === ""
													? NaN
													: parseFloat(e.target.value),
										})
									}
									className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
								/>
							</div>
							<div className="pt-4 flex gap-3">
								<button
									type="button"
									onClick={() => setShowEditItemModal(false)}
									className="w-full py-2.5 rounded-lg border border-border text-foreground font-semibold text-sm hover:bg-secondary transition-colors cursor-pointer"
								>
									Cancelar
								</button>
								<button
									type="submit"
									disabled={isSubmitting}
									className="w-full flex justify-center py-2.5 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
								>
									{isSubmitting ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										"Actualizar Ítem"
									)}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* MODAL: Transferir */}
			{showTransferModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
					<div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-fade-in">
						<div className="p-4 border-b border-border flex justify-between items-center bg-secondary/50">
							<h3 className="font-bold text-foreground flex items-center gap-2">
								<ArrowRightLeft className="h-5 w-5 text-primary" />
								Transferir Inventario
							</h3>
							<button
								type="button"
								onClick={() => setShowTransferModal(false)}
								className="text-muted-foreground hover:text-foreground"
							>
								<X className="h-5 w-5" />
							</button>
						</div>
						<form onSubmit={handleTransfer} className="p-5 space-y-4">
							<div>
								<label
									htmlFor="transferItemId"
									className="block text-xs font-semibold text-foreground mb-1.5"
								>
									Material a Transferir
								</label>
								<select
									id="transferItemId"
									required
									value={transfer.itemId}
									onChange={(e) =>
										setTransfer({ ...transfer, itemId: e.target.value })
									}
									className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
								>
									<option value="">-- Seleccionar --</option>
									{inventario?.map((item) => (
										<option key={item.item_id} value={item.item_id}>
											{item.nombre} (Disp: {item.cantidad_total})
										</option>
									))}
								</select>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label
										htmlFor="transferDesde"
										className="block text-xs font-semibold text-foreground mb-1.5"
									>
										Origen
									</label>
									<select
										id="transferDesde"
										required
										value={transfer.desde}
										onChange={(e) =>
											setTransfer({ ...transfer, desde: e.target.value })
										}
										className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
									>
										<option value="">-- Origen --</option>
										{sucursales.map((s) => (
											<option key={s.id} value={s.id}>
												{s.nombre}
											</option>
										))}
									</select>
								</div>
								<div>
									<label
										htmlFor="transferHacia"
										className="block text-xs font-semibold text-foreground mb-1.5"
									>
										Destino
									</label>
									<select
										id="transferHacia"
										required
										value={transfer.hacia}
										onChange={(e) =>
											setTransfer({ ...transfer, hacia: e.target.value })
										}
										className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
									>
										<option value="">-- Destino --</option>
										{sucursales.map((s) => (
											<option key={s.id} value={s.id}>
												{s.nombre}
											</option>
										))}
									</select>
								</div>
							</div>
							<div>
								<label
									htmlFor="transferCantidad"
									className="block text-xs font-semibold text-foreground mb-1.5"
								>
									Cantidad a Mover
								</label>
								<input
									id="transferCantidad"
									type="number"
									required
									min="1"
									value={
										Number.isNaN(transfer.cantidad) ? "" : transfer.cantidad
									}
									onChange={(e) =>
										setTransfer({
											...transfer,
											cantidad:
												e.target.value === ""
													? 0
													: parseInt(e.target.value, 10),
										})
									}
									className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
								/>
							</div>
							<div className="pt-4 flex gap-3">
								<button
									type="button"
									onClick={() => setShowTransferModal(false)}
									className="w-full py-2.5 rounded-lg border border-border text-foreground font-semibold text-sm hover:bg-secondary transition-colors cursor-pointer"
								>
									Cancelar
								</button>
								<button
									type="submit"
									disabled={isSubmitting || transfer.desde === transfer.hacia}
									className="w-full flex justify-center py-2.5 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
								>
									{isSubmitting ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										"Transferir"
									)}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
};
