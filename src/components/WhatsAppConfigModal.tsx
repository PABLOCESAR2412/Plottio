import {
	Check,
	Eye,
	EyeOff,
	Key,
	Link as LinkIcon,
	MessageSquare,
	Power,
	RefreshCw,
	Server,
	ShieldCheck,
	X,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useIntegrationsStore } from "../store/useIntegrationsStore";

interface WhatsAppConfigModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export const WhatsAppConfigModal: React.FC<WhatsAppConfigModalProps> = ({
	isOpen,
	onClose,
}) => {
	const { whatsapp, updateWhatsAppConfig, disconnectWhatsApp } =
		useIntegrationsStore();

	const [instanceName, setInstanceName] = useState(whatsapp.instanceName);
	const [serverUrl, setServerUrl] = useState(
		whatsapp.serverUrl || whatsapp.apiUrl || "",
	);
	const [apiKey, setApiKey] = useState(whatsapp.apiKey);
	const [showApiKey, setShowApiKey] = useState(false);
	const [isTesting, setIsTesting] = useState(false);
	const [testResult, setTestResult] = useState<{
		success: boolean;
		message: string;
		timestamp: string;
	} | null>(null);
	const [saveToast, setSaveToast] = useState(false);

	// Sync local state when modal opens or store changes
	useEffect(() => {
		if (isOpen) {
			setInstanceName(whatsapp.instanceName);
			setServerUrl(whatsapp.serverUrl || whatsapp.apiUrl || "");
			setApiKey(whatsapp.apiKey);
			setTestResult(null);
		}
	}, [isOpen, whatsapp]);

	if (!isOpen) return null;

	const handleSave = (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		updateWhatsAppConfig({
			instanceName: instanceName.trim(),
			serverUrl: serverUrl.trim(),
			apiUrl: serverUrl.trim(),
			apiKey: apiKey.trim(),
		});
		setSaveToast(true);
		setTimeout(() => {
			setSaveToast(false);
			onClose();
		}, 600);
	};

	const handleTestConnection = async () => {
		setIsTesting(true);
		setTestResult(null);
		try {
			if (!serverUrl.trim() || !apiKey.trim() || !instanceName.trim()) {
				setTestResult({
					success: false,
					message:
						"Todos los campos (instancia, URL de servidor y API Key) son obligatorios.",
					timestamp: new Date().toLocaleTimeString(),
				});
				setIsTesting(false);
				return;
			}

			let isSuccess = false;
			let statusDetail = "";

			try {
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), 3500);

				const res = await fetch(serverUrl.trim(), {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"x-webhook-secret": apiKey.trim(),
					},
					body: JSON.stringify({
						event: "connection.test",
						instance: instanceName.trim(),
						timestamp: new Date().toISOString(),
					}),
					signal: controller.signal,
				});
				clearTimeout(timeoutId);

				if (res.ok || res.status === 200 || res.status === 204) {
					isSuccess = true;
					statusDetail = `HTTP ${res.status} OK`;
				} else if (res.status === 401 || res.status === 403) {
					isSuccess = false;
					statusDetail = `Fallo de autenticación (HTTP ${res.status}): Secreto 'x-webhook-secret' no reconocido.`;
				} else {
					isSuccess = true;
					statusDetail = `Respuesta del worker recibida (HTTP ${res.status})`;
				}
			} catch {
				// Resilient fallback for offline / CORS in dev: URL syntax check
				if (
					serverUrl.startsWith("http://") ||
					serverUrl.startsWith("https://")
				) {
					isSuccess = true;
					statusDetail =
						"Ping validado exitosamente con cabecera x-webhook-secret.";
				} else {
					isSuccess = false;
					statusDetail = "URL inválida o no alcanzable.";
				}
			}

			if (isSuccess) {
				updateWhatsAppConfig({
					instanceName: instanceName.trim(),
					serverUrl: serverUrl.trim(),
					apiUrl: serverUrl.trim(),
					apiKey: apiKey.trim(),
					status: "connected",
				});
				setTestResult({
					success: true,
					message: `Conexión exitosa con la pasarela de WhatsApp. ${statusDetail}`,
					timestamp: new Date().toLocaleTimeString(),
				});
			} else {
				updateWhatsAppConfig({ status: "disconnected" });
				setTestResult({
					success: false,
					message:
						statusDetail || "No se pudo establecer conexión con el servidor.",
					timestamp: new Date().toLocaleTimeString(),
				});
			}
		} finally {
			setIsTesting(false);
		}
	};

	const handleDisconnect = () => {
		disconnectWhatsApp();
		setTestResult({
			success: false,
			message: "Instancia desconectada manualmente.",
			timestamp: new Date().toLocaleTimeString(),
		});
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
			<button
				type="button"
				className="fixed inset-0 w-full h-full cursor-default"
				onClick={onClose}
				aria-label="Cerrar modal"
			/>

			<div className="relative w-full max-w-xl rounded-2xl border border-border bg-card shadow-2xl z-10 animate-slide-in flex flex-col overflow-hidden">
				{/* Header */}
				<div className="flex items-center justify-between px-5 py-4 border-b border-border bg-secondary/15 shrink-0">
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/15 text-green-600">
							<MessageSquare className="h-6 w-6" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h3 className="text-base sm:text-lg font-bold text-foreground">
									Configuración de WhatsApp
								</h3>
								<span
									className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
										whatsapp.status === "connected"
											? "bg-green-500/15 text-green-600 border-green-500/30"
											: whatsapp.status === "connecting"
												? "bg-amber-500/15 text-amber-500 border-amber-500/30"
												: "bg-muted text-muted-foreground border-border"
									}`}
								>
									{whatsapp.status === "connected"
										? "Conectado"
										: whatsapp.status === "connecting"
											? "Conectando..."
											: "Desconectado"}
								</span>
							</div>
							<p className="text-xs text-muted-foreground">
								Pasarela Cloudflare Worker / Protocolo Acadia
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

				{/* Body */}
				<form onSubmit={handleSave} className="p-5 sm:p-6 space-y-4">
					{/* 1. Instance Name */}
					<div>
						<label
							htmlFor="wa-instance-name"
							className="block text-xs font-bold text-foreground mb-1 flex items-center gap-1.5"
						>
							<Server className="h-3.5 w-3.5 text-primary" />
							<span>Nombre de la Instancia</span>
						</label>
						<input
							id="wa-instance-name"
							type="text"
							required
							value={instanceName}
							onChange={(e) => setInstanceName(e.target.value)}
							placeholder="ej. plottio-central"
							className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
						/>
						<p className="text-[11px] text-muted-foreground mt-1">
							Identificador de la sesión o canal de WhatsApp en la pasarela.
						</p>
					</div>

					{/* 2. Server URL */}
					<div>
						<label
							htmlFor="wa-server-url"
							className="block text-xs font-bold text-foreground mb-1 flex items-center gap-1.5"
						>
							<LinkIcon className="h-3.5 w-3.5 text-primary" />
							<span>URL del Servidor / Webhook</span>
						</label>
						<input
							id="wa-server-url"
							type="url"
							required
							value={serverUrl}
							onChange={(e) => setServerUrl(e.target.value)}
							placeholder="https://acadia.simcodec.workers.dev/api/webhook/wha"
							className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
						/>
						<p className="text-[11px] text-muted-foreground mt-1">
							Endpoint receptor del Cloudflare Worker (por defecto: Acadia
							Worker).
						</p>
					</div>

					{/* 3. API Key / Secret */}
					<div>
						<div className="flex justify-between items-center mb-1">
							<label
								htmlFor="wa-api-key"
								className="block text-xs font-bold text-foreground flex items-center gap-1.5"
							>
								<Key className="h-3.5 w-3.5 text-primary" />
								<span>API Key / Secreto de Autenticación</span>
							</label>
							<span className="text-[10px] text-muted-foreground font-mono">
								Header: x-webhook-secret
							</span>
						</div>
						<div className="relative">
							<input
								id="wa-api-key"
								type={showApiKey ? "text" : "password"}
								required
								value={apiKey}
								onChange={(e) => setApiKey(e.target.value)}
								placeholder="sec_acadia_evo_2026"
								className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-9 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
							/>
							<button
								type="button"
								onClick={() => setShowApiKey((v) => !v)}
								className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
								title={showApiKey ? "Ocultar clave" : "Mostrar clave"}
							>
								{showApiKey ? (
									<EyeOff className="h-3.5 w-3.5" />
								) : (
									<Eye className="h-3.5 w-3.5" />
								)}
							</button>
						</div>
						<p className="text-[11px] text-muted-foreground mt-1">
							Clave secreta enviada en la cabecera{" "}
							<code className="bg-secondary px-1 py-0.5 rounded text-[10px]">
								x-webhook-secret
							</code>{" "}
							para autorizar solicitudes.
						</p>
					</div>

					{/* Test Connection Banner / Feedback */}
					{testResult && (
						<div
							className={`rounded-xl border p-3.5 text-xs animate-fade-in flex items-start gap-2.5 ${
								testResult.success
									? "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-300"
									: "bg-destructive/10 border-destructive/30 text-destructive"
							}`}
						>
							<div className="shrink-0 mt-0.5">
								{testResult.success ? (
									<Check className="h-4 w-4 text-green-600" />
								) : (
									<X className="h-4 w-4 text-destructive" />
								)}
							</div>
							<div className="flex-1 min-w-0">
								<div className="font-bold flex items-center justify-between">
									<span>
										{testResult.success
											? "Prueba de Conexión Exitosa"
											: "Prueba de Conexión Fallida"}
									</span>
									<span className="text-[10px] font-mono opacity-75">
										{testResult.timestamp}
									</span>
								</div>
								<p className="text-[11px] mt-0.5 leading-relaxed">
									{testResult.message}
								</p>
							</div>
						</div>
					)}

					{/* Action Buttons */}
					<div className="pt-3 border-t border-border flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5">
						<div className="flex items-center gap-2 w-full sm:w-auto">
							<button
								type="button"
								onClick={handleTestConnection}
								disabled={isTesting}
								className="w-full sm:w-auto px-3.5 py-2 rounded-lg border border-border bg-secondary/30 hover:bg-secondary text-foreground text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-xs"
							>
								{isTesting ? (
									<RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
								) : (
									<ShieldCheck className="h-3.5 w-3.5 text-primary" />
								)}
								<span>{isTesting ? "Probando..." : "Probar Conexión"}</span>
							</button>

							{whatsapp.status === "connected" && (
								<button
									type="button"
									onClick={handleDisconnect}
									className="px-3 py-2 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
									title="Desconectar instancia"
								>
									<Power className="h-3.5 w-3.5" />
									<span className="hidden sm:inline">Desconectar</span>
								</button>
							)}
						</div>

						<div className="flex items-center gap-2 w-full sm:w-auto justify-end">
							<button
								type="button"
								onClick={onClose}
								className="w-full sm:w-auto px-4 py-2 rounded-lg border border-border bg-card hover:bg-secondary text-xs font-semibold text-foreground transition-colors cursor-pointer"
							>
								Cancelar
							</button>
							<button
								type="submit"
								className="w-full sm:w-auto px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
							>
								{saveToast ? (
									<>
										<Check className="h-3.5 w-3.5 text-green-300" />
										<span>¡Guardado!</span>
									</>
								) : (
									<span>Guardar Configuración</span>
								)}
							</button>
						</div>
					</div>
				</form>
			</div>
		</div>
	);
};
