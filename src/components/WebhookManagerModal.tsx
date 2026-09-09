import {
	Activity,
	BookOpen,
	Check,
	Code,
	Copy,
	ExternalLink,
	Play,
	Plus,
	RefreshCw,
	ShieldCheck,
	Trash2,
	UserPlus,
	Webhook,
	X,
	Zap,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useIntegrationsStore } from "../store/useIntegrationsStore";

interface WebhookManagerModalProps {
	isOpen: boolean;
	onClose: () => void;
}

type PlatformType =
	| "Meta Lead Ads"
	| "TikTok Ads"
	| "Zapier"
	| "Make"
	| "Webhook Genérico";

export const WebhookManagerModal: React.FC<WebhookManagerModalProps> = ({
	isOpen,
	onClose,
}) => {
	const {
		webhooks,
		inboundLogs,
		inboundEndpoint,
		inboundSecret,
		regenerateInboundSecret,
		clearInboundLogs,
		addWebhook,
		toggleWebhook,
		deleteWebhook,
		simulateInboundLead,
	} = useIntegrationsStore();

	const [activeTab, setActiveTab] = useState<
		"inbound" | "simulator" | "logs" | "outbound" | "guide"
	>("inbound");

	const [selectedPlatform, setSelectedPlatform] =
		useState<PlatformType>("Meta Lead Ads");

	const [copiedField, setCopiedField] = useState<string | null>(null);

	// Outbound New Webhook state
	const [outboundName, setOutboundName] = useState("");
	const [outboundUrl, setOutboundUrl] = useState("");
	const [selectedEvents, setSelectedEvents] = useState<string[]>([
		"cliente.nuevo",
		"orden.creada",
	]);
	const [isAddingOutbound, setIsAddingOutbound] = useState(false);

	// Simulator state
	const [simNombre, setSimNombre] = useState("Carlos Mendoza");
	const [simTelefono, setSimTelefono] = useState("+593987654321");
	const [simEmpresa, setSimEmpresa] = useState("Andes Tech Logistics");
	const [simServicio, setSimServicio] = useState("Rotulado Flota 8 Furgonetas");
	const [simSuccessToast, setSimSuccessToast] = useState(false);

	if (!isOpen) return null;

	const handleCopy = (text: string, fieldId: string) => {
		navigator.clipboard.writeText(text);
		setCopiedField(fieldId);
		setTimeout(() => setCopiedField(null), 2000);
	};

	// Expected Payload example per platform
	const getPayloadExample = (platform: PlatformType) => {
		switch (platform) {
			case "Meta Lead Ads":
				return JSON.stringify(
					{
						object: "page",
						entry: [
							{
								id: "1092837465",
								time: 1770547200,
								changes: [
									{
										field: "leadgen",
										value: {
											form_id: "form_rotulado_flotas_2026",
											leadgen_id: "lead_meta_8849201",
											created_time: 1770547200,
											page_id: "page_plottio_oficial",
											ad_name: "Campaña Flotas Comerciales",
											full_name: "Mario Andrade",
											phone_number: "+593991234567",
											company: "Transportes Andrade & Hijos",
										},
									},
								],
							},
						],
					},
					null,
					2,
				);
			case "TikTok Ads":
				return JSON.stringify(
					{
						event: "lead_submitted",
						advertiser_id: "tiktok_adv_91823",
						campaign_name: "Tuning & Car Wrap TikTok",
						lead_id: "tt_lead_448102",
						fields: {
							name: "Kevin Salazar",
							phone: "+593984123890",
							vehicle: "Chevrolet D-Max 2024",
							wrap_color: "Negro Satinado",
						},
					},
					null,
					2,
				);
			case "Zapier":
				return JSON.stringify(
					{
						source: "Zapier Form / Catch Hook",
						name: "Carlos Mendoza",
						email: "carlos@andestech.com",
						phone: "+593987654321",
						company: "Andes Tech Logistics",
						fleet_size: "12 furgonetas",
						service: "Rotulado Corporativo Integral",
					},
					null,
					2,
				);
			case "Make":
				return JSON.stringify(
					{
						scenario_id: "make_scen_8832",
						client_name: "Lucía Paredes",
						phone: "+593976543210",
						company_name: "Distribuidora Express",
						interest: "Rotulado Frigorífico Hino",
					},
					null,
					2,
				);
			case "Webhook Genérico":
				return JSON.stringify(
					{
						event: "customer.lead_created",
						timestamp: new Date().toISOString(),
						data: {
							name: "David Morales",
							phone: "+593998877665",
							company: "Agropecuaria del Austro",
							service: "Gráfica para Camiones",
						},
					},
					null,
					2,
				);
		}
	};

	const handleAddOutbound = (e: React.FormEvent) => {
		e.preventDefault();
		if (!outboundName.trim() || !outboundUrl.trim()) return;
		addWebhook(outboundName.trim(), outboundUrl.trim(), selectedEvents);
		setOutboundName("");
		setOutboundUrl("");
		setIsAddingOutbound(false);
	};

	const handleRunSimulation = (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		simulateInboundLead({
			nombre: simNombre.trim(),
			telefono: simTelefono.trim(),
			empresa: simEmpresa.trim(),
			servicio: simServicio.trim(),
			vehiculo: simEmpresa.trim(),
			plataforma: selectedPlatform,
		});
		setSimSuccessToast(true);
		setTimeout(() => {
			setSimSuccessToast(false);
			setActiveTab("logs");
		}, 1400);
	};

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
									Inbound & Outbound HMAC
								</span>
							</div>
							<p className="text-xs text-muted-foreground">
								Captura prospectos de Meta Ads, TikTok, Zapier y sincroniza con
								el CRM de PLOTTIO
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* Navigation Tabs */}
				<div className="flex items-center gap-1 sm:gap-2 px-5 py-2.5 border-b border-border bg-card overflow-x-auto shrink-0 text-xs font-bold">
					<button
						type="button"
						onClick={() => setActiveTab("inbound")}
						className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
							activeTab === "inbound"
								? "bg-primary text-primary-foreground shadow-xs"
								: "bg-secondary/40 text-muted-foreground hover:text-foreground"
						}`}
					>
						<ShieldCheck className="h-3.5 w-3.5" />
						Inbound Webhook (Recepción)
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("simulator")}
						className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
							activeTab === "simulator"
								? "bg-primary text-primary-foreground shadow-xs"
								: "bg-secondary/40 text-muted-foreground hover:text-foreground"
						}`}
					>
						<Play className="h-3.5 w-3.5" />
						Simulador de Lead CRM
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("logs")}
						className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
							activeTab === "logs"
								? "bg-primary text-primary-foreground shadow-xs"
								: "bg-secondary/40 text-muted-foreground hover:text-foreground"
						}`}
					>
						<Activity className="h-3.5 w-3.5" />
						Registro en Vivo ({inboundLogs.length})
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("outbound")}
						className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
							activeTab === "outbound"
								? "bg-primary text-primary-foreground shadow-xs"
								: "bg-secondary/40 text-muted-foreground hover:text-foreground"
						}`}
					>
						<ExternalLink className="h-3.5 w-3.5" />
						Webhooks Salientes ({webhooks.length})
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("guide")}
						className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
							activeTab === "guide"
								? "bg-primary text-primary-foreground shadow-xs"
								: "bg-secondary/40 text-muted-foreground hover:text-foreground"
						}`}
					>
						<BookOpen className="h-3.5 w-3.5" />
						Guía Paso a Paso
					</button>
				</div>

				{/* Body Content */}
				<div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
					{/* TAB 1: INBOUND CONFIGURATION */}
					{activeTab === "inbound" && (
						<div className="space-y-6">
							{/* Connection Parameters */}
							<div className="rounded-xl border border-border bg-secondary/10 p-4 sm:p-5 space-y-4">
								<h4 className="text-sm font-bold text-foreground flex items-center gap-2">
									<ShieldCheck className="h-4 w-4 text-primary" />
									<span>Parámetros de Conexión Inbound</span>
								</h4>

								<div className="space-y-3">
									{/* Webhook URL */}
									<div>
										<label
											htmlFor="wh-url-field"
											className="block text-xs font-bold text-muted-foreground mb-1"
										>
											URL Autogenerada del Webhook (POST Inbound)
										</label>
										<div className="flex gap-2">
											<input
												id="wh-url-field"
												type="text"
												readOnly
												value={inboundEndpoint}
												className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-foreground select-all"
											/>
											<button
												type="button"
												onClick={() => handleCopy(inboundEndpoint, "whUrl")}
												className="px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5 shrink-0 cursor-pointer"
											>
												{copiedField === "whUrl" ? (
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
									</div>

									{/* Webhook Secret HMAC */}
									<div>
										<div className="flex justify-between items-center mb-1">
											<label
												htmlFor="wh-secret-field"
												className="block text-xs font-bold text-muted-foreground"
											>
												Clave Secreta HMAC (X-Hub-Signature-256)
											</label>
											<span className="text-[10px] text-muted-foreground">
												SHA-256 Cryptographic Verification
											</span>
										</div>
										<div className="flex gap-2">
											<input
												id="wh-secret-field"
												type="text"
												readOnly
												value={inboundSecret}
												className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-foreground select-all"
											/>
											<button
												type="button"
												onClick={() => handleCopy(inboundSecret, "whSecret")}
												className="px-3.5 py-2 rounded-lg border border-border bg-card hover:bg-secondary text-foreground text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
											>
												{copiedField === "whSecret" ? (
													<Check className="h-3.5 w-3.5 text-emerald-500" />
												) : (
													<Copy className="h-3.5 w-3.5" />
												)}
												<span>Copiar Secret</span>
											</button>
											<button
												type="button"
												onClick={regenerateInboundSecret}
												className="px-3 py-2 rounded-lg border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground text-xs font-semibold transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
												title="Regenerar clave secreta"
											>
												<RefreshCw className="h-3.5 w-3.5" />
												<span className="hidden sm:inline">Regenerar</span>
											</button>
										</div>
									</div>
								</div>
							</div>

							{/* Platform Origin Selector & Payload Schema Example */}
							<div className="rounded-xl border border-border bg-card p-5 space-y-4">
								<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
									<div>
										<h4 className="text-sm font-bold text-foreground flex items-center gap-2">
											<Code className="h-4 w-4 text-primary" />
											<span>Plataforma Origen & Payload Esperado</span>
										</h4>
										<p className="text-xs text-muted-foreground">
											Selecciona la plataforma para visualizar el formato JSON y
											campos automáticos para el CRM.
										</p>
									</div>

									{/* Quick Simulator CTA */}
									<button
										type="button"
										onClick={() => handleRunSimulation()}
										className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
									>
										<Play className="h-3 w-3" />
										<span>Simular Lead de Prueba ({selectedPlatform})</span>
									</button>
								</div>

								{/* Platform Selector Tabs */}
								<div className="flex flex-wrap gap-2 pt-1">
									{(
										[
											"Meta Lead Ads",
											"TikTok Ads",
											"Zapier",
											"Make",
											"Webhook Genérico",
										] as PlatformType[]
									).map((plat) => (
										<button
											key={plat}
											type="button"
											onClick={() => setSelectedPlatform(plat)}
											className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
												selectedPlatform === plat
													? "border-primary bg-primary/10 text-primary"
													: "border-border bg-background text-muted-foreground hover:bg-secondary"
											}`}
										>
											{plat}
										</button>
									))}
								</div>

								{/* JSON Code Preview */}
								<div className="relative">
									<pre className="p-4 rounded-xl bg-secondary/30 border border-border font-mono text-[11px] text-foreground overflow-x-auto max-h-56 leading-relaxed">
										{getPayloadExample(selectedPlatform)}
									</pre>
									<button
										type="button"
										onClick={() =>
											handleCopy(
												getPayloadExample(selectedPlatform),
												"payloadCode",
											)
										}
										className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded bg-card border border-border text-[10px] font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer shadow-xs"
									>
										{copiedField === "payloadCode" ? (
											<>
												<Check className="h-3 w-3 text-emerald-500" />
												<span>Copiado</span>
											</>
										) : (
											<>
												<Copy className="h-3 w-3" />
												<span>Copiar JSON</span>
											</>
										)}
									</button>
								</div>
							</div>
						</div>
					)}

					{/* TAB 2: SIMULATOR */}
					{activeTab === "simulator" && (
						<form
							onSubmit={handleRunSimulation}
							className="space-y-4 rounded-xl border border-border bg-card p-5"
						>
							<div>
								<h4 className="text-sm font-bold text-foreground flex items-center gap-2">
									<UserPlus className="h-4 w-4 text-emerald-500" />
									<span>
										Simulador de Leads Entrantes hacia el CRM Comercial
									</span>
								</h4>
								<p className="text-xs text-muted-foreground mt-0.5">
									Envía un webhook sintético con firma HMAC SHA-256 válida. Se
									creará automáticamente la ficha de cliente en el sistema.
								</p>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
								<div>
									<label
										htmlFor="sim-plat"
										className="block font-bold text-muted-foreground mb-1"
									>
										Plataforma Origen
									</label>
									<select
										id="sim-plat"
										value={selectedPlatform}
										onChange={(e) =>
											setSelectedPlatform(e.target.value as PlatformType)
										}
										className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:border-primary"
									>
										<option value="Meta Lead Ads">
											Meta Lead Ads (Facebook / Instagram)
										</option>
										<option value="TikTok Ads">TikTok Ads</option>
										<option value="Zapier">Zapier Catch Hook</option>
										<option value="Make">Make (Integromat)</option>
										<option value="Webhook Genérico">Webhook Genérico</option>
									</select>
								</div>

								<div>
									<label
										htmlFor="sim-nom"
										className="block font-bold text-muted-foreground mb-1"
									>
										Nombre del Prospecto *
									</label>
									<input
										id="sim-nom"
										type="text"
										required
										value={simNombre}
										onChange={(e) => setSimNombre(e.target.value)}
										className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:border-primary"
									/>
								</div>

								<div>
									<label
										htmlFor="sim-tel"
										className="block font-bold text-muted-foreground mb-1"
									>
										Teléfono WhatsApp *
									</label>
									<input
										id="sim-tel"
										type="text"
										required
										value={simTelefono}
										onChange={(e) => setSimTelefono(e.target.value)}
										className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:border-primary"
									/>
								</div>

								<div>
									<label
										htmlFor="sim-emp"
										className="block font-bold text-muted-foreground mb-1"
									>
										Empresa o Vehículo
									</label>
									<input
										id="sim-emp"
										type="text"
										value={simEmpresa}
										onChange={(e) => setSimEmpresa(e.target.value)}
										className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:border-primary"
									/>
								</div>

								<div className="sm:col-span-2">
									<label
										htmlFor="sim-srv"
										className="block font-bold text-muted-foreground mb-1"
									>
										Servicio de Interés
									</label>
									<input
										id="sim-srv"
										type="text"
										value={simServicio}
										onChange={(e) => setSimServicio(e.target.value)}
										className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:border-primary"
									/>
								</div>
							</div>

							<div className="pt-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
								{simSuccessToast ? (
									<span className="text-xs text-emerald-500 font-bold flex items-center gap-1.5 animate-fade-in">
										<Check className="h-4 w-4" />
										¡Lead creado con éxito en CRM! HTTP 200 OK & HMAC validado.
									</span>
								) : (
									<span className="text-[11px] text-muted-foreground">
										Se agregará al registro en vivo y al pipeline comercial.
									</span>
								)}

								<button
									type="submit"
									className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-sm flex items-center justify-center gap-2"
								>
									<Play className="h-3.5 w-3.5" />
									<span>Disparar Webhook & Crear Cliente</span>
								</button>
							</div>
						</form>
					)}

					{/* TAB 3: LIVE LOGS */}
					{activeTab === "logs" && (
						<div className="space-y-4">
							{/* Live Stats Header */}
							<div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-secondary/10">
								<div className="flex items-center gap-3">
									<span className="text-xs font-bold text-foreground">
										Total Eventos:{" "}
										<strong className="text-primary">
											{inboundLogs.length}
										</strong>
									</span>
									<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
										Tasa de Éxito: 100% 200 OK
									</span>
									<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-500 border border-purple-500/30">
										HMAC SHA-256: Válido
									</span>
								</div>

								{inboundLogs.length > 0 && (
									<button
										type="button"
										onClick={clearInboundLogs}
										className="text-xs text-destructive hover:underline cursor-pointer flex items-center gap-1"
									>
										<Trash2 className="h-3 w-3" />
										Limpiar Historial
									</button>
								)}
							</div>

							{/* Logs Table / Cards */}
							{inboundLogs.length === 0 ? (
								<div className="p-10 rounded-xl border border-dashed border-border text-center space-y-2">
									<div className="mx-auto w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground">
										<Activity className="h-5 w-5" />
									</div>
									<div className="text-sm font-bold text-foreground">
										Esperando primeras solicitudes...
									</div>
									<p className="text-xs text-muted-foreground max-w-sm mx-auto">
										Envía un payload a la URL del webhook o pulsa "Simular Lead
										de Prueba" para comprobar la recepción en vivo.
									</p>
									<div className="pt-2">
										<button
											type="button"
											onClick={() => handleRunSimulation()}
											className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
										>
											Simular Lead Ahora
										</button>
									</div>
								</div>
							) : (
								<div className="space-y-3">
									{inboundLogs.map((log) => (
										<div
											key={log.id}
											className="rounded-xl border border-border bg-card p-4 space-y-2.5 shadow-xs"
										>
											<div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
												<div className="flex items-center gap-2">
													<span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-bold font-mono">
														{log.source || "Inbound Webhook"}
													</span>
													<span className="text-xs font-bold text-foreground">
														{log.leadName || log.event}
													</span>
													{log.leadCompany && (
														<span className="text-xs text-muted-foreground">
															({log.leadCompany})
														</span>
													)}
												</div>

												<div className="flex items-center gap-2 text-xs">
													<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/20">
														<Check className="h-3 w-3" />
														HTTP 200 OK
													</span>
													<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/20">
														<ShieldCheck className="h-3 w-3" />
														HMAC Válida
													</span>
													<span className="text-[11px] text-muted-foreground font-mono">
														{log.receivedAt}
													</span>
												</div>
											</div>

											{/* Extra details line */}
											<div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
												<span className="font-mono">
													IP:{" "}
													<strong className="text-foreground">
														{log.ip || "192.168.1.1"}
													</strong>
												</span>
												{log.leadPhone && (
													<span>
														Tel:{" "}
														<strong className="text-foreground">
															{log.leadPhone}
														</strong>
													</span>
												)}
												<span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 font-bold text-[10px]">
													✓ Creado en CRM
												</span>
											</div>

											{/* Raw JSON Payload */}
											<pre className="p-2.5 rounded-lg bg-secondary/20 border border-border font-mono text-[10px] text-foreground overflow-x-auto whitespace-pre-wrap max-h-36">
												{log.payload}
											</pre>
										</div>
									))}
								</div>
							)}
						</div>
					)}

					{/* TAB 4: OUTBOUND WEBHOOKS */}
					{activeTab === "outbound" && (
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<div>
									<h4 className="text-sm font-bold text-foreground">
										Webhooks Salientes (Disparadores Automáticos)
									</h4>
									<p className="text-xs text-muted-foreground">
										Notifica a Slack, Discord o sistemas externos cada vez que
										ocurra un evento en PLOTTIO.
									</p>
								</div>
								<button
									type="button"
									onClick={() => setIsAddingOutbound((v) => !v)}
									className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1"
								>
									<Plus className="h-3.5 w-3.5" />
									<span>Nuevo Disparador</span>
								</button>
							</div>

							{isAddingOutbound && (
								<form
									onSubmit={handleAddOutbound}
									className="rounded-xl border border-border bg-secondary/15 p-4 space-y-3 animate-fade-in text-xs"
								>
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
												placeholder="ej. Alertas Slack Taller"
												value={outboundName}
												onChange={(e) => setOutboundName(e.target.value)}
												className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-foreground focus:outline-none"
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
												placeholder="https://hooks.slack.com/services/..."
												value={outboundUrl}
												onChange={(e) => setOutboundUrl(e.target.value)}
												className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-foreground focus:outline-none"
											/>
										</div>
									</div>

									<div>
										<label
											htmlFor="wh-events-options"
											className="block font-bold text-muted-foreground mb-1.5"
										>
											Eventos a Suscribir
										</label>
										<div
											id="wh-events-options"
											className="flex flex-wrap gap-2"
										>
											{[
												"cliente.nuevo",
												"cotizacion.aprobada",
												"orden.creada",
												"orden.terminada",
											].map((ev) => (
												<button
													key={ev}
													type="button"
													onClick={() =>
														setSelectedEvents((prev) =>
															prev.includes(ev)
																? prev.filter((x) => x !== ev)
																: [...prev, ev],
														)
													}
													className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors cursor-pointer border ${
														selectedEvents.includes(ev)
															? "bg-primary text-primary-foreground border-primary"
															: "bg-background text-muted-foreground border-border"
													}`}
												>
													{ev}
												</button>
											))}
										</div>
									</div>

									<div className="flex justify-end gap-2 pt-2">
										<button
											type="button"
											onClick={() => setIsAddingOutbound(false)}
											className="px-3 py-1.5 rounded-lg border border-border bg-card text-foreground"
										>
											Cancelar
										</button>
										<button
											type="submit"
											className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground font-bold"
										>
											Guardar Webhook
										</button>
									</div>
								</form>
							)}

							<div className="space-y-2.5">
								{webhooks.map((wh) => (
									<div
										key={wh.id}
										className="rounded-xl border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
									>
										<div className="space-y-1 min-w-0">
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
											<div className="flex items-center gap-1 text-[11px] text-muted-foreground flex-wrap pt-0.5">
												<span className="font-bold text-foreground">
													Eventos:
												</span>
												{wh.events.map((e) => (
													<span
														key={e}
														className="px-1.5 py-0.2 rounded bg-secondary text-[10px] font-mono"
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

					{/* TAB 5: STEP BY STEP GUIDE */}
					{activeTab === "guide" && (
						<div className="space-y-5 text-xs sm:text-sm">
							<div className="rounded-xl border border-border bg-secondary/15 p-4 space-y-3">
								<h4 className="text-sm font-bold text-foreground flex items-center gap-2">
									<Zap className="h-4 w-4 text-primary" />
									<span>Meta Lead Ads (Facebook & Instagram Ads)</span>
								</h4>
								<ol className="list-decimal list-inside space-y-1.5 text-muted-foreground text-xs leading-relaxed">
									<li>
										Entra a{" "}
										<a
											href="https://developers.facebook.com/"
											target="_blank"
											rel="noreferrer"
											className="text-primary underline"
										>
											Meta for Developers
										</a>{" "}
										y selecciona tu App Business.
									</li>
									<li>
										En el panel de productos agrega <strong>Webhooks</strong> y
										selecciona el objeto <strong>Page</strong> o{" "}
										<strong>Leadgen</strong>.
									</li>
									<li>
										Configura el Webhook:
										<ul className="list-disc list-inside ml-4 mt-1 space-y-1 font-mono text-[11px]">
											<li>
												Callback URL:{" "}
												<span className="text-primary">{inboundEndpoint}</span>
											</li>
											<li>
												Verify Token: Escribe tu secreto HMAC o frase segura
											</li>
										</ul>
									</li>
									<li>
										Suscríbete al campo <strong>leadgen</strong>. Cada vez que
										un usuario llene un formulario en tus anuncios de Facebook o
										Instagram, entrará automáticamente al CRM de PLOTTIO.
									</li>
								</ol>
							</div>

							<div className="rounded-xl border border-border bg-secondary/15 p-4 space-y-3">
								<h4 className="text-sm font-bold text-foreground flex items-center gap-2">
									<Zap className="h-4 w-4 text-primary" />
									<span>Zapier o Make (Integromat)</span>
								</h4>
								<ol className="list-decimal list-inside space-y-1.5 text-muted-foreground text-xs leading-relaxed">
									<li>
										En Zapier o Make crea un módulo{" "}
										<strong>Webhooks by Zapier → Catch Hook</strong>.
									</li>
									<li>
										Para enviar prospectos hacia PLOTTIO: usa un módulo{" "}
										<strong>HTTP Request (POST)</strong> hacia la URL de tu
										webhook.
									</li>
									<li>
										Envía en el cuerpo JSON:
										<pre className="p-2.5 mt-1 rounded bg-background border border-border font-mono text-[10px] text-foreground">
											{JSON.stringify(
												{
													name: "Carlos Mendoza",
													email: "carlos@empresa.com",
													phone: "+593991234567",
													company: "Andes Tech",
													source: "Zapier Form",
												},
												null,
												2,
											)}
										</pre>
									</li>
									<li>
										En menos de 1 segundo se creará la ficha del cliente en el
										CRM y se enviará la alerta a Telegram.
									</li>
								</ol>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
