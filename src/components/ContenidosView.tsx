import {
	Clock,
	Instagram,
	Linkedin,
	Plus,
	Trash2,
	Users,
	Video,
	Youtube,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useIntegrationsStore } from "../store/useIntegrationsStore";
import { SocialPublishStudioModal } from "./SocialPublishStudioModal";

export const ContenidosView: React.FC = () => {
	const { buffer, deleteSocialPost, toggleSocialChannel } =
		useIntegrationsStore();
	const [isStudioOpen, setIsStudioOpen] = useState(false);

	const channelIcons = {
		instagram: Instagram,
		tiktok: Video,
		linkedin: Linkedin,
		youtube: Youtube,
	};

	const channelColors = {
		instagram: "text-pink-500 bg-pink-500/10 border-pink-500/20",
		tiktok: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
		linkedin: "text-blue-500 bg-blue-500/10 border-blue-500/20",
		youtube: "text-red-500 bg-red-500/10 border-red-500/20",
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
						<span>Contenidos & Redes Sociales</span>
						<span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold border border-primary/20">
							APEX Sync • Buffer
						</span>
					</h1>
					<p className="text-muted-foreground">
						Publica y sincroniza automáticamente fotos de vehículos y proyectos
						en tus redes comerciales.
					</p>
				</div>
				<button
					type="button"
					onClick={() => setIsStudioOpen(true)}
					className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-95 transition-opacity cursor-pointer shadow-sm w-full sm:w-auto justify-center"
				>
					<Plus className="h-4 w-4" />
					Nueva Publicación Multired
				</button>
			</div>

			{/* Social Network Channel Status Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				{buffer.channels.map((ch) => {
					const Icon = channelIcons[ch.id];
					return (
						<div
							key={ch.id}
							className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col justify-between"
						>
							<div className="flex items-start justify-between">
								<div className="flex items-center gap-3">
									<div
										className={`flex h-10 w-10 items-center justify-center rounded-xl border ${channelColors[ch.id]}`}
									>
										<Icon className="h-5 w-5" />
									</div>
									<div>
										<div className="text-sm font-bold text-foreground">
											{ch.name}
										</div>
										<div className="text-xs text-muted-foreground">
											{ch.handle}
										</div>
									</div>
								</div>
								<input
									type="checkbox"
									checked={ch.active}
									onChange={() => toggleSocialChannel(ch.id)}
									className="h-4 w-4 rounded border-border text-primary cursor-pointer"
									title={ch.active ? "Canal conectado" : "Canal desconectado"}
								/>
							</div>

							<div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
								<span className="flex items-center gap-1">
									<Users className="h-3 w-3" />
									<span>Comunidad Activa</span>
								</span>
								<span className="font-bold text-foreground">
									{ch.active ? "Sincronizado" : "Pausado"}
								</span>
							</div>
						</div>
					);
				})}
			</div>

			{/* Feed and Pipeline of Posts */}
			<div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
				<div className="flex items-center justify-between">
					<div>
						<h3 className="text-base font-bold text-foreground">
							Historial y Cola de Publicaciones
						</h3>
						<p className="text-xs text-muted-foreground">
							Monitoreo de contenido distribuido mediante Buffer GraphQL.
						</p>
					</div>
					<span className="text-xs text-muted-foreground font-semibold">
						{buffer.posts.length} posts registrados
					</span>
				</div>

				<div className="divide-y divide-border">
					{buffer.posts.map((post) => (
						<div
							key={post.id}
							className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 first:pt-2 last:pb-0"
						>
							<div className="space-y-2 max-w-2xl">
								<div className="flex items-center gap-2 flex-wrap">
									<span
										className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
											post.status === "published"
												? "bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/30"
												: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30"
										}`}
									>
										{post.status === "published" ? "Publicado" : "Programado"}
									</span>

									{post.scheduledFor && (
										<span className="text-xs text-muted-foreground flex items-center gap-1">
											<Clock className="h-3 w-3" />
											{post.scheduledFor}
										</span>
									)}

									{/* Channel Badges */}
									<div className="flex items-center gap-1.5 ml-1">
										{post.channels.map((ch) => {
											const Icon = channelIcons[ch];
											return (
												<span
													key={ch}
													className={`p-1 rounded border text-[10px] ${channelColors[ch]}`}
													title={ch}
												>
													<Icon className="h-3 w-3" />
												</span>
											);
										})}
									</div>
								</div>

								<p className="text-xs sm:text-sm text-foreground leading-relaxed">
									{post.content}
								</p>

								{post.tags.length > 0 && (
									<div className="flex flex-wrap gap-1">
										{post.tags.map((t) => (
											<span
												key={t}
												className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-mono"
											>
												{t}
											</span>
										))}
									</div>
								)}
							</div>

							<div className="flex items-center gap-2 self-end sm:self-center">
								<button
									type="button"
									onClick={() => deleteSocialPost(post.id)}
									className="p-2 rounded-lg border border-destructive/20 bg-card text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
									title="Eliminar post"
								>
									<Trash2 className="h-4 w-4" />
								</button>
							</div>
						</div>
					))}

					{buffer.posts.length === 0 && (
						<div className="py-12 text-center text-muted-foreground text-sm">
							No hay publicaciones registradas aún. ¡Crea la primera!
						</div>
					)}
				</div>
			</div>

			{/* Modal */}
			<SocialPublishStudioModal
				isOpen={isStudioOpen}
				onClose={() => setIsStudioOpen(false)}
			/>
		</div>
	);
};
