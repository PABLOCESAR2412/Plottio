import { Trash2, X } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import type { ClienteOption, ItemOrdenTrabajo, OrdenTrabajo } from "./types";

export interface OrderCreateFormData {
	clienteNombre: string;
	clienteTelefono: string;
	placa: string;
	vehiculoTipo: string;
	prioridad: OrdenTrabajo["prioridad"];
	fechaFin: string;
	items: ItemOrdenTrabajo[];
}

export interface OrderCreateModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSubmit: (data: OrderCreateFormData) => Promise<void> | void;
	clientes: ClienteOption[];
	categoriasPrecios: string[];
	initialData?: Partial<OrderCreateFormData>;
}

export const OrderCreateModal: React.FC<OrderCreateModalProps> = ({
	isOpen,
	onClose,
	onSubmit,
	clientes,
	categoriasPrecios,
	initialData,
}) => {
	const defaultCategory = categoriasPrecios[0] || "Bus Urbano";

	const [clienteNombre, setClienteNombre] = useState(
		initialData?.clienteNombre || "",
	);
	const [clienteTelefono, setClienteTelefono] = useState(
		initialData?.clienteTelefono || "",
	);
	const [placa, setPlaca] = useState(initialData?.placa || "");
	const [vehiculoTipo, setVehiculoTipo] = useState(
		initialData?.vehiculoTipo || defaultCategory,
	);
	const [prioridad, setPrioridad] = useState<OrdenTrabajo["prioridad"]>(
		initialData?.prioridad || "Media",
	);
	const [fechaFin, setFechaFin] = useState(
		initialData?.fechaFin ||
			new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
				.toISOString()
				.split("T")[0],
	);

	// Order items
	const [orderItems, setOrderItems] = useState<ItemOrdenTrabajo[]>(
		initialData?.items || [],
	);
	const [itemDesc, setItemDesc] = useState("");
	const [itemCant, setItemCant] = useState(1);
	const [itemPrecio, setItemPrecio] = useState(0);

	// Synchronize when modal opens or initialData changes
	useEffect(() => {
		if (isOpen) {
			setClienteNombre(initialData?.clienteNombre || "");
			setClienteTelefono(initialData?.clienteTelefono || "");
			setPlaca(initialData?.placa || "");
			setVehiculoTipo(
				initialData?.vehiculoTipo || categoriasPrecios[0] || "Bus Urbano",
			);
			setPrioridad(initialData?.prioridad || "Media");
			setFechaFin(
				initialData?.fechaFin ||
					new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
						.toISOString()
						.split("T")[0],
			);
			setOrderItems(initialData?.items || []);
			setItemDesc("");
			setItemCant(1);
			setItemPrecio(0);
		}
	}, [isOpen, initialData, categoriasPrecios]);

	if (!isOpen) return null;

	const handleAddItem = (e: React.FormEvent) => {
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

	const handleRemoveItem = (idx: number) => {
		setOrderItems((prev) => prev.filter((_, i) => i !== idx));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!clienteNombre.trim() || orderItems.length === 0) return;

		await onSubmit({
			clienteNombre: clienteNombre.trim(),
			clienteTelefono: clienteTelefono.trim(),
			placa: placa.trim().toUpperCase() || "S/P",
			vehiculoTipo,
			prioridad,
			fechaFin,
			items: orderItems,
		});
	};

	return (
		<div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4">
			<button
				type="button"
				aria-label="Cerrar modal"
				className="fixed inset-0 bg-black/50 backdrop-blur-sm"
				onClick={onClose}
			/>
			<div className="relative w-full max-w-2xl max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xl animate-slide-in mx-0 sm:mx-4">
				<div className="flex items-center justify-between pb-3 border-b border-border mb-4">
					<h3 className="text-lg font-bold text-foreground">
						Nueva Orden de Trabajo
					</h3>
					<button
						type="button"
						onClick={onClose}
						className="p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer"
						title="Cerrar"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				<div className="grid gap-4 sm:grid-cols-2 max-h-[480px] overflow-y-auto pr-1">
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
											c.nombre.toLowerCase() === e.target.value.toLowerCase(),
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
										setPrioridad(e.target.value as OrdenTrabajo["prioridad"])
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
							<form onSubmit={handleAddItem} className="space-y-2">
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
										onChange={(e) => setItemPrecio(Number(e.target.value))}
										className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
									/>
								</div>
								<button
									type="submit"
									className="w-full rounded bg-primary py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 cursor-pointer"
								>
									Insertar Item
								</button>
							</form>
						</div>

						{/* Items preview list */}
						<div className="max-h-[160px] overflow-y-auto divide-y divide-border pr-1">
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
										onClick={() => handleRemoveItem(idx)}
										className="text-destructive hover:bg-destructive/10 p-1 rounded cursor-pointer"
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
						onClick={onClose}
						className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary transition-colors cursor-pointer"
					>
						Cancelar
					</button>
					<button
						type="button"
						disabled={!clienteNombre.trim() || orderItems.length === 0}
						onClick={handleSubmit}
						className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-colors disabled:opacity-50 cursor-pointer"
					>
						Iniciar Trabajo
					</button>
				</div>
			</div>
		</div>
	);
};
