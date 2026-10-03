import { useMutation } from "convex/react";
import {
	Bug as BugIcon,
	ImagePlus,
	MessageSquareWarning,
	X,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useSessionStore } from "../store/useSessionStore";

interface BugFotoItem {
	id: string;
	file: File;
	previewUrl: string;
}

export const BugReporter: React.FC<{ currentSection?: string }> = ({
	currentSection = "Desconocida",
}) => {
	const currentUser = useSessionStore((s) => s.currentUser);
	const createBugMut = useMutation(api.bugs.createBug);
	const generateUploadUrlMut = useMutation(api.bugs.generateUploadUrl);
	const [isOpen, setIsOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [titulo, setTitulo] = useState("");
	const [descripcion, setDescripcion] = useState("");
	const [tipo, setTipo] = useState<"Visual" | "Logica" | "Otro">("Visual");
	const [importancia, setImportancia] = useState<
		"Baja" | "Media" | "Alta" | "Critica"
	>("Media");
	const [fotos, setFotos] = useState<BugFotoItem[]>([]);

	const fotosRef = useRef<BugFotoItem[]>(fotos);
	fotosRef.current = fotos;

	// Cleanup de ObjectURLs al desmontar el componente (por navegación o unmount)
	useEffect(() => {
		return () => {
			fotosRef.current.forEach((f) => {
				if (f.previewUrl.startsWith("blob:")) {
					URL.revokeObjectURL(f.previewUrl);
				}
			});
		};
	}, []);

	if (!currentUser) return null;

	const limpiarEstado = () => {
		fotos.forEach((f) => {
			if (f.previewUrl.startsWith("blob:")) {
				URL.revokeObjectURL(f.previewUrl);
			}
		});
		setFotos([]);
		setTitulo("");
		setDescripcion("");
		setTipo("Visual");
		setImportancia("Media");
		setIsOpen(false);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!titulo.trim() || !descripcion.trim() || isSubmitting) return;

		setIsSubmitting(true);
		try {
			const storageIds: string[] = [];

			// Subir cada archivo a Convex Storage
			for (const item of fotos) {
				try {
					const uploadUrl = await generateUploadUrlMut();
					const res = await fetch(uploadUrl, {
						method: "POST",
						headers: { "Content-Type": item.file.type },
						body: item.file,
					});
					if (!res.ok) {
						throw new Error(`Error en servidor: ${res.statusText}`);
					}
					const { storageId } = await res.json();
					if (storageId) {
						storageIds.push(storageId);
					}
				} catch (uploadErr) {
					console.error("Error al subir captura de bug:", uploadErr);
					toast.error(`No se pudo subir ${item.file.name}`, {
						description: "El reporte se enviará sin esta imagen.",
					});
				}
			}

			await createBugMut({
				usuarioId: currentUser.id as Id<"usuarios">,
				titulo,
				descripcion,
				tipo,
				importancia,
				ruta: `/${currentSection.toLowerCase().replace(/ /g, "-")}`,
				imagenes: storageIds,
			});

			limpiarEstado();
			toast.success("Reporte enviado", {
				description: "Tu reporte fue enviado al equipo de Plottio.",
			});
		} catch (err) {
			toast.error("Error al enviar el reporte", {
				description: (err as Error).message,
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const agregarArchivos = (fileList: FileList | null) => {
		if (!fileList) return;

		const nuevos: BugFotoItem[] = [];
		Array.from(fileList).forEach((file) => {
			if (!file.type.startsWith("image/")) return;
			const previewUrl = URL.createObjectURL(file);
			nuevos.push({
				id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
				file,
				previewUrl,
			});
		});

		setFotos((prev) => [...prev, ...nuevos]);
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const eliminarFoto = (id: string) => {
		setFotos((prev) => {
			const item = prev.find((f) => f.id === id);
			if (item?.previewUrl.startsWith("blob:")) {
				URL.revokeObjectURL(item.previewUrl);
			}
			return prev.filter((f) => f.id !== id);
		});
	};

	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		agregarArchivos(e.target.files);
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		agregarArchivos(e.dataTransfer.files);
	};

	return (
		<>
			<button
				type="button"
				onClick={() => setIsOpen(true)}
				className="fixed bottom-6 right-6 z-[90] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 hover:scale-105 transition-all cursor-pointer"
				title="Reportar Bug"
			>
				<BugIcon className="h-6 w-6" />
			</button>

			{isOpen && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
					<div className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-fade-in">
						<div className="p-4 border-b border-border flex justify-between items-center bg-secondary/50">
							<h3 className="font-bold text-foreground flex items-center gap-2">
								<MessageSquareWarning className="h-5 w-5 text-primary" />
								Reportar un Problema (Bug)
							</h3>
							<button
								type="button"
								onClick={limpiarEstado}
								className="text-muted-foreground hover:text-foreground"
							>
								<X className="h-5 w-5" />
							</button>
						</div>
						<form onSubmit={handleSubmit} className="p-5 space-y-4">
							<div>
								<label
									htmlFor="bug-titulo"
									className="block text-xs font-semibold text-foreground mb-1.5"
								>
									Título del Problema
								</label>
								<input
									id="bug-titulo"
									type="text"
									required
									value={titulo}
									onChange={(e) => setTitulo(e.target.value)}
									className="w-full bg-background border border-border rounded-lg px-3 py-3 sm:py-2 text-[16px] sm:text-sm text-foreground focus:ring-1 focus:ring-primary outline-none"
									placeholder="Ej. El botón de guardar no funciona"
								/>
							</div>

							<div>
								<label
									htmlFor="bug-descripcion"
									className="block text-xs font-semibold text-foreground mb-1.5"
								>
									Descripción Detallada
								</label>
								<textarea
									id="bug-descripcion"
									required
									rows={3}
									value={descripcion}
									onChange={(e) => setDescripcion(e.target.value)}
									className="w-full bg-background border border-border rounded-lg px-3 py-3 sm:py-2 text-[16px] sm:text-sm text-foreground focus:ring-1 focus:ring-primary outline-none resize-none"
									placeholder="Explica qué estabas haciendo y qué pasó..."
								/>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<label
										htmlFor="bug-tipo"
										className="block text-xs font-semibold text-foreground mb-1.5"
									>
										Tipo de Bug
									</label>
									<select
										id="bug-tipo"
										value={tipo}
										onChange={(e) =>
											setTipo(e.target.value as "Visual" | "Logica" | "Otro")
										}
										className="w-full bg-background border border-border rounded-lg px-3 py-3 sm:py-2 text-[16px] sm:text-sm text-foreground focus:ring-1 focus:ring-primary outline-none"
									>
										<option value="Visual">Visual (Interfaz)</option>
										<option value="Logica">Lógica (Funcionalidad)</option>
										<option value="Otro">Otro</option>
									</select>
								</div>
								<div>
									<label
										htmlFor="bug-importancia"
										className="block text-xs font-semibold text-foreground mb-1.5"
									>
										Importancia
									</label>
									<select
										id="bug-importancia"
										value={importancia}
										onChange={(e) =>
											setImportancia(
												e.target.value as "Baja" | "Media" | "Alta" | "Critica",
											)
										}
										className="w-full bg-background border border-border rounded-lg px-3 py-3 sm:py-2 text-[16px] sm:text-sm text-foreground focus:ring-1 focus:ring-primary outline-none"
									>
										<option value="Baja">Baja</option>
										<option value="Media">Media</option>
										<option value="Alta">Alta</option>
										<option value="Critica">Crítica (Bloqueante)</option>
									</select>
								</div>
							</div>

							<div>
								<label
									htmlFor="bug-imagenes"
									className="block text-xs font-semibold text-foreground mb-1.5"
								>
									Capturas de Pantalla (Opcional)
								</label>
								<section
									aria-label="Zona de capturas de pantalla"
									className="flex flex-wrap gap-2 mb-2 p-3 border-2 border-dashed border-border rounded-lg bg-secondary/10 hover:bg-secondary/30 transition-colors min-h-[5rem]"
									onDragOver={(e) => e.preventDefault()}
									onDrop={handleDrop}
								>
									{fotos.map((item) => (
										<div
											key={item.id}
											className="relative h-16 w-16 rounded overflow-hidden border border-border shadow-sm"
										>
											<img
												src={item.previewUrl}
												alt={item.file.name}
												className="h-full w-full object-cover"
											/>
											<button
												type="button"
												onClick={() => eliminarFoto(item.id)}
												disabled={isSubmitting}
												className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 hover:bg-black/80 transition-colors"
											>
												<X className="h-3 w-3" />
											</button>
										</div>
									))}
									<input
										id="bug-imagenes"
										type="file"
										ref={fileInputRef}
										onChange={handleFileUpload}
										multiple
										accept="image/*"
										className="hidden"
										disabled={isSubmitting}
									/>
									<button
										type="button"
										onClick={() => fileInputRef.current?.click()}
										disabled={isSubmitting}
										className="flex h-16 w-16 items-center justify-center flex-col gap-1 rounded bg-secondary/50 hover:bg-secondary text-muted-foreground transition-colors border border-border disabled:opacity-50"
									>
										<ImagePlus className="h-5 w-5" />
										<span className="text-[9px] font-medium text-center leading-tight px-1">
											Añadir
											<br />
											Imagen
										</span>
									</button>
									{fotos.length === 0 && (
										<div className="flex-1 flex items-center justify-center text-xs text-muted-foreground ml-2">
											Arrastra imágenes aquí o haz clic en el botón.
										</div>
									)}
								</section>
							</div>

							<div className="text-[10px] text-muted-foreground bg-secondary/50 p-2.5 rounded-lg border border-border flex flex-col gap-1.5">
								<div className="flex justify-between">
									<span>
										<strong>Sección:</strong> {currentSection}
									</span>
									<span className="font-mono bg-background px-1 rounded border border-border">
										ID: {currentUser.id}
									</span>
								</div>
								<div>
									<strong>Usuario:</strong> {currentUser.nombre}
								</div>
								<div>
									<strong>Fecha/Hora:</strong> Se registrará automáticamente
								</div>
							</div>

							<div className="pt-2 flex gap-3">
								<button
									type="button"
									onClick={limpiarEstado}
									disabled={isSubmitting}
									className="w-full py-2.5 rounded-lg border border-border text-foreground font-semibold text-sm hover:bg-secondary transition-colors cursor-pointer disabled:opacity-50"
								>
									Cancelar
								</button>
								<button
									type="submit"
									disabled={isSubmitting}
									className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
								>
									{isSubmitting ? "Enviando reporte..." : "Enviar Reporte"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</>
	);
};
