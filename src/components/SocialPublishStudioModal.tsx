import {
	Car,
	Clock,
	Image as ImageIcon,
	Instagram,
	Linkedin,
	Send,
	Sparkles,
	Video,
	X,
	Youtube,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useIntegrationsStore } from "../store/useIntegrationsStore";

interface SocialPublishStudioModalProps {
	isOpen: boolean;
	onClose: () => void;
	vehiculos?: { id: string; placa: string; marca: string; modelo: string }[];
}

export const SocialPublishStudioModal: React.FC<
	SocialPublishStudioModalProps
> = ({ isOpen, onClose, vehiculos = [] }) => {
	const { addSocialPost } = useIntegrationsStore();

	const [selectedChannels, setSelectedChannels] = useState<
		("tiktok" | "instagram" | "linkedin" | "youtube")[]
	>(["instagram", "tiktok"]);
	const [content, setContent] = useState("");
	const [previewTab, setPreviewTab] = useState<
		"instagram" | "tiktok" | "linkedin" | "youtube"
	>("instagram");
	const [selectedVehicle, setSelectedVehicle] = useState("");
	const [scheduleDate, setScheduleDate] = useState("");
	const [isScheduled, setIsScheduled] = useState(false);

	if (!isOpen) return null;

	const toggleChannel = (
		ch: "tiktok" | "instagram" | "linkedin" | "youtube",
	) => {
		setSelectedChannels((prev) =>
			prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch],
		);
		setPreviewTab(ch);
	};

	const handleAddVehicleTag = (vId: string) => {
		const v = vehiculos.find((veh) => veh.id === vId);
		if (!v) return;
		const tagString = ` #${v.marca.toLowerCase()} #${v.modelo.toLowerCase().replace(/\s+/g, "")} #plottio #wrapping`;
		setContent((prev) => prev + tagString);
	};

	const handlePublish = (e: React.FormEvent) => {
		e.preventDefault();
		if (!content.trim() || selectedChannels.length === 0) return;

		addSocialPost({
			content: content.trim(),
			channels: selectedChannels,
			status: isScheduled && scheduleDate ? "scheduled" : "published",
			scheduledFor: isScheduled && scheduleDate ? scheduleDate : undefined,
			tags: ["#wrapping", "#plottio"],
		});

		onClose();
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-sm animate-fade-in">
			<button
				type="button"
				className="fixed inset-0 w-full h-full cursor-default"
				onClick={onClose}
				aria-label="Cerrar estudio"
			/>
			<div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl z-10 animate-slide-in flex flex-col">
				{/* Modal Top Header */}
				<div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
					<div className="flex items-center gap-2.5">
						<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500 text-white shadow-sm">
							<Sparkles className="h-5 w-5" />
						</div>
						<div>
							<h3 className="text-base font-bold text-foreground">
								Social Studio APEX (Buffer Sync)
							</h3>
							<p className="text-xs text-muted-foreground">
								Publica simultáneamente en TikTok, Instagram, LinkedIn y
								YouTube.
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* Two Columns Body: Editor Left, Live Preview Right */}
				<div className="grid grid-cols-1 lg:grid-cols-12 flex-1 divide-y lg:divide-y-0 lg:divide-x divide-border">
					{/* Left Editor (7 Cols) */}
					<form
						onSubmit={handlePublish}
						className="lg:col-span-7 p-5 space-y-4 flex flex-col justify-between"
					>
						<div className="space-y-4">
							{/* Channel Selector Pills */}
							<div>
								<span className="block text-xs font-semibold text-muted-foreground mb-2">
									Canales Destino:
								</span>
								<div className="flex flex-wrap gap-2">
									<button
										type="button"
										onClick={() => toggleChannel("instagram")}
										className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
											selectedChannels.includes("instagram")
												? "border-pink-500 bg-pink-500/15 text-pink-600 dark:text-pink-400"
												: "border-border bg-background text-muted-foreground hover:bg-secondary"
										}`}
									>
										<Instagram className="h-4 w-4" /> Instagram
									</button>
									<button
										type="button"
										onClick={() => toggleChannel("tiktok")}
										className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
											selectedChannels.includes("tiktok")
												? "border-cyan-500 bg-cyan-500/15 text-cyan-600 dark:text-cyan-400"
												: "border-border bg-background text-muted-foreground hover:bg-secondary"
										}`}
									>
										<Video className="h-4 w-4" /> TikTok
									</button>
									<button
										type="button"
										onClick={() => toggleChannel("linkedin")}
										className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
											selectedChannels.includes("linkedin")
												? "border-blue-600 bg-blue-600/15 text-blue-600 dark:text-blue-400"
												: "border-border bg-background text-muted-foreground hover:bg-secondary"
										}`}
									>
										<Linkedin className="h-4 w-4" /> LinkedIn
									</button>
									<button
										type="button"
										onClick={() => toggleChannel("youtube")}
										className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
											selectedChannels.includes("youtube")
												? "border-red-600 bg-red-600/15 text-red-600 dark:text-red-400"
												: "border-border bg-background text-muted-foreground hover:bg-secondary"
										}`}
									>
										<Youtube className="h-4 w-4" /> Shorts
									</button>
								</div>
							</div>

							{/* Post Copy / Content Textarea */}
							<div>
								<label
									htmlFor="post-content"
									className="block text-xs font-semibold text-muted-foreground mb-1.5"
								>
									Contenido del Post & Copywriter *
								</label>
								<textarea
									id="post-content"
									rows={5}
									required
									value={content}
									onChange={(e) => setContent(e.target.value)}
									placeholder="Describe el trabajo realizado en el vehículo, materiales usados (3M, Avery, etc.) y resultado..."
									className="w-full rounded-xl border border-border bg-background p-3 text-xs sm:text-sm text-foreground focus:border-primary focus:outline-none resize-none leading-relaxed"
								/>
								<div className="flex justify-between text-[11px] text-muted-foreground mt-1">
									<span>{content.length} caracteres</span>
									<span>Límite optimizado para multired</span>
								</div>
							</div>

							{/* Vehicle Smart Tagging */}
							{vehiculos.length > 0 && (
								<div className="rounded-xl border border-border bg-secondary/15 p-3 space-y-2">
									<div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
										<Car className="h-4 w-4 text-primary" />
										Vincular Vehículo y Hashtags de Taller
									</div>
									<div className="flex items-center gap-2">
										<select
											value={selectedVehicle}
											onChange={(e) => {
												setSelectedVehicle(e.target.value);
												handleAddVehicleTag(e.target.value);
											}}
											className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
										>
											<option value="">
												-- Seleccionar vehículo trabajado --
											</option>
											{vehiculos.map((v) => (
												<option key={v.id} value={v.id}>
													{v.placa} ({v.marca} {v.modelo})
												</option>
											))}
										</select>
									</div>
								</div>
							)}

							{/* Schedule Picker */}
							<div className="flex items-center justify-between rounded-xl border border-border bg-secondary/10 p-3">
								<div className="flex items-center gap-2 text-xs">
									<Clock className="h-4 w-4 text-muted-foreground" />
									<span className="font-semibold text-foreground">
										Programar Publicación
									</span>
								</div>
								<div className="flex items-center gap-2">
									<input
										type="checkbox"
										checked={isScheduled}
										onChange={(e) => setIsScheduled(e.target.checked)}
										className="h-4 w-4 rounded border-border text-primary cursor-pointer"
									/>
									{isScheduled && (
										<input
											type="datetime-local"
											value={scheduleDate}
											onChange={(e) => setScheduleDate(e.target.value)}
											className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground"
										/>
									)}
								</div>
							</div>
						</div>

						{/* Action Buttons */}
						<div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
							<button
								type="button"
								onClick={onClose}
								className="px-4 py-2 rounded-lg border border-border bg-card text-foreground text-xs font-semibold hover:bg-secondary transition-colors cursor-pointer"
							>
								Descartar
							</button>
							<button
								type="submit"
								disabled={!content.trim() || selectedChannels.length === 0}
								className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40 flex items-center gap-1.5 shadow-sm"
							>
								<Send className="h-3.5 w-3.5" />
								<span>
									{isScheduled ? "Agendar Publicación" : "Publicar Ahora"}
								</span>
							</button>
						</div>
					</form>

					{/* Right Live Social Mockup (5 Cols) */}
					<div className="lg:col-span-5 p-5 bg-secondary/15 flex flex-col space-y-4">
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
								Previsualización en Vivo:
							</span>
							<div className="flex items-center gap-1">
								{selectedChannels.map((ch) => (
									<button
										key={ch}
										type="button"
										onClick={() => setPreviewTab(ch)}
										className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase cursor-pointer ${
											previewTab === ch
												? "bg-primary text-primary-foreground"
												: "bg-card text-muted-foreground hover:text-foreground"
										}`}
									>
										{ch}
									</button>
								))}
							</div>
						</div>

						{/* Mockup Card */}
						<div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3">
							<div className="flex items-center gap-2.5">
								<div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-primary-foreground font-black text-xs">
									P
								</div>
								<div>
									<div className="text-xs font-bold text-foreground">
										Plottio Taller Oficial
									</div>
									<div className="text-[10px] text-muted-foreground">
										Hace un instante • {previewTab.toUpperCase()}
									</div>
								</div>
							</div>

							<p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed min-h-[60px]">
								{content ||
									"Escribe un copy a la izquierda para ver cómo lucirá en esta red social..."}
							</p>

							{/* Mockup Media Frame */}
							<div className="aspect-video w-full rounded-xl bg-secondary/40 border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground gap-1.5">
								<ImageIcon className="h-6 w-6 opacity-40" />
								<span className="text-[11px] font-medium opacity-60">
									Foto / Video del vehículo renderizado
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
