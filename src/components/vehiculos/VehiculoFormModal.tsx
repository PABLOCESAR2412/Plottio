import { X } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import type { Cliente, Empresa, VehiculoFormData } from "./types";

export interface VehiculoFormModalProps {
	isOpen: boolean;
	mode: "create" | "edit";
	initialData?: Partial<VehiculoFormData>;
	categorias: string[];
	clientes: Cliente[];
	empresas: Array<
		Pick<Empresa, "id" | "nombre"> & { contactoTelefono?: string }
	>;
	onClose: () => void;
	onSubmit: (data: VehiculoFormData) => Promise<void> | void;
}

export const VehiculoFormModal: React.FC<VehiculoFormModalProps> = ({
	isOpen,
	mode,
	initialData,
	categorias,
	clientes,
	empresas,
	onClose,
	onSubmit,
}) => {
	const defaultCategory = categorias[0] || "Bus Urbano";

	const [placa, setPlaca] = useState("");
	const [categoria, setCategoria] = useState(defaultCategory);
	const [marca, setMarca] = useState("");
	const [modelo, setModelo] = useState("");
	const [año, setAño] = useState("");
	const [numeroSerie, setNumeroSerie] = useState("");
	const [propietarioTipo, setPropietarioTipo] = useState<"cliente" | "empresa">(
		"cliente",
	);
	const [propietarioId, setPropietarioId] = useState("");
	const [estado, setEstado] = useState<
		"Activo" | "En Mantenimiento" | "Inactivo"
	>("Activo");

	useEffect(() => {
		if (isOpen) {
			setPlaca(initialData?.placa || "");
			setCategoria(initialData?.categoria || categorias[0] || "Bus Urbano");
			setMarca(initialData?.marca || "");
			setModelo(initialData?.modelo || "");
			setAño(initialData?.anio || "");
			setNumeroSerie(initialData?.numeroSerie || "");
			const propTipo = initialData?.propietarioTipo || "cliente";
			setPropietarioTipo(propTipo);
			if (initialData?.propietarioId) {
				setPropietarioId(initialData.propietarioId);
			} else {
				setPropietarioId(
					propTipo === "cliente"
						? clientes[0]?.id || ""
						: empresas[0]?.id || "",
				);
			}
			setEstado(initialData?.estado || "Activo");
		}
	}, [isOpen, initialData, categorias, clientes, empresas]);

	if (!isOpen) return null;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!placa.trim()) return;

		await onSubmit({
			placa: placa.trim().toUpperCase(),
			categoria,
			marca: marca.trim(),
			modelo: modelo.trim(),
			anio: año.trim() || "2025",
			numeroSerie:
				numeroSerie.trim() || `S/N-${Date.now().toString().slice(-6)}`,
			propietarioId,
			propietarioTipo,
			estado,
		});
	};

	const title =
		mode === "create" ? "Registrar Nuevo Vehículo" : "Editar Datos de Vehículo";
	const submitText = mode === "create" ? "Guardar Vehículo" : "Guardar Cambios";

	return (
		<div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4">
			<button
				type="button"
				aria-label="Cerrar modal"
				className="fixed inset-0 bg-black/50 backdrop-blur-sm"
				onClick={onClose}
			/>
			<div className="relative w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xl animate-slide-in mx-0 sm:mx-4">
				<div className="flex items-center justify-between pb-3 border-b border-border mb-4">
					<h3 className="text-lg font-bold text-foreground">{title}</h3>
					<button
						type="button"
						onClick={onClose}
						className="p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer"
						title="Cerrar"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label
								htmlFor="vehiculo-placa"
								className="block text-xs font-semibold text-muted-foreground mb-1"
							>
								Placa *
							</label>
							<input
								id="vehiculo-placa"
								type="text"
								required
								value={placa}
								onChange={(e) => setPlaca(e.target.value)}
								className="w-full rounded-lg border border-border bg-background px-3 py-3 sm:py-2 text-[16px] sm:text-sm text-foreground focus:border-ring focus:outline-none"
								placeholder="Ej. PBA-3421"
							/>
						</div>
						<div>
							<label
								htmlFor="vehiculo-categoria"
								className="block text-xs font-semibold text-muted-foreground mb-1"
							>
								Categoría *
							</label>
							<select
								id="vehiculo-categoria"
								value={categoria}
								onChange={(e) => setCategoria(e.target.value)}
								className="w-full rounded-lg border border-border bg-background px-3 py-3 sm:py-2 text-[16px] sm:text-sm text-foreground focus:border-ring focus:outline-none"
							>
								{categorias.length === 0 && (
									<option value={categoria}>{categoria || "Bus Urbano"}</option>
								)}
								{categorias.map((cat) => (
									<option key={cat} value={cat}>
										{cat}
									</option>
								))}
							</select>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<label
								htmlFor="vehiculo-marca"
								className="block text-xs font-semibold text-muted-foreground mb-1"
							>
								Marca
							</label>
							<input
								id="vehiculo-marca"
								type="text"
								value={marca}
								onChange={(e) => setMarca(e.target.value)}
								className="w-full rounded-lg border border-border bg-background px-3 py-3 sm:py-2 text-[16px] sm:text-sm text-foreground focus:border-ring focus:outline-none"
								placeholder="Ej. Hino"
							/>
						</div>
						<div>
							<label
								htmlFor="vehiculo-modelo"
								className="block text-xs font-semibold text-muted-foreground mb-1"
							>
								Modelo
							</label>
							<input
								id="vehiculo-modelo"
								type="text"
								value={modelo}
								onChange={(e) => setModelo(e.target.value)}
								className="w-full rounded-lg border border-border bg-background px-3 py-3 sm:py-2 text-[16px] sm:text-sm text-foreground focus:border-ring focus:outline-none"
								placeholder="Ej. AK8J"
							/>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<label
								htmlFor="vehiculo-anio"
								className="block text-xs font-semibold text-muted-foreground mb-1"
							>
								Año
							</label>
							<input
								id="vehiculo-anio"
								type="text"
								value={año}
								onChange={(e) => setAño(e.target.value)}
								className="w-full rounded-lg border border-border bg-background px-3 py-3 sm:py-2 text-[16px] sm:text-sm text-foreground focus:border-ring focus:outline-none"
								placeholder="Ej. 2020"
							/>
						</div>
					</div>

					<div className="border-t border-border pt-3">
						<div className="flex gap-4 mb-3">
							<label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
								<input
									type="radio"
									checked={propietarioTipo === "cliente"}
									onChange={() => {
										setPropietarioTipo("cliente");
										setPropietarioId(clientes[0]?.id || "");
									}}
									className="cursor-pointer"
								/>
								Cliente Particular
							</label>
							<label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
								<input
									type="radio"
									checked={propietarioTipo === "empresa"}
									onChange={() => {
										setPropietarioTipo("empresa");
										setPropietarioId(empresas[0]?.id || "");
									}}
									className="cursor-pointer"
								/>
								Empresa / Flota
							</label>
						</div>

						<label
							htmlFor="vehiculo-propietario"
							className="block text-xs font-semibold text-muted-foreground mb-1"
						>
							{mode === "create"
								? "Asignar Propietario *"
								: "Cambiar Propietario *"}
						</label>
						<select
							id="vehiculo-propietario"
							required
							value={propietarioId}
							onChange={(e) => setPropietarioId(e.target.value)}
							className="w-full rounded-lg border border-border bg-background px-3 py-3 sm:py-2 text-[16px] sm:text-sm text-foreground focus:border-ring focus:outline-none"
						>
							<option value="" disabled>
								Seleccionar propietario...
							</option>
							{propietarioTipo === "cliente"
								? clientes.map((c) => (
										<option key={c.id} value={c.id}>
											{c.nombre}
										</option>
									))
								: empresas.map((e) => (
										<option key={e.id} value={e.id}>
											{e.nombre}
										</option>
									))}
						</select>
					</div>

					<div>
						<label
							htmlFor="vehiculo-estado"
							className="block text-xs font-semibold text-muted-foreground mb-1"
						>
							Estado de Operación
						</label>
						<select
							id="vehiculo-estado"
							value={estado}
							onChange={(e) =>
								setEstado(
									e.target.value as "Activo" | "En Mantenimiento" | "Inactivo",
								)
							}
							className="w-full rounded-lg border border-border bg-background px-3 py-3 sm:py-2 text-[16px] sm:text-sm text-foreground focus:border-ring focus:outline-none"
						>
							<option value="Activo">Activo</option>
							<option value="En Mantenimiento">En Mantenimiento</option>
							<option value="Inactivo">Inactivo</option>
						</select>
					</div>

					<div className="flex gap-3 justify-end pt-2">
						<button
							type="button"
							onClick={onClose}
							className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary transition-colors cursor-pointer"
						>
							Cancelar
						</button>
						<button
							type="submit"
							className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-colors cursor-pointer"
						>
							{submitText}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};
