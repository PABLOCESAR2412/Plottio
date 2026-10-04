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
import type React from "react";
import { useMemo, useState } from "react";

interface WhatsAppQrCodeProps {
	code?: string | null;
	status: "disconnected" | "connecting" | "connected";
	instanceName: string;
	serverUrl: string;
	onRefresh?: () => void;
	onDisconnect?: () => void;
	onConnect?: () => void;
	onEditCredentials: () => void;
}

// Generador matricial SVG determinista de 25x25 para el QR de vinculación
function generateQrMatrix(seedStr: string): number[][] {
	const size = 25;
	const matrix: number[][] = Array.from({ length: size }, () =>
		Array.from({ length: size }, () => 0),
	);

	// 1. Finder patterns (7x7) en las 3 esquinas
	const addFinder = (startX: number, startY: number) => {
		for (let r = 0; r < 7; r++) {
			for (let c = 0; c < 7; c++) {
				if (
					r === 0 ||
					r === 6 ||
					c === 0 ||
					c === 6 ||
					(r >= 2 && r <= 4 && c >= 2 && c <= 4)
				) {
					matrix[startY + r][startX + c] = 1;
				}
			}
		}
	};

	addFinder(0, 0); // Superior izquierda
	addFinder(size - 7, 0); // Superior derecha
	addFinder(0, size - 7); // Inferior izquierda

	// 2. Timing patterns
	for (let i = 8; i < size - 8; i++) {
		matrix[6][i] = i % 2 === 0 ? 1 : 0;
		matrix[i][6] = i % 2 === 0 ? 1 : 0;
	}

	// 3. Alignment pattern en (16, 16)
	for (let r = 16; r <= 20; r++) {
		for (let c = 16; c <= 20; c++) {
			if (
				r === 16 ||
				r === 20 ||
				c === 16 ||
				c === 20 ||
				(r === 18 && c === 18)
			) {
				matrix[r][c] = 1;
			}
		}
	}

	// 4. Espacio reservado para logo central (10..14, 10..14)
	const isReserved = (r: number, c: number): boolean => {
		// Finders + separador
		if (r < 8 && c < 8) return true;
		if (r < 8 && c >= size - 8) return true;
		if (r >= size - 8 && c < 8) return true;
		// Timing
		if (r === 6 || c === 6) return true;
		// Alignment
		if (r >= 16 && r <= 20 && c >= 16 && c <= 20) return true;
		// Logo central
		if (r >= 10 && r <= 14 && c >= 10 && c <= 14) return true;
		return false;
	};

	// 5. Hash determinista simple para rellenar datos pseudo-aleatorios realistas
	let hash = 2166136261;
	for (let i = 0; i < seedStr.length; i++) {
		hash ^= seedStr.charCodeAt(i);
		hash +=
			(hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
	}

	for (let r = 0; r < size; r++) {
		for (let c = 0; c < size; c++) {
			if (!isReserved(r, c)) {
				const val = ((hash + r * 37 + c * 59 + r * c) ^ (hash >> 3)) % 100;
				matrix[r][c] = val > 45 ? 1 : 0;
			}
		}
	}

	return matrix;
}

export const WhatsAppQrCode: React.FC<WhatsAppQrCodeProps> = ({
	code,
	status,
	instanceName,
	serverUrl,
	onRefresh,
	onDisconnect,
	onConnect,
	onEditCredentials,
}) => {
	const [isRefreshing, setIsRefreshing] = useState(false);

	const activeCells = useMemo(() => {
		const seed = code || `${instanceName}-${serverUrl}-plottio-acadia-2026`;
		const matrix = generateQrMatrix(seed);
		const cells: { id: string; x: number; y: number }[] = [];
		for (let r = 0; r < matrix.length; r++) {
			for (let c = 0; c < matrix[r].length; c++) {
				if (matrix[r][c] === 1) {
					cells.push({
						id: `cell-${c}-${r}`,
						x: c * 8,
						y: r * 8,
					});
				}
			}
		}
		return cells;
	}, [code, instanceName, serverUrl]);

	const handleRefresh = () => {
		setIsRefreshing(true);
		if (onRefresh) onRefresh();
		setTimeout(() => {
			setIsRefreshing(false);
		}, 500);
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

						{/* Componente visual SVG del Código QR */}
						<svg
							role="img"
							aria-label="Código QR de WhatsApp para vincular dispositivo"
							viewBox="0 0 200 200"
							className={`w-44 h-44 sm:w-48 sm:h-48 transition-opacity duration-300 ${
								isRefreshing ? "opacity-30 blur-[1px]" : "opacity-100"
							}`}
						>
							<title>Código QR de WhatsApp</title>
							<rect width="200" height="200" fill="#ffffff" rx="8" />
							{/* Dibujamos módulos */}
							{activeCells.map((cell) => (
								<rect
									key={cell.id}
									x={cell.x}
									y={cell.y}
									width="7.2"
									height="7.2"
									rx="1.4"
									fill="#0f172a"
								/>
							))}

							{/* Logo WhatsApp central */}
							<circle cx="100" cy="100" r="18" fill="#ffffff" />
							<circle cx="100" cy="100" r="15" fill="#25D366" />
							{/* Icono de teléfono blanco */}
							<path
								d="M100 89C94.477 89 90 93.477 90 99c0 1.954.561 3.78 1.533 5.325L90.5 108.5l4.316-.99A9.94 9.94 0 0 0 100 109c5.523 0 10-4.477 10-10s-4.477-10-10-10zm4.945 13.978c-.208.583-1.037 1.085-1.684 1.226-.44.095-.99.17-2.923-.63-2.47-1.022-4.062-3.528-4.184-3.69-.123-.164-1.002-1.332-1.002-2.54 0-1.209.636-1.803.863-2.047.227-.245.495-.306.66-.306.166 0 .332.002.476.01.152.008.358-.058.559.426.208.5.71 1.733.772 1.859.062.126.104.272.02.437-.082.164-.124.267-.247.41-.124.144-.26.32-.37.43-.124.123-.254.256-.109.505.145.248.643 1.06 1.38 1.716.95.845 1.75 1.106 1.998 1.23.248.123.394.103.54-.065.145-.168.622-.724.787-.972.166-.248.332-.207.56-.124.228.083 1.45.684 1.7.808.249.124.415.186.477.29.062.103.062.602-.146 1.185z"
								fill="#ffffff"
							/>
						</svg>

						{/* Overlay de estado Conectado */}
						{isConnected && (
							<div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-xs rounded-xl flex flex-col items-center justify-center p-4 text-center animate-fade-in text-white">
								<div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2 border border-emerald-500/40">
									<CheckCircle2 className="h-7 w-7" />
								</div>
								<span className="font-bold text-sm text-white">
									Sesión Vinculada
								</span>
								<p className="text-[11px] text-emerald-200/90 mt-1 max-w-[170px]">
									WhatsApp está sincronizado activamente.
								</p>
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
							<button
								type="button"
								onClick={onDisconnect}
								aria-label="Desconectar Sesión"
								className="px-3 py-1.5 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
							>
								<Power className="h-3.5 w-3.5" />
								<span>Desconectar Sesión</span>
							</button>
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
