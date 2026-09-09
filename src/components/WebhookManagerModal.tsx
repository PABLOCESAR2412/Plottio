import { Activity, Check, Play, Plus, Trash2, Webhook, X } from "lucide-react";
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
		inboundLogs,
		addWebhook,
		toggleWebhook,
		deleteWebhook,
		simulateInboundLead,
	} = useIntegrationsStore();

	const [activeTab, setActiveTab] = useState<"webhooks" | "simulator" | "logs">(
		"webhooks",
	);

	// New Webhook state
	const [name, setName] = useState("");
	const [url, setUrl] = useState("");
	const [selectedEvents, setSelectedEvents] = useState<string[]>([
		"cliente.nuevo",
		"orden.creada",
	]);
	const [isAdding, setIsAdding] = useState(false);

	// Simulator state
	const [leadNombre, setLeadNombre] = useState("Esteban Carrera");
	const [leadTelefono, setLeadTelefono] = useState("0987654321");
	const [leadServicio, setLeadServicio] = useState("Rotulado Integral Bus");
	const [leadVehiculo, setLeadVehiculo] = useState("Hino FG 2024");
	const [simulatedSuccess, setSimulatedSuccess] = useState(false);

	if (!isOpen) return null;

	const allEvents = [
		{ id: "cliente.nuevo", label: "Nuevo Cliente Creado" },
		{ id: "cotizacion.aprobada", label: "Cotización Aprobada" },
		{ id: "orden.creada", label: "Orden de Trabajo Iniciada" },
		{ id: "orden.terminada", label: "Orden de Trabajo Finalizada" },
		{ id: "cita.agendada", label: "Cita Agendada" },
	];

	const handleAddWebhook = (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim() || !url.trim() || selectedEvents.length === 0) return;
		addWebhook(name.trim(), url.trim(), selectedEvents);
		setName("");
		setUrl("");
		setIsAdding(false);
	};

	const handleSimulate = (e: React.FormEvent) => {
		e.preventDefault();
		simulateInboundLead({
			nombre: leadNombre.trim(),
			telefono: leadTelefono.trim(),
			servicio: leadServicio.trim(),
			vehiculo: leadVehiculo.trim(),
		});
		setSimulatedSuccess(true);
		setTimeout(() => {
			setSimulatedSuccess(false);
			setActiveTab("logs");
		}, 1200);
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
			<button
				type="button"
				className="fixed inset-0 w-full h-full cursor-default"
				onClick={onClose}
				aria-label="Cerrar modal"
			/>
			<div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl z-10 animate-slide-in flex flex-col p-5 sm:p-6 space-y-5">
				{/* Top Header */}
				<div className="flex items-center justify-between border-b border-border pb-4">
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
							<Webhook className="h-6 w-6" />
						</div>
						<div>
							<h3 className="text-lg font-bold text-foreground flex items-center gap-2">
								<span>Hub Central de Webhooks & Disparadores</span>
							</h3>
							<p className="text-xs text-muted-foreground">
								Conecta PLOTTIO con Zapier, Make, n8n, CRMs y sistemas de
								facturación.
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

				{/* Tabs Selector */}
				<div className="flex gap-2 border-b border-border pb-3">
					<button
						type="button"
						onClick={() => setActiveTab("webhooks")}
						className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
							activeTab === "webhooks"
								? "bg-primary text-primary-foreground"
								: "bg-secondary/40 text-muted-foreground hover:text-foreground"
						}`}
					>
						Webhooks Activos ({webhooks.length})
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("simulator")}
						className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
							activeTab === "simulator"
								? "bg-primary text-primary-foreground"
								: "bg-secondary/40 text-muted-foreground hover:text-foreground"
						}`}
					>
						<Play className="h-3.5 w-3.5" />
						Simulador Inbound
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("logs")}
						className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
							activeTab === "logs"
								? "bg-primary text-primary-foreground"
								: "bg-secondary/40 text-muted-foreground hover:text-foreground"
						}`}
					>
						<Activity className="h-3.5 w-3.5" />
						Logs Recibidos ({inboundLogs.length})
					</button>
				</div>

				{/* Tab 1: Webhooks List */}
				{activeTab === "webhooks" && (
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<span className="text-xs font-semibold text-muted-foreground">
								Disparadores de eventos en tiempo real (HTTP POST con HMAC)
							</span>
							<button
								type="button"
								onClick={() => setIsAdding((v) => !v)}
								className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1 shadow-xs"
							>
								<Plus className="h-3.5 w-3.5" />
								<span>Crear Webhook</span>
							</button>
						</div>

						{/* Add Webhook Drawer */}
						{isAdding && (
							<form
								onSubmit={handleAddWebhook}
								className="p-4 rounded-xl border border-border bg-secondary/15 space-y-3 animate-fade-in text-xs"
							>
								<div className="font-bold text-foreground text-xs">
									Nuevo Endpoint Webhook
								</div>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									<div>
										<label
											htmlFor="wh-name"
											className="block text-muted-foreground font-semibold mb-1"
										>
											Nombre Identificador *
										</label>
										<input
											id="wh-name"
											type="text"
											required
											placeholder="Ej. Sincronización Zapier Lead"
											value={name}
											onChange={(e) => setName(e.target.value)}
											className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none"
										/>
									</div>
									<div>
										<label
											htmlFor="wh-url"
											className="block text-muted-foreground font-semibold mb-1"
										>
											URL Destino (HTTPS) *
										</label>
										<input
											id="wh-url"
											type="url"
											required
											placeholder="https://hooks.zapier.com/hooks/catch/..."
											value={url}
											onChange={(e) => setUrl(e.target.value)}
											className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground font-mono focus:outline-none"
										/>
									</div>
								</div>

								<div>
									<span className="block text-muted-foreground font-semibold mb-1.5">
										Eventos que activarán el webhook:
									</span>
									<div className="flex flex-wrap gap-2">
										{allEvents.map((ev) => (
											<label
												key={ev.id}
												className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-background text-[11px] cursor-pointer"
											>
												<input
													type="checkbox"
													checked={selectedEvents.includes(ev.id)}
													onChange={() =>
														setSelectedEvents((prev) =>
															prev.includes(ev.id)
																? prev.filter((i) => i !== ev.id)
																: [...prev, ev.id],
														)
													}
													className="h-3.5 w-3.5 rounded text-primary"
												/>
												<span>{ev.label}</span>
											</label>
										))}
									</div>
								</div>

								<div className="flex justify-end gap-2 pt-2">
									<button
										type="button"
										onClick={() => setIsAdding(false)}
										className="px-3 py-1.5 rounded-lg border border-border bg-card text-foreground"
									>
										Cancelar
									</button>
									<button
										type="submit"
										className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold"
									>
										Guardar Webhook
									</button>
								</div>
							</form>
						)}

						{/* Webhooks Items */}
						<div className="space-y-3">
							{webhooks.map((wh) => (
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
														? "bg-green-500/15 text-green-500"
														: "bg-muted text-muted-foreground"
												}`}
											>
												{wh.active ? "Activo" : "Pausado"}
											</span>
										</div>
										<div className="text-xs font-mono text-muted-foreground truncate">
											{wh.url}
										</div>
										<div className="flex items-center gap-1.5 text-[11px] text-muted-foreground flex-wrap">
											<span className="font-bold text-foreground">
												Eventos:
											</span>
											{wh.events.map((ev) => (
												<span
													key={ev}
													className="px-1.5 py-0.2 rounded bg-secondary text-[10px] font-mono"
												>
													{ev}
												</span>
											))}
											<span className="ml-2 font-mono text-[10px] opacity-70">
												Secret: {wh.secret}
											</span>
										</div>
									</div>

									<div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
										<button
											type="button"
											onClick={() => toggleWebhook(wh.id)}
											className="px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-semibold hover:bg-secondary transition-colors cursor-pointer"
										>
											{wh.active ? "Pausar" : "Activar"}
										</button>
										<button
											type="button"
											onClick={() => deleteWebhook(wh.id)}
											className="p-1.5 rounded-lg border border-destructive/20 bg-card text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
											title="Eliminar webhook"
										>
											<Trash2 className="h-4 w-4" />
										</button>
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Tab 2: Inbound Simulator */}
				{activeTab === "simulator" && (
					<form
						onSubmit={handleSimulate}
						className="space-y-4 rounded-xl border border-border bg-secondary/10 p-4 text-xs sm:text-sm"
					>
						<div>
							<div className="font-bold text-foreground">
								Simulador de Leads Entrantes (Inbound Webhook)
							</div>
							<p className="text-xs text-muted-foreground">
								Envía una carga JSON de prueba simulando un cliente potencial
								desde Facebook Ads, landing page o CRM externo.
							</p>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<div>
								<label
									htmlFor="lead-nom"
									className="block text-xs font-semibold text-muted-foreground mb-1"
								>
									Nombre del Prospecto *
								</label>
								<input
									id="lead-nom"
									type="text"
									required
									value={leadNombre}
									onChange={(e) => setLeadNombre(e.target.value)}
									className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none"
								/>
							</div>
							<div>
								<label
									htmlFor="lead-tel"
									className="block text-xs font-semibold text-muted-foreground mb-1"
								>
									Teléfono de Contacto *
								</label>
								<input
									id="lead-tel"
									type="text"
									required
									value={leadTelefono}
									onChange={(e) => setLeadTelefono(e.target.value)}
									className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none"
								/>
							</div>
							<div>
								<label
									htmlFor="lead-serv"
									className="block text-xs font-semibold text-muted-foreground mb-1"
								>
									Servicio de Interés
								</label>
								<input
									id="lead-serv"
									type="text"
									value={leadServicio}
									onChange={(e) => setLeadServicio(e.target.value)}
									className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none"
								/>
							</div>
							<div>
								<label
									htmlFor="lead-veh"
									className="block text-xs font-semibold text-muted-foreground mb-1"
								>
									Vehículo Declarado
								</label>
								<input
									id="lead-veh"
									type="text"
									value={leadVehiculo}
									onChange={(e) => setLeadVehiculo(e.target.value)}
									className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none"
								/>
							</div>
						</div>

						<div className="pt-2 flex items-center justify-between">
							{simulatedSuccess ? (
								<span className="text-xs text-green-500 font-semibold flex items-center gap-1">
									<Check className="h-4 w-4" />
									¡Payload procesado exitosamente (HTTP 200 OK)!
								</span>
							) : (
								<span className="text-[11px] text-muted-foreground">
									Se registrará en los logs entrantes de PLOTTIO.
								</span>
							)}
							<button
								type="submit"
								className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs flex items-center gap-1.5"
							>
								<Play className="h-3.5 w-3.5" />
								<span>Disparar Inbound Payload</span>
							</button>
						</div>
					</form>
				)}

				{/* Tab 3: Logs */}
				{activeTab === "logs" && (
					<div className="space-y-3">
						<span className="text-xs font-semibold text-muted-foreground">
							Historial de eventos inbound capturados
						</span>
						<div className="space-y-2 max-h-[360px] overflow-y-auto">
							{inboundLogs.map((log) => (
								<div
									key={log.id}
									className="rounded-xl border border-border bg-secondary/15 p-3.5 space-y-1.5 text-xs font-mono"
								>
									<div className="flex items-center justify-between text-muted-foreground">
										<span className="font-bold text-foreground">
											{log.event}
										</span>
										<div className="flex items-center gap-2">
											<span className="text-[10px] px-1.5 py-0.2 rounded bg-green-500/15 text-green-500 font-bold">
												HTTP {log.responseCode}
											</span>
											<span>{log.receivedAt}</span>
										</div>
									</div>
									<pre className="p-2 rounded bg-background border border-border overflow-x-auto text-[11px] text-foreground whitespace-pre-wrap">
										{log.payload}
									</pre>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
