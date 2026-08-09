import {
	Bug as BugIcon,
	ImagePlus,
	MessageSquareWarning,
	Upload,
	X,
} from "lucide-react";
import type React from "react";
import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSessionStore } from "../store/useSessionStore";
import { toast } from "sonner";

export const BugReporter: React.FC<{ currentSection?: string }> = ({
	currentSection = "Desconocida",
}) => {
	const currentUser = useSessionStore((s) => s.currentUser);
	const createBugMut = useMutation(api.bugs.createBug);
	const [isOpen, setIsOpen] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [titulo, setTitulo] = useState("");
	const [descripcion, setDescripcion] = useState("");
	const [tipo, setTipo] = useState<"Visual" | "Logica" | "Otro">("Visual");
	const [importancia, setImportancia] = useState<
		"Baja" | "Media" | "Alta" | "Critica"
	>("Media");
	const [imagenes, setImagenes] = useState<string[]>([]);

	if (!currentUser) return null;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!titulo.trim() || !descripcion.trim()) return;

		try {
			await createBugMut({
				usuarioId: currentUser.id as unknown as any,
				titulo,
				descripcion,
				tipo,
				importancia,
				ruta: `/${currentSection.toLowerCase().replace(/ /g, "-")}`,
				imagenes,
			});
			setIsOpen(false);
			setTitulo("");
			setDescripcion("");
			setTipo("Visual");
			setImportancia("Media");
			setImagenes([]);
			toast.success("Reporte enviado", {
				description: "Tu reporte fue enviado al equipo de Plottio.",
			});
		} catch (err) {
			toast.error("Error al enviar el reporte", {
				description: (err as Error).message,
			});
		}
	};

	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files) return;

		Array.from(files).forEach((file) => {
			if (!file.type.startsWith("image/")) return;
			const reader = new FileReader();
			reader.onload = (event) => {
				if (event.target?.result) {
					setImagenes((prev) => [...prev, event.target!.result as string]);
				}
			};
			reader.readAsDataURL(file);
		});

		// Reset input
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		const files = e.dataTransfer.files;
		if (!files) return;

		Array.from(files).forEach((file) => {
			if (!file.type.startsWith("image/")) return;
			const reader = new FileReader();
			reader.onload = (event) => {
				if (event.target?.result) {
					setImagenes((prev) => [...prev, event.target!.result as string]);
				}
			};
			reader.readAsDataURL(file);
		});
	};

	return (
		<>
			<button
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
								onClick={() => setIsOpen(false)}
								className="text-muted-foreground hover:text-foreground"
							>
								<X className="h-5 w-5" />
							</button>
						</div>
						<form onSubmit={handleSubmit} className="p-5 space-y-4">
							<div>
								<label className="block text-xs font-semibold text-foreground mb-1.5">
									Título del Problema
								</label>
								<input
									type="text"
									required
									value={titulo}
									onChange={(e) => setTitulo(e.target.value)}
									className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none"
									placeholder="Ej. El botón de guardar no funciona"
								/>
							</div>

							<div>
								<label className="block text-xs font-semibold text-foreground mb-1.5">
									Descripción Detallada
								</label>
								<textarea
									required
									rows={3}
									value={descripcion}
									onChange={(e) => setDescripcion(e.target.value)}
									className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none resize-none"
									placeholder="Explica qué estabas haciendo y qué pasó..."
								/>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block text-xs font-semibold text-foreground mb-1.5">
										Tipo de Bug
									</label>
									<select
										value={tipo}
										onChange={(e) => setTipo(e.target.value as any)}
										className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none"
									>
										<option value="Visual">Visual (Interfaz)</option>
										<option value="Logica">Lógica (Funcionalidad)</option>
										<option value="Otro">Otro</option>
									</select>
								</div>
								<div>
									<label className="block text-xs font-semibold text-foreground mb-1.5">
										Importancia
									</label>
									<select
										value={importancia}
										onChange={(e) => setImportancia(e.target.value as any)}
										className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none"
									>
										<option value="Baja">Baja</option>
										<option value="Media">Media</option>
										<option value="Alta">Alta</option>
										<option value="Critica">Crítica (Bloqueante)</option>
									</select>
								</div>
							</div>

							<div>
								<label className="block text-xs font-semibold text-foreground mb-1.5">
									Capturas de Pantalla (Opcional)
								</label>
								<div
									className="flex flex-wrap gap-2 mb-2 p-3 border-2 border-dashed border-border rounded-lg bg-secondary/10 hover:bg-secondary/30 transition-colors min-h-[5rem]"
									onDragOver={(e) => e.preventDefault()}
									onDrop={handleDrop}
								>
									{imagenes.map((img, idx) => (
										<div
											key={idx}
											className="relative h-16 w-16 rounded overflow-hidden border border-border shadow-sm"
										>
											<img
												src={img}
												alt="Screenshot"
												className="h-full w-full object-cover"
											/>
											<button
												type="button"
												onClick={() =>
													setImagenes(imagenes.filter((_, i) => i !== idx))
												}
												className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 hover:bg-black/80 transition-colors"
											>
												<X className="h-3 w-3" />
											</button>
										</div>
									))}
									<input
										type="file"
										ref={fileInputRef}
										onChange={handleFileUpload}
										multiple
										accept="image/*"
										className="hidden"
									/>
									<button
										type="button"
										onClick={() => fileInputRef.current?.click()}
										className="flex h-16 w-16 items-center justify-center flex-col gap-1 rounded bg-secondary/50 hover:bg-secondary text-muted-foreground transition-colors border border-border"
									>
										<ImagePlus className="h-5 w-5" />
										<span className="text-[9px] font-medium text-center leading-tight px-1">
											Añadir
											<br />
											Imagen
										</span>
									</button>
									{imagenes.length === 0 && (
										<div className="flex-1 flex items-center justify-center text-xs text-muted-foreground ml-2">
											Arrastra imágenes aquí o haz clic en el botón.
										</div>
									)}
								</div>
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
									onClick={() => setIsOpen(false)}
									className="w-full py-2.5 rounded-lg border border-border text-foreground font-semibold text-sm hover:bg-secondary transition-colors cursor-pointer"
								>
									Cancelar
								</button>
								<button
									type="submit"
									className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-colors shadow-sm cursor-pointer"
								>
									Enviar Reporte
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</>
	);
};
