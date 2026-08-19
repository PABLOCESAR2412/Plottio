import { useMutation, useQuery } from "convex/react";
import { Factory, Package, PlusCircle, Search } from "lucide-react";
import type React from "react";
import { startTransition, useDeferredValue, useState } from "react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useSessionStore } from "../store/useSessionStore";
import { TableSkeleton } from "./Skeleton";

export function LotesProduccionView() {
	const currentUser = useSessionStore((s) => s.currentUser);

	// Asumiremos que creas una query getLotes en convex/lotesProduccion.ts
	// Para fines de esta pantalla, necesitamos `api.lotesProduccion.getLotes` y `api.lotesProduccion.crearLoteProduccion`
	const lotes = useQuery(
		api.lotesProduccion.getLotes,
		currentUser ? { usuarioId: currentUser.id as Id<"usuarios"> } : "skip",
	);
	const placas = useQuery(
		api.placasStock.getTodasPlacasStock,
		currentUser ? { usuarioId: currentUser.id as Id<"usuarios"> } : "skip",
	);

	const crearLote = useMutation(api.lotesProduccion.crearLoteProduccion);

	const [activeTab, setActiveTab] = useState<"lotes" | "placas">("lotes");
	const [searchTerm, setSearchTerm] = useState("");
	const deferredSearchTerm = useDeferredValue(searchTerm);
	const [showModal, setShowModal] = useState(false);
	const [showDetailModal, setShowDetailModal] = useState(false);
	const [selectedLote, setSelectedLote] = useState<any>(null);
	const [nuevoComentario, setNuevoComentario] = useState("");

	const cambiarEstado = useMutation(api.lotesProduccion.cambiarEstadoLote);
	const agregarComentario = useMutation(api.lotesProduccion.agregarComentarioLote);

	const [formData, setFormData] = useState({
		notas: "",
		cantidad: 50,
		material: "acrilico",
		ancho_cm: 40,
		alto_cm: 20,
		texto_base: "Ruta Genérica",
	});


	const filteredLotes = (lotes ?? []).filter(
		(l) =>
			l.numero.toLowerCase().includes(deferredSearchTerm.toLowerCase()) ||
			l.notas?.toLowerCase().includes(deferredSearchTerm.toLowerCase()),
	);

	const filteredPlacas = placas
		? placas.filter(
				(p) =>
					p.contenido_texto
						?.toLowerCase()
						.includes(deferredSearchTerm.toLowerCase()) ||
					p.lote_numero
						?.toLowerCase()
						.includes(deferredSearchTerm.toLowerCase()) ||
					p.estado.toLowerCase().includes(deferredSearchTerm.toLowerCase()),
			)
		: [];

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			const placas = Array.from({ length: formData.cantidad }, (_, i) => ({
				material: formData.material,
				ancho_cm: formData.ancho_cm,
				alto_cm: formData.alto_cm,
				contenido_texto: `${formData.texto_base} ${i + 1}`,
			}));

			await crearLote({
				usuarioId: currentUser.id as Id<"usuarios">,
				notas: formData.notas,
				placas,
			});

			toast.success(`Lote de ${formData.cantidad} placas enviado a producción`);
			setShowModal(false);
			setFormData({
				notas: "",
				cantidad: 50,
				material: "acrilico",
				ancho_cm: 40,
				alto_cm: 20,
				texto_base: "Ruta Genérica",
			});
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Error al crear lote");
		}
	};

	if (!currentUser) return <p>Cargando...</p>;
	if (lotes === undefined) return <TableSkeleton />;

	return (
		<div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 p-6">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
						<Factory className="w-6 h-6 text-primary" />
						Lotes de Producción
					</h2>
					<p className="text-muted-foreground text-sm mt-1">
						Gestión de stock de placas al por mayor (Fase 10).
					</p>
				</div>
				<button
					type="button"
					onClick={() => setShowModal(true)}
					className="flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:opacity-90 text-primary-foreground rounded-xl transition-all shadow-sm active:scale-95"
				>
					<PlusCircle className="w-4 h-4" />
					<span className="font-medium">Nuevo Lote</span>
				</button>
			</div>

			<div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
				<div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4">
					<div className="relative flex-1">
						<Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
						<input
							type="text"
							placeholder={
								activeTab === "lotes"
									? "Buscar lote o nota..."
									: "Buscar placa, estado o lote..."
							}
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-background focus:ring-2 focus:ring-ring outline-none transition-all text-foreground"
						/>
					</div>
				</div>

				<div className="flex border-b border-border px-4 pt-2 gap-4 bg-secondary/20">
					<button
						type="button"
						onClick={() => startTransition(() => setActiveTab("lotes"))}
						className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
							activeTab === "lotes"
								? "border-primary text-primary"
								: "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
						}`}
					>
						Lotes al por Mayor
					</button>
					<button
						type="button"
						onClick={() => startTransition(() => setActiveTab("placas"))}
						className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
							activeTab === "placas"
								? "border-primary text-primary"
								: "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
						}`}
					>
						Stock de Placas Individuales
					</button>
				</div>

				<div className="overflow-x-auto">
					{activeTab === "lotes" ? (
						<table className="w-full text-left text-sm text-foreground">
							<thead className="text-xs uppercase bg-muted text-muted-foreground">
								<tr>
									<th className="px-6 py-4 font-medium">Lote</th>
									<th className="px-6 py-4 font-medium">Estado</th>
									<th className="px-6 py-4 font-medium">Notas</th>
									<th className="px-6 py-4 font-medium">Fecha</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border">
								{filteredLotes.map((l) => (
									<tr
										key={l._id}
										className="hover:bg-muted/50 transition-colors cursor-pointer"
										onClick={() => {
											setSelectedLote(l);
											setShowDetailModal(true);
										}}
									>
										<td className="px-6 py-4">
											<div className="flex items-center gap-3">
												<div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
													<Package className="w-4 h-4" />
												</div>
												<span className="font-medium text-foreground">
													{l.numero}
												</span>
											</div>
										</td>
										<td className="px-6 py-4">
											<span
												className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
													l.estado === "Terminado"
														? "bg-green-100 text-green-800"
														: l.estado === "En Producción"
															? "bg-blue-100 text-blue-800"
															: "bg-orange-100 text-orange-800"
												}`}
											>
												{l.estado}
											</span>
										</td>
										<td className="px-6 py-4 text-muted-foreground">
											{l.notas || "-"}
										</td>
										<td className="px-6 py-4 text-muted-foreground">
											{new Date(l.fechaCreacion).toLocaleDateString()}
										</td>
									</tr>
								))}
								{filteredLotes.length === 0 && (
									<tr>
										<td
											colSpan={4}
											className="px-6 py-8 text-center text-muted-foreground"
										>
											No se encontraron lotes de producción.
										</td>
									</tr>
								)}
							</tbody>
						</table>
					) : (
						<table className="w-full text-left text-sm text-foreground">
							<thead className="text-xs uppercase bg-muted text-muted-foreground">
								<tr>
									<th className="px-6 py-4 font-medium">Contenido / Placa</th>
									<th className="px-6 py-4 font-medium">Lote Origen</th>
									<th className="px-6 py-4 font-medium">Estado</th>
									<th className="px-6 py-4 font-medium">Material</th>
									<th className="px-6 py-4 font-medium">Dimensiones</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border">
								{filteredPlacas.map((p) => (
									<tr
										key={p._id}
										className="hover:bg-muted/50 transition-colors"
									>
										<td className="px-6 py-4">
											<span className="font-bold text-foreground">
												{p.contenido_texto || "Sin texto"}
											</span>
										</td>
										<td className="px-6 py-4 text-muted-foreground">
											<span className="font-mono text-xs px-2 py-1 bg-secondary rounded">
												{p.lote_numero || "N/A"}
											</span>
										</td>
										<td className="px-6 py-4">
											<span
												className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
													p.estado === "Disponible"
														? "bg-green-100 text-green-800"
														: p.estado === "Instalada"
															? "bg-blue-100 text-blue-800"
															: p.estado === "Asignada"
																? "bg-purple-100 text-purple-800"
																: "bg-red-100 text-red-800"
												}`}
											>
												{p.estado}
											</span>
										</td>
										<td className="px-6 py-4 text-muted-foreground capitalize">
											{p.material}
										</td>
										<td className="px-6 py-4 text-muted-foreground">
											{p.ancho_cm}x{p.alto_cm} cm
										</td>
									</tr>
								))}
								{filteredPlacas.length === 0 && (
									<tr>
										<td
											colSpan={5}
											className="px-6 py-8 text-center text-muted-foreground"
										>
											No hay placas en stock con ese criterio.
										</td>
									</tr>
								)}
							</tbody>
						</table>
					)}
				</div>
			</div>

			{showModal && (
				<div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
					<div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
						<div className="p-6 border-b border-border">
							<h3 className="text-xl font-bold text-foreground">
								Producir Nuevo Lote
							</h3>
						</div>
						<form onSubmit={handleSubmit} className="p-6 space-y-4">
							<div>
								<label
									htmlFor="lote-notas"
									className="block text-sm font-medium text-foreground mb-1"
								>
									Notas del Lote
								</label>
								<input
									id="lote-notas"
									type="text"
									placeholder="Ej. Pedido de 50 acrílicos para Ruta 4"
									value={formData.notas}
									onChange={(e) =>
										setFormData({ ...formData, notas: e.target.value })
									}
									className="w-full px-4 py-2 rounded-xl border border-border bg-background focus:ring-2 focus:ring-ring outline-none text-foreground"
								/>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label
										htmlFor="lote-cantidad"
										className="block text-sm font-medium text-foreground mb-1"
									>
										Cantidad
									</label>
									<input
										required
										type="number"
										min="1"
										id="lote-cantidad"
										value={formData.cantidad}
										onChange={(e) =>
											setFormData({
												...formData,
												cantidad: parseInt(e.target.value, 10),
											})
										}
										className="w-full px-4 py-2 rounded-xl border border-border bg-background focus:ring-2 focus:ring-ring outline-none text-foreground"
									/>
								</div>
								<div>
									<label
										htmlFor="lote-material"
										className="block text-sm font-medium text-foreground mb-1"
									>
										Material
									</label>
									<select
										value={formData.material}
										id="lote-material"
										onChange={(e) =>
											setFormData({ ...formData, material: e.target.value })
										}
										className="w-full px-4 py-2 rounded-xl border border-border bg-background focus:ring-2 focus:ring-ring outline-none text-foreground"
									>
										<option value="acrilico">Acrílico</option>
										<option value="lona">Lona</option>
									</select>
								</div>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label
										htmlFor="lote-ancho"
										className="block text-sm font-medium text-foreground mb-1"
									>
										Ancho (cm)
									</label>
									<input
										required
										type="number"
										value={formData.ancho_cm}
										id="lote-ancho"
										onChange={(e) =>
											setFormData({
												...formData,
												ancho_cm: parseInt(e.target.value, 10),
											})
										}
										className="w-full px-4 py-2 rounded-xl border border-border bg-background focus:ring-2 focus:ring-ring outline-none text-foreground"
									/>
								</div>
								<div>
									<label
										htmlFor="lote-alto"
										className="block text-sm font-medium text-foreground mb-1"
									>
										Alto (cm)
									</label>
									<input
										required
										type="number"
										value={formData.alto_cm}
										id="lote-alto"
										onChange={(e) =>
											setFormData({
												...formData,
												alto_cm: parseInt(e.target.value, 10),
											})
										}
										className="w-full px-4 py-2 rounded-xl border border-border bg-background focus:ring-2 focus:ring-ring outline-none text-foreground"
									/>
								</div>
							</div>
							<div>
								<label
									htmlFor="lote-texto-base"
									className="block text-sm font-medium text-foreground mb-1"
								>
									Texto Base (Prefijo)
								</label>
								<input
									required
									type="text"
									value={formData.texto_base}
									id="lote-texto-base"
									onChange={(e) =>
										setFormData({ ...formData, texto_base: e.target.value })
									}
									className="w-full px-4 py-2 rounded-xl border border-border bg-background focus:ring-2 focus:ring-ring outline-none text-foreground"
								/>
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
									Generar Lote
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
			{showDetailModal && selectedLote && (
				<div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
					<div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
						<div className="p-6 border-b border-border flex justify-between items-center">
							<h3 className="text-xl font-bold text-foreground">
								Detalles del Lote {selectedLote.numero}
							</h3>
							<button onClick={() => setShowDetailModal(false)} className="text-muted-foreground hover:text-foreground">
								✕
							</button>
						</div>
						<div className="p-6 space-y-4">
							<div className="flex justify-between items-center">
								<span className="font-medium text-foreground">Estado Actual:</span>
								<select
									value={selectedLote.estado}
									onChange={async (e) => {
										const newEstado = e.target.value;
										try {
											await cambiarEstado({ loteId: selectedLote._id, estado: newEstado });
											setSelectedLote({ ...selectedLote, estado: newEstado });
											toast.success("Estado actualizado");
										} catch (err) {
											toast.error("Error al actualizar estado");
										}
									}}
									className="px-4 py-2 rounded-xl border border-border bg-background focus:ring-2 focus:ring-ring outline-none text-foreground"
								>
									<option value="En Producción">En Producción</option>
									<option value="Terminado">Terminado</option>
									<option value="Parcialmente Asignado">Parcialmente Asignado</option>
									<option value="Agotado">Agotado</option>
								</select>
							</div>

							<div className="border-t border-border pt-4">
								<h4 className="font-semibold text-foreground mb-2">Comentarios</h4>
								<div className="max-h-40 overflow-y-auto space-y-2 mb-4 pr-2">
									{selectedLote.comentarios?.length ? (
										selectedLote.comentarios.map((c: any, i: number) => (
											<div key={i} className="bg-muted p-3 rounded-xl text-sm">
												<div className="flex justify-between items-center mb-1 text-xs text-muted-foreground">
													<span className="font-medium">{c.autorNombre}</span>
													<span>{new Date(c.fecha).toLocaleString()}</span>
												</div>
												<p className="text-foreground">{c.texto}</p>
											</div>
										))
									) : (
										<p className="text-sm text-muted-foreground">No hay comentarios aún.</p>
									)}
								</div>
								
								<div className="flex gap-2">
									<input
										type="text"
										value={nuevoComentario}
										onChange={(e) => setNuevoComentario(e.target.value)}
										placeholder="Escribe un comentario..."
										className="flex-1 px-4 py-2 rounded-xl border border-border bg-background focus:ring-2 focus:ring-ring outline-none text-foreground text-sm"
										onKeyDown={async (e) => {
											if (e.key === "Enter" && nuevoComentario.trim()) {
												try {
													await agregarComentario({
														loteId: selectedLote._id,
														usuarioId: currentUser.id as Id<"usuarios">,
														texto: nuevoComentario.trim(),
													});
													setNuevoComentario("");
													toast.success("Comentario añadido");
													// Optionally you could optimistically update the local state here
												} catch (err) {
													toast.error("Error al añadir comentario");
												}
											}
										}}
									/>
									<button
										onClick={async () => {
											if (nuevoComentario.trim()) {
												try {
													await agregarComentario({
														loteId: selectedLote._id,
														usuarioId: currentUser.id as Id<"usuarios">,
														texto: nuevoComentario.trim(),
													});
													setNuevoComentario("");
													toast.success("Comentario añadido");
												} catch (err) {
													toast.error("Error al añadir comentario");
												}
											}
										}}
										className="px-4 py-2 bg-primary hover:opacity-90 text-primary-foreground rounded-xl transition-colors font-medium text-sm"
									>
										Añadir
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
