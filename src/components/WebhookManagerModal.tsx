import {
	Check,
	Code,
	Copy,
	ExternalLink,
	Plus,
	RefreshCw,
	ShieldCheck,
	Trash2,
	Webhook,
	X,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useIntegrationsStore } from "../store/useIntegrationsStore";

interface WebhookManagerModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export const WebhookManagerModal: React.FC<WebhookManagerModalProps> = ({
	isOpen,
	onClose,
}) => {
	const {
		webhooks,
		inboundEndpoint,
		inboundSecret,
		regenerateInboundSecret,
		addWebhook,
		toggleWebhook,
		deleteWebhook,
	} = useIntegrationsStore();

	const [activeTab, setActiveTab] = useState<"inbound" | "outbound">("inbound");
	const [copiedField, setCopiedField] = useState<string | null>(null);

	// Outbound New Webhook state
	const [outboundName, setOutboundName] = useState("");
	const [outboundUrl, setOutboundUrl] = useState("");
	const [selectedEvents, setSelectedEvents] = useState<string[]>([
		"cliente.creado",
		"orden.actualizada",
		"cotizacion.aprobada",
	]);
	const [isAddingOutbound, setIsAddingOutbound] = useState(false);

	if (!isOpen) return null;

	const handleCopy = (text: string, fieldId: string) => {
		navigator.clipboard.writeText(text);
		setCopiedField(fieldId);
		setTimeout(() => setCopiedField(null), 2000);
	};

	const handleAddOutbound = (e: React.FormEvent) => {
		e.preventDefault();
		if (!outboundName.trim() || !outboundUrl.trim()) return;
		addWebhook(outboundName.trim(), outboundUrl.trim(), selectedEvents);
		setOutboundName("");
		setOutboundUrl("");
		setIsAddingOutbound(false);
	};

	const availableEvents = [
		{ id: "cliente.creado", label: "cliente.creado" },
		{ id: "orden.actualizada", label: "orden.actualizada" },
		{ id: "cotizacion.aprobada", label: "cotizacion.aprobada" },
		{ id: "orden.creada", label: "orden.creada" },
		{ id: "orden.terminada", label: "orden.terminada" },
	];

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
			<button
				type="button"
				className="fixed inset-0 w-full h-full cursor-default"
				onClick={onClose}
				aria-label="Cerrar modal"
			/>
			<div className="relative w-full max-w-4xl max-h-[92vh] rounded-2xl border border-border bg-card shadow-2xl z-10 animate-slide-in flex flex-col overflow-hidden">
				{/* Header */}
				<div className="flex items-center justify-between px-5 py-4 border-b border-border bg-secondary/15 shrink-0">
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
							<Webhook className="h-6 w-6" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h3 className="text-base sm:text-lg font-bold text-foreground">
									Hub Centralizado de Webhooks
								</h3>
								<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
									Inbound & Outbound
								</span>
							</div>
							<p className="text-xs text-muted-foreground">
								Gestión de endpoints de recepción y despacho de eventos en
								tiempo real
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
						aria-label="Cerrar"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* Navigation Tabs - ONLY Inbound and Outbound */}
				<div className="flex items-center gap-2 px-5 py-2.5 border-b border-border bg-card shrink-0 text-xs font-bold">
					<button
						type="button"
						onClick={() => setActiveTab("inbound")}
						className={`px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
							activeTab === "inbound"
								? "bg-primary text-primary-foreground shadow-xs"
								: "bg-secondary/40 text-muted-foreground hover:text-foreground"
						}`}
					>
						<ShieldCheck className="h-4 w-4" />
						<span>Webhook de Entrada (Inbound)</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("outbound")}
						className={`px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
							activeTab === "outbound"
								? "bg-primary text-primary-foreground shadow-xs"
								: "bg-secondary/40 text-muted-foreground hover:text-foreground"
						}`}
					>
						<ExternalLink className="h-4 w-4" />
						<span>Webhooks Salientes (Outbound)</span>
						<span className="px-1.5 py-0.2 rounded-full text-[10px] bg-background/50 border border-border">
							{webhooks.length}
						</span>
					</button>
				</div>

				{/* Body Content */}
				<div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
					{/* PESTAÑA 1: WEBHOOK DE ENTRADA (INBOUND) */}
					{activeTab === "inbound" && (
						<div className="space-y-6">
							{/* Connection Parameters */}
							<div className="rounded-xl border border-border bg-secondary/10 p-5 space-y-4">
								<h4 className="text-sm font-bold text-foreground flex items-center gap-2">
									<ShieldCheck className="h-4 w-4 text-primary" />
									<span>Parámetros del Webhook de Entrada</span>
								</h4>

								<div className="space-y-4">
									{/* Canonical Webhook URL */}
									<div>
										<label
											htmlFor="inbound-url-field"
											className="block text-xs font-bold text-foreground mb-1"
										>
											URL Canónica del Webhook de Plottio (POST)
										</label>
										<div className="flex gap-2">
											<input
												id="inbound-url-field"
												type="text"
												readOnly
												value={inboundEndpoint}
												className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-foreground select-all focus:outline-none"
											/>
											<button
												type="button"
												onClick={() => handleCopy(inboundEndpoint, "inUrl")}
												className="px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
											>
												{copiedField === "inUrl" ? (
													<>
														<Check className="h-3.5 w-3.5" />
														<span>¡Copiada!</span>
													</>
												) : (
													<>
														<Copy className="h-3.5 w-3.5" />
														<span>Copiar URL</span>
													</>
												)}
											</button>
										</div>
										<p className="text-[11px] text-muted-foreground mt-1">
											Configura esta URL canónica
											(https://plottio.vercel.app/api/webhooks) en tus pasarelas
											y servicios externos para recibir eventos entrantes.
										</p>
									</div>

									{/* Webhook Secret x-webhook-secret */}
									<div>
										<div className="flex justify-between items-center mb-1">
											<label
												htmlFor="inbound-secret-field"
												className="block text-xs font-bold text-foreground"
											>
												Secreto de Validación (Header:{" "}
												<code className="text-primary font-mono text-[11px]">
													x-webhook-secret
												</code>
												)
											</label>
											<span className="text-[10px] text-muted-foreground font-mono">
												Autenticación de Integraciones
											</span>
										</div>
										<div className="flex gap-2">
											<input
												id="inbound-secret-field"
												type="text"
												readOnly
												value={inboundSecret || "whsec_plottio_wha_2026"}
												className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-foreground select-all focus:outline-none"
											/>
											<button
												type="button"
												onClick={() =>
													handleCopy(
														inboundSecret || "whsec_plottio_wha_2026",
														"inSecret",
													)
												}
												className="px-3.5 py-2 rounded-lg border border-border bg-card hover:bg-secondary text-foreground text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
											>
												{copiedField === "inSecret" ? (
													<Check className="h-3.5 w-3.5 text-emerald-500" />
												) : (
													<Copy className="h-3.5 w-3.5" />
												)}
												<span>Copiar Secreto</span>
											</button>
											<button
												type="button"
												onClick={regenerateInboundSecret}
												className="px-3 py-2 rounded-lg border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground text-xs font-semibold transition-colors flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
												title="Regenerar clave secreta"
											>
												<RefreshCw className="h-3.5 w-3.5" />
												<span className="hidden sm:inline">Regenerar</span>
											</button>
										</div>
										<p className="text-[11px] text-muted-foreground mt-1">
											Cada petición HTTP POST entrante debe incluir la cabecera{" "}
											<code className="bg-secondary px-1 py-0.5 rounded text-[10px] font-mono">
												x-webhook-secret: &lt;secreto&gt;
											</code>
											.
										</p>
									</div>
								</div>
							</div>

							{/* Instrucciones de Eventos Inbound */}
							<div className="rounded-xl border border-border bg-card p-5 space-y-4">
								<h4 className="text-sm font-bold text-foreground flex items-center gap-2">
									<Code className="h-4 w-4 text-primary" />
									<span>Eventos Soportados & Formato de Solicitud</span>
								</h4>
								<p className="text-xs text-muted-foreground leading-relaxed">
									El endpoint inbound de Plottio procesa automáticamente los
									siguientes eventos enviados por la pasarela de WhatsApp:
								</p>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									{/* Evento 1: messages.upsert */}
									<div className="p-4 rounded-xl border border-border bg-secondary/15 space-y-2.5">
										<div className="flex items-center justify-between">
											<span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-mono text-xs font-bold">
												messages.upsert
											</span>
											<span className="text-[10px] text-muted-foreground">
												Mensajes Entrantes
											</span>
										</div>
										<p className="text-[11px] text-muted-foreground leading-relaxed">
											Recibe y despacha mensajes entrantes de clientes. Se
											sincroniza en el chat del cliente identificándolo por su
											número de teléfono (
											<code className="text-[10px]">remoteJid</code>).
										</p>
										<pre className="p-3 rounded-lg bg-background border border-border font-mono text-[10px] text-foreground overflow-x-auto leading-relaxed">
											{JSON.stringify(
												{
													event: "messages.upsert",
													instance: "plottio-central",
													data: {
														key: {
															remoteJid: "593991234567@s.whatsapp.net",
															fromMe: false,
															id: "MSG_A8B9C0",
														},
														message: {
															conversation:
																"Hola, solicito cotización para rotulado vehicular.",
														},
														messageTimestamp: 1775184000,
													},
												},
												null,
												2,
											)}
										</pre>
									</div>

									{/* Evento 2: connection.update */}
									<div className="p-4 rounded-xl border border-border bg-secondary/15 space-y-2.5">
										<div className="flex items-center justify-between">
											<span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 font-mono text-xs font-bold">
												connection.update
											</span>
											<span className="text-[10px] text-muted-foreground">
												Estado del Canal
											</span>
										</div>
										<p className="text-[11px] text-muted-foreground leading-relaxed">
											Notifica cambios en la sesión de WhatsApp (conectado,
											desconectado, código QR listo o en espera). Actualiza el
											indicador de disponibilidad.
										</p>
										<pre className="p-3 rounded-lg bg-background border border-border font-mono text-[10px] text-foreground overflow-x-auto leading-relaxed">
											{JSON.stringify(
												{
													event: "connection.update",
													instance: "plottio-central",
													state: "open",
													qr: null,
													timestamp: new Date().toISOString(),
												},
												null,
												2,
											)}
										</pre>
									</div>
								</div>
							</div>
						</div>
					)}

					{/* PESTAÑA 2: WEBHOOKS SALIENTES (OUTBOUND) */}
					{activeTab === "outbound" && (
						<div className="space-y-5">
							<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
								<div>
									<h4 className="text-sm font-bold text-foreground">
										Webhooks Salientes (Despacho a Sistemas Externos)
									</h4>
									<p className="text-xs text-muted-foreground">
										Despacha notificaciones en tiempo real a Zapier, Make, n8n u
										otros servicios cuando ocurren acciones en Plottio.
									</p>
								</div>
								<button
									type="button"
									onClick={() => setIsAddingOutbound((v) => !v)}
									className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1.5 shrink-0 self-start sm:self-auto shadow-xs"
								>
									<Plus className="h-3.5 w-3.5" />
									<span>+ Nuevo Webhook</span>
								</button>
							</div>

							{/* Add Outbound Webhook Form */}
							{isAddingOutbound && (
								<form
									onSubmit={handleAddOutbound}
									className="rounded-xl border border-border bg-secondary/15 p-5 space-y-4 animate-fade-in text-xs"
								>
									<div className="font-bold text-foreground text-sm">
										Registrar Nuevo Webhook Saliente
									</div>

									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
										<div>
											<label
												htmlFor="wh-name-in"
												className="block font-bold text-muted-foreground mb-1"
											>
												Nombre del Endpoint *
											</label>
											<input
												id="wh-name-in"
												type="text"
												required
												placeholder="ej. Zapier Sincronización CRM"
												value={outboundName}
												onChange={(e) => setOutboundName(e.target.value)}
												className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
											/>
										</div>

										<div>
											<label
												htmlFor="wh-url-in"
												className="block font-bold text-muted-foreground mb-1"
											>
												URL de Destino (POST) *
											</label>
											<input
												id="wh-url-in"
												type="url"
												required
												placeholder="https://hooks.zapier.com/hooks/catch/..."
												value={outboundUrl}
												onChange={(e) => setOutboundUrl(e.target.value)}
												className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
											/>
										</div>
									</div>

									<div>
										<label
											htmlFor="wh-events-options"
											className="block font-bold text-muted-foreground mb-1.5"
										>
											Eventos a Despachar
										</label>
										<div
											id="wh-events-options"
											className="flex flex-wrap gap-2"
										>
											{availableEvents.map((ev) => {
												const isSelected = selectedEvents.includes(ev.id);
												return (
													<button
														key={ev.id}
														type="button"
														onClick={() =>
															setSelectedEvents((prev) =>
																prev.includes(ev.id)
																	? prev.filter((x) => x !== ev.id)
																	: [...prev, ev.id],
															)
														}
														className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer border ${
															isSelected
																? "bg-primary text-primary-foreground border-primary shadow-xs font-bold"
																: "bg-background text-muted-foreground border-border hover:text-foreground"
														}`}
													>
														{ev.label}
													</button>
												);
											})}
										</div>
									</div>

									<div className="flex justify-end gap-2 pt-2 border-t border-border/60">
										<button
											type="button"
											onClick={() => setIsAddingOutbound(false)}
											className="px-3.5 py-1.5 rounded-lg border border-border bg-card text-foreground font-semibold hover:bg-secondary transition-colors cursor-pointer"
										>
											Cancelar
										</button>
										<button
											type="submit"
											className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
										>
											Guardar Webhook
										</button>
									</div>
								</form>
							)}

							{/* Outbound Webhooks List */}
							<div className="space-y-3">
								{webhooks.length === 0 ? (
									<div className="p-8 rounded-xl border border-dashed border-border text-center space-y-2">
										<div className="text-sm font-bold text-foreground">
											No hay webhooks salientes configurados
										</div>
										<p className="text-xs text-muted-foreground max-w-sm mx-auto">
											Agrega un nuevo webhook para despachar eventos de
											clientes, órdenes y cotizaciones hacia Zapier, Make o n8n.
										</p>
									</div>
								) : (
									webhooks.map((wh) => (
										<div
											key={wh.id}
											className="rounded-xl border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
										>
											<div className="space-y-1.5 min-w-0">
												<div className="flex items-center gap-2">
													<span className="font-bold text-sm text-foreground truncate">
														{wh.name}
													</span>
													<span
														className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
															wh.active
																? "bg-emerald-500/15 text-emerald-500"
																: "bg-muted text-muted-foreground"
														}`}
													>
														{wh.active ? "Activo" : "Pausado"}
													</span>
												</div>
												<div className="text-xs font-mono text-muted-foreground truncate">
													{wh.url}
												</div>
												<div className="flex items-center gap-1.5 text-[11px] text-muted-foreground flex-wrap pt-0.5">
													<span className="font-bold text-foreground">
														Eventos:
													</span>
													{wh.events.map((e) => (
														<span
															key={e}
															className="px-2 py-0.5 rounded bg-secondary text-[10px] font-mono text-foreground font-medium"
														>
															{e}
														</span>
													))}
												</div>
											</div>

											<div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
												<button
													type="button"
													onClick={() => toggleWebhook(wh.id)}
													className="px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-semibold hover:bg-secondary transition-colors cursor-pointer shadow-xs"
												>
													{wh.active ? "Pausar" : "Activar"}
												</button>
												<button
													type="button"
													onClick={() => deleteWebhook(wh.id)}
													className="p-1.5 rounded-lg border border-destructive/20 bg-card text-destructive hover:bg-destructive/10 transition-colors cursor-pointer shadow-xs"
													title="Eliminar webhook"
												>
													<Trash2 className="h-4 w-4" />
												</button>
											</div>
										</div>
									))
								)}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
