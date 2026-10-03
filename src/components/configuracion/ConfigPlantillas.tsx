import { useMutation, useQuery } from "convex/react";
import {
	Car,
	Check,
	Edit2,
	Plus,
	Settings,
	Trash2,
	TrendingUp,
	X,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useSessionStore } from "../../store/useSessionStore";
import type { PlantillaPrecio } from "../../types/data";
import { SuccessDialog } from "../SuccessDialog";

export function ConfigPlantillas() {
	const currentUser = useSessionStore((s) => s.currentUser);
	const usuarioId = currentUser?.id;

	const rawPlantillas = useQuery(
		api.plantillas.getPlantillas,
		usuarioId ? { usuarioId: usuarioId as Id<"usuarios"> } : "skip",
	);

	const rawCategorias = useQuery(
		api.plantillas.getCategoriasFull,
		usuarioId ? { usuarioId: usuarioId as Id<"usuarios"> } : "skip",
	);

	const createPlantillaMut = useMutation(api.plantillas.createPlantillaPrecio);
	const updatePlantillaMut = useMutation(api.plantillas.updatePlantillaPrecio);
	const deletePlantillaMut = useMutation(api.plantillas.deletePlantillaPrecio);
	const addCategoriaMut = useMutation(api.plantillas.addCategoriaPrecio);
	const updateCategoriaMut = useMutation(api.plantillas.updateCategoriaPrecio);
	const deleteCategoriaMut = useMutation(api.plantillas.deleteCategoriaPrecio);

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

	const categoriasMap = useMemo(() => {
		const map = new Map<string, string>();
		for (const c of rawCategorias ?? []) {
			map.set(c.nombre, c._id);
		}
		return map;
	}, [rawCategorias]);

	// Tab and category states
	const [activeCategoryTab, setActiveCategoryTab] = useState<string>(
		categoriasPrecios.length > 0 ? categoriasPrecios[0] : "Bus Urbano",
	);
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

	// Alert / Confirmation Modal
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

	const filteredTemplates = plantillasPrecios.filter(
		(p) => p.categoriaVehiculo === currentCategory,
	);

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

	return (
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
												onClick={() => handleDeleteJob(tpl.id, tpl.concepto)}
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
									onChange={(e) => setNewPrecioSugerido(Number(e.target.value))}
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
					Las modificaciones de tarifas solo afectarán a las nuevas cotizaciones
					y órdenes de trabajo creadas a futuro.
				</span>
			</div>

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
}
