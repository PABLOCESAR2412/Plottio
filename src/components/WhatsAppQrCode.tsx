import {
	CheckCircle2,
	Power,
	RefreshCw,
	Settings,
	ShieldCheck,
	Smartphone,
	Wifi,
	WifiOff,
} from "lucide-react";
import QRCode from "qrcode";
import type React from "react";
import { useEffect, useState } from "react";

interface WhatsAppQrCodeProps {
	code?: string | null;
	status: "disconnected" | "connecting" | "connected";
	instanceName: string;
	serverUrl: string;
	onRefresh?: () => void;
	onDisconnect?: () => void;
	onConnect?: () => void;
	onRebindDevice?: () => void;
	onEditCredentials: () => void;
}

export const WhatsAppQrCode: React.FC<WhatsAppQrCodeProps> = ({
	code,
	status,
	instanceName,
	serverUrl,
	onRefresh,
	onDisconnect,
	onConnect,
	onRebindDevice,
	onEditCredentials,
}) => {
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [qrDataUrl, setQrDataUrl] = useState<string>("");

	useEffect(() => {
		let isMounted = true;
		const raw =
			code?.trim() ||
			`${serverUrl || "https://plottio.vercel.app/api/webhook/wha"}?instance=${encodeURIComponent(instanceName || "matriz")}`;

		if (raw.startsWith("data:image/")) {
			setQrDataUrl(raw);
		} else {
			QRCode.toDataURL(raw, {
				width: 256,
				margin: 2,
				color: {
					dark: "#0f172a",
					light: "#ffffff",
				},
				errorCorrectionLevel: "M",
			})
				.then((url) => {
					if (isMounted) setQrDataUrl(url);
				})
				.catch((err) => {
					console.error("Error generating QR code:", err);
				});
		}

		return () => {
			isMounted = false;
		};
	}, [code, instanceName, serverUrl]);

	const handleRefresh = () => {
		setIsRefreshing(true);
		if (onRefresh) onRefresh();
		setTimeout(() => {
			setIsRefreshing(false);
		}, 500);
	};

	const handleRebind = () => {
		if (onRebindDevice) {
			onRebindDevice();
		} else if (onDisconnect) {
			onDisconnect();
			if (onRefresh) onRefresh();
		}
	};

	const isConnected = status === "connected";
	const isConnecting = status === "connecting";

	return (
		<div className="space-y-6">
			{/* Estado y encabezado del QR */}
			<div className="flex flex-wrap items-center justify-between gap-3 bg-secondary/20 p-3.5 rounded-xl border border-border/60">
				<div className="flex items-center gap-2.5">
					<div
						className={`flex h-8 w-8 items-center justify-center rounded-lg ${
							isConnected
								? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
								: isConnecting
									? "bg-amber-500/15 text-amber-500"
									: "bg-muted text-muted-foreground"
						}`}
					>
						{isConnected ? (
							<Wifi className="h-4 w-4" />
						) : (
							<WifiOff className="h-4 w-4" />
						)}
					</div>
					<div>
						<div className="text-xs font-bold text-foreground flex items-center gap-2">
							<span>Dispositivo Móvil</span>
							{/* Badge de estado requerido */}
							<span
								data-testid="whatsapp-status-badge"
								className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1.5 ${
									isConnected
										? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
										: isConnecting
											? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
											: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
								}`}
							>
								<span
									className={`h-1.5 w-1.5 rounded-full ${
										isConnected
											? "bg-emerald-500 animate-pulse"
											: isConnecting
												? "bg-amber-500 animate-pulse"
												: "bg-amber-500"
									}`}
								/>
								{isConnected
									? "Sesión activa"
									: isConnecting
										? "Conectando..."
										: "Esperando escaneo"}
							</span>
						</div>
						<p className="text-[11px] text-muted-foreground">
							{isConnected
								? "Vinculado y listo para emitir mensajes"
								: "Escanea el código QR desde tu WhatsApp"}
						</p>
					</div>
				</div>

				{/* Botón Modificar Configuración / Editar Credenciales visible y accesible */}
				<button
					type="button"
					onClick={onEditCredentials}
					aria-label="Modificar Configuración / Editar Credenciales"
					className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-xs font-semibold text-foreground transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
				>
					<Settings className="h-3.5 w-3.5 text-primary" />
					<span>Modificar Configuración</span>
					<span className="text-[10px] text-muted-foreground hidden sm:inline">
						(Editar Credenciales)
					</span>
				</button>
			</div>

			{/* Contenedor Principal: QR a la izquierda, Guía a la derecha */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
				{/* Contenedor del Código QR */}
				<div className="flex flex-col items-center justify-center p-5 rounded-2xl border border-border bg-card shadow-sm relative overflow-hidden">
					{/* Esquinas visuales del visor escáner */}
					<div className="relative p-3 bg-white rounded-xl shadow-md border border-slate-200">
						{/* Enfoques estilizados de esquina */}
						<div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-emerald-500 rounded-tl-sm pointer-events-none" />
						<div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-emerald-500 rounded-tr-sm pointer-events-none" />
						<div className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-emerald-500 rounded-bl-sm pointer-events-none" />
						<div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-emerald-500 rounded-br-sm pointer-events-none" />

						{/* Componente visual del Código QR Oficial */}
						<div
							role="img"
							aria-label="Código QR de WhatsApp para vincular dispositivo"
							className={`w-44 h-44 sm:w-48 sm:h-48 relative flex items-center justify-center transition-opacity duration-300 ${
								isRefreshing ? "opacity-30 blur-[1px]" : "opacity-100"
							}`}
						>
							{qrDataUrl ? (
								<img
									src={qrDataUrl}
									alt="Código QR de WhatsApp para vincular dispositivo"
									aria-label="Código QR de WhatsApp para vincular dispositivo"
									className="w-full h-full object-contain rounded-lg"
								/>
							) : (
								<div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-400 gap-2">
									<RefreshCw className="h-6 w-6 animate-spin text-emerald-500" />
									<span className="text-[10px] font-medium">
										Generando QR...
									</span>
								</div>
							)}
						</div>

						{/* Overlay de estado Conectado */}
						{isConnected && (
							<div className="absolute inset-0 bg-emerald-950/85 backdrop-blur-xs rounded-xl flex flex-col items-center justify-center p-4 text-center animate-fade-in text-white">
								<div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2 border border-emerald-500/40">
									<CheckCircle2 className="h-7 w-7" />
								</div>
								<span className="font-bold text-sm text-white">
									Sesión Vinculada
								</span>
								<p className="text-[11px] text-emerald-200/90 mt-1 max-w-[180px]">
									WhatsApp está sincronizado activamente con este dispositivo.
								</p>
								<button
									type="button"
									onClick={handleRebind}
									aria-label="Vincular nuevo dispositivo / Re-escanear QR"
									className="mt-3 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
								>
									<Smartphone className="h-3.5 w-3.5" />
									<span>Vincular nuevo dispositivo / Re-escanear QR</span>
								</button>
							</div>
						)}
					</div>

					{/* Botones de acción del QR */}
					<div className="mt-4 flex flex-wrap items-center justify-center gap-2 w-full">
						<button
							type="button"
							onClick={handleRefresh}
							disabled={isRefreshing}
							aria-label="Actualizar QR / Refrescar Código"
							className="px-3 py-1.5 rounded-lg border border-border bg-secondary/40 hover:bg-secondary text-xs font-semibold text-foreground transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
						>
							<RefreshCw
								className={`h-3.5 w-3.5 ${
									isRefreshing ? "animate-spin text-primary" : "text-primary"
								}`}
							/>
							<span>Actualizar QR / Refrescar Código</span>
						</button>

						{isConnected ? (
							<>
								<button
									type="button"
									onClick={handleRebind}
									aria-label="Vincular nuevo dispositivo / Re-escanear QR"
									className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
								>
									<Smartphone className="h-3.5 w-3.5" />
									<span>Vincular nuevo dispositivo / Re-escanear QR</span>
								</button>
								<button
									type="button"
									onClick={onDisconnect}
									aria-label="Desconectar Sesión"
									className="px-3 py-1.5 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
								>
									<Power className="h-3.5 w-3.5" />
									<span>Desconectar Sesión</span>
								</button>
							</>
						) : (
							onConnect && (
								<button
									type="button"
									onClick={onConnect}
									aria-label="Vincular Dispositivo"
									className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
								>
									<CheckCircle2 className="h-3.5 w-3.5" />
									<span>Vincular Dispositivo</span>
								</button>
							)
						)}
					</div>
				</div>

				{/* Guía paso a paso para el operario y detalles no sensibles */}
				<div className="space-y-4">
					{/* Instrucciones de escaneo requeridas */}
					<div className="rounded-xl border border-border bg-card p-4 space-y-3">
						<h4 className="text-xs font-bold text-foreground flex items-center gap-2">
							<Smartphone className="h-4 w-4 text-primary" />
							<span>Pasos para vincular tu WhatsApp:</span>
						</h4>
						<ol className="space-y-2.5 text-xs text-muted-foreground list-none">
							<li className="flex items-start gap-2.5">
								<span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[11px]">
									1
								</span>
								<span className="text-foreground/90">
									Abre WhatsApp en tu teléfono móvil.
								</span>
							</li>
							<li className="flex items-start gap-2.5">
								<span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[11px]">
									2
								</span>
								<span className="text-foreground/90">
									Ve a Ajustes / Menú → Dispositivos vinculados.
								</span>
							</li>
							<li className="flex items-start gap-2.5">
								<span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[11px]">
									3
								</span>
								<span className="text-foreground/90">
									Toca en &quot;Vincular un dispositivo&quot;.
								</span>
							</li>
							<li className="flex items-start gap-2.5">
								<span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[11px]">
									4
								</span>
								<span className="text-foreground/90">
									Escanea el código QR que aparece en pantalla.
								</span>
							</li>
						</ol>
					</div>

					{/* Detalles no sensibles requeridos */}
					<div className="rounded-xl border border-border/70 bg-secondary/15 p-3.5 space-y-2 text-xs">
						<div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
							<ShieldCheck className="h-4 w-4 text-emerald-600" />
							<span>Detalles de Pasarela Conectada:</span>
						</div>
						<div className="space-y-1.5 text-[11px]">
							<div className="flex items-center justify-between text-muted-foreground">
								<span>Nombre de la Instancia:</span>
								<span className="font-mono font-semibold text-foreground">
									{instanceName || "plottio-central"}
								</span>
							</div>
							<div className="flex items-center justify-between text-muted-foreground gap-2">
								<span className="shrink-0">URL del Servidor Worker:</span>
								<span
									className="font-mono text-[10px] text-muted-foreground truncate max-w-[190px]"
									title={serverUrl}
								>
									{serverUrl ||
										"https://acadia.simcodec.workers.dev/api/webhook/wha"}
								</span>
							</div>
							<div className="flex items-center justify-between text-muted-foreground">
								<span>Credenciales & API Key:</span>
								<span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
									Ocultas y Cifradas
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
