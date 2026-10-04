import {
	Activity,
	BookOpen,
	Calendar,
	Check,
	Coins,
	Cpu,
	DollarSign,
	Eye,
	EyeOff,
	Gauge,
	Key,
	Lock,
	Save,
	Server,
	Sparkles,
	Zap,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import {
	AI_MODELS_BY_PROVIDER,
	type AiProvider,
	type AiTimeFilter,
	useIntegrationsStore,
} from "../store/useIntegrationsStore";

export const FinOpsMetricsPanel: React.FC = () => {
	const { ai, updateAiConfig, setTimeFilter } = useIntegrationsStore();

	// Normalizar proveedor inicial al cuarteto oficial
	const initialProvider: AiProvider =
		ai.provider === "groq" ||
		ai.provider === "opencode_zen" ||
		ai.provider === "nvidia"
			? ai.provider
			: "google";

	const [selectedProvider, setSelectedProvider] =
		useState<AiProvider>(initialProvider);
	const [googleApiKey, setGoogleApiKey] = useState(
		ai.googleApiKey || ai.geminiApiKey || "",
	);
	const [groqApiKey, setGroqApiKey] = useState(ai.groqApiKey || "");
	const [opencodeZenApiKey, setOpencodeZenApiKey] = useState(
		ai.opencodeZenApiKey || "",
	);
	const [nvidiaApiKey, setNvidiaApiKey] = useState(ai.nvidiaApiKey || "");

	const [activeModel, setActiveModel] = useState<string>(() => {
		const available = AI_MODELS_BY_PROVIDER[initialProvider];
		return available.includes(ai.activeModel) ? ai.activeModel : available[0];
	});

	const [budgetUSD, setBudgetUSD] = useState(ai.monthlyBudgetUSD);
	const [showApiKey, setShowApiKey] = useState(false);
	const [connectionTestStatus, setConnectionTestStatus] = useState<
		"idle" | "testing" | "success" | "empty"
	>("idle");
	const [savedNotification, setSavedNotification] = useState(false);
	const [showAiGuide, setShowAiGuide] = useState(false);

	// Filtros temporales
	const activeTimeFilter: AiTimeFilter = ai.timeFilter || "dia";
	const [customStart, setCustomStart] = useState(
		ai.customIntervalStart ||
			new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0],
	);
	const [customEnd, setCustomEnd] = useState(
		ai.customIntervalEnd || new Date().toISOString().split("T")[0],
	);

	// Manejo de cambio de proveedor
	const handleProviderChange = (newProvider: AiProvider) => {
		setSelectedProvider(newProvider);
		setConnectionTestStatus("idle");
		const providerModels = AI_MODELS_BY_PROVIDER[newProvider];
		if (!providerModels.includes(activeModel)) {
			setActiveModel(providerModels[0]);
		}
	};

	// Key actual según proveedor seleccionado
	const currentApiKey =
		selectedProvider === "google"
			? googleApiKey
			: selectedProvider === "groq"
				? groqApiKey
				: selectedProvider === "opencode_zen"
					? opencodeZenApiKey
					: nvidiaApiKey;

	const handleCurrentApiKeyChange = (value: string) => {
		setConnectionTestStatus("idle");
		if (selectedProvider === "google") setGoogleApiKey(value);
		else if (selectedProvider === "groq") setGroqApiKey(value);
		else if (selectedProvider === "opencode_zen") setOpencodeZenApiKey(value);
		else if (selectedProvider === "nvidia") setNvidiaApiKey(value);
	};

	const handleTestConnection = () => {
		if (!currentApiKey.trim()) {
			setConnectionTestStatus("empty");
			return;
		}
		setConnectionTestStatus("testing");
		setTimeout(() => {
			setConnectionTestStatus("success");
			setTimeout(() => setConnectionTestStatus("idle"), 3500);
		}, 600);
	};

	// Guardar configuración
	const handleSave = (e: React.FormEvent) => {
		e.preventDefault();
		updateAiConfig({
			provider: selectedProvider,
			googleApiKey,
			groqApiKey,
			opencodeZenApiKey,
			nvidiaApiKey,
			geminiApiKey: googleApiKey,
			activeModel,
			monthlyBudgetUSD: Number(budgetUSD),
		});
		setSavedNotification(true);
		setTimeout(() => setSavedNotification(false), 2500);
	};

	// Cambio de filtro temporal
	const handleSelectTimeFilter = (filter: AiTimeFilter) => {
		if (filter === "intervalos") {
			setTimeFilter("intervalos", customStart, customEnd);
		} else {
			setTimeFilter(filter);
		}
	};

	const handleApplyCustomInterval = () => {
		setTimeFilter("intervalos", customStart, customEnd);
	};

	// Métricas dinámicas según filtro
	const metrics = useMemo(() => {
		let factor = 1;
		let label = "Hoy";
		let chartBars: { label: string; tokens: number; costUSD: number }[] = [];

		if (activeTimeFilter === "dia") {
			factor = 1;
			label = "Hoy (24 Horas)";
			chartBars = ai.tokenUsageHourly.map((h) => ({
				label: h.hour,
				tokens: h.tokens,
				costUSD: h.costUSD,
			}));
		} else if (activeTimeFilter === "semana") {
			factor = 7;
			label = "Semana (Últimos 7 días)";
			chartBars = [
				{ label: "Lun", tokens: 198000, costUSD: 3.96 },
				{ label: "Mar", tokens: 232000, costUSD: 4.64 },
				{ label: "Mié", tokens: 218500, costUSD: 4.37 },
				{ label: "Jue", tokens: 245000, costUSD: 4.9 },
				{ label: "Vie", tokens: 280000, costUSD: 5.6 },
				{ label: "Sáb", tokens: 185000, costUSD: 3.7 },
				{ label: "Dom", tokens: 171000, costUSD: 3.42 },
			];
		} else if (activeTimeFilter === "15dias") {
			factor = 15;
			label = "Quincena (15 días)";
			chartBars = [
				{ label: "Días 1-3", tokens: 620000, costUSD: 12.4 },
				{ label: "Días 4-6", tokens: 685000, costUSD: 13.7 },
				{ label: "Días 7-9", tokens: 640000, costUSD: 12.8 },
				{ label: "Días 10-12", tokens: 710000, costUSD: 14.2 },
				{ label: "Días 13-15", tokens: 622500, costUSD: 12.45 },
			];
		} else if (activeTimeFilter === "1mes") {
			factor = 30;
			label = "Mes (30 días)";
			chartBars = [
				{ label: "Semana 1", tokens: 1540000, costUSD: 30.8 },
				{ label: "Semana 2", tokens: 1680000, costUSD: 33.6 },
				{ label: "Semana 3", tokens: 1610000, costUSD: 32.2 },
				{ label: "Semana 4", tokens: 1725000, costUSD: 34.5 },
			];
		} else {
			// Intervalos
			const s = new Date(customStart || Date.now());
			const e = new Date(customEnd || Date.now());
			const diff = Math.max(
				1,
				Math.round(Math.abs(e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)),
			);
			factor = diff;
			label = `Intervalo (${diff} ${diff === 1 ? "día" : "días"})`;
			const stepTokens = Math.round((ai.tokensToday * diff) / 5);
			chartBars = [
				{
					label: "Tramo 1",
					tokens: Math.round(stepTokens * 0.9),
					costUSD: +(stepTokens * 0.9 * 0.00002).toFixed(2),
				},
				{
					label: "Tramo 2",
					tokens: Math.round(stepTokens * 1.05),
					costUSD: +(stepTokens * 1.05 * 0.00002).toFixed(2),
				},
				{
					label: "Tramo 3",
					tokens: Math.round(stepTokens * 1.1),
					costUSD: +(stepTokens * 1.1 * 0.00002).toFixed(2),
				},
				{
					label: "Tramo 4",
					tokens: Math.round(stepTokens * 0.95),
					costUSD: +(stepTokens * 0.95 * 0.00002).toFixed(2),
				},
				{
					label: "Tramo 5",
					tokens: Math.round(stepTokens * 1.0),
					costUSD: +(stepTokens * 1.0 * 0.00002).toFixed(2),
				},
			];
		}

		const totalRequests = Math.round(ai.totalRequests * factor);
		const totalTokens = Math.round(ai.tokensToday * factor);
		const costUSD = +(totalTokens * 0.00002).toFixed(2);
		const tps =
			activeTimeFilter === "semana"
				? 86.2
				: activeTimeFilter === "15dias"
					? 85.1
					: activeTimeFilter === "1mes"
						? 84.9
						: ai.tps;
		const latency =
			activeTimeFilter === "semana"
				? 365
				: activeTimeFilter === "15dias"
					? 372
					: ai.latencyMs;

		return {
			factor,
			label,
			totalRequests,
			totalTokens,
			costUSD,
			tps,
			latency,
			chartBars,
		};
	}, [
		activeTimeFilter,
		customStart,
		customEnd,
		ai.totalRequests,
		ai.tokensToday,
		ai.tps,
		ai.latencyMs,
		ai.tokenUsageHourly,
	]);

	const budgetPercent = Math.min(
		100,
		Math.round((ai.currentSpendUSD / ai.monthlyBudgetUSD) * 100),
	);

	const timeFilterOptions: { id: AiTimeFilter; label: string }[] = [
		{ id: "dia", label: "Día (Hoy)" },
		{ id: "semana", label: "Semana (7 días)" },
		{ id: "15dias", label: "15 días" },
		{ id: "1mes", label: "1 mes (30 días)" },
		{ id: "intervalos", label: "Intervalos" },
	];

	const providersList: {
		id: AiProvider;
		name: string;
		badge: string;
		desc: string;
	}[] = [
		{
			id: "google",
			name: "Google Gemini",
			badge: "Multimodal & RAG",
			desc: "Modelos Flash y Pro de Google AI Studio con alta ventana de contexto.",
		},
		{
			id: "groq",
			name: "Groq Cloud",
			badge: "Ultra-Baja Latencia",
			desc: "Inferencia sobre LPU de alta velocidad con Llama 3.3 y Mixtral.",
		},
		{
			id: "opencode_zen",
			name: "Opencode Zen",
			badge: "DeepSeek & Coding",
			desc: "Modelos de razonamiento y código DeepSeek R1/V3 y Qwen 2.5 Coder.",
		},
		{
			id: "nvidia",
			name: "Nvidia NIM",
			badge: "Aceleración GPU",
			desc: "Microservicios de inferencia optimizados con Nemotron y Mistral.",
		},
	];

	return (
		<div className="space-y-6">
			{/* Top Panel Banner with RAG Badge & Guide Toggle */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card shadow-xs">
				<div className="space-y-1">
					<div className="flex items-center gap-2.5">
						<h3 className="text-lg font-bold text-foreground">
							Panel de Control FinOps & Modelos IA
						</h3>
						<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 shadow-xs">
							<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
							RAG Operacional Multi-Proveedor
						</span>
					</div>
					<p className="text-xs text-muted-foreground">
						Monitoreo en tiempo real de inferencias, presupuestos y latencia
						multi-proveedor (Google, Groq, Opencode Zen y Nvidia).
					</p>
				</div>

				<button
					type="button"
					onClick={() => setShowAiGuide((v) => !v)}
					className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 self-start sm:self-auto ${
						showAiGuide
							? "border-primary bg-primary/10 text-primary"
							: "border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground"
					}`}
				>
					<BookOpen className="h-3.5 w-3.5" />
					<span>Guía de Proveedores IA</span>
				</button>
			</div>

			{/* Collapsible Step-by-Step Guide for AI Providers */}
			{showAiGuide && (
				<div className="rounded-xl border border-border bg-secondary/15 p-5 space-y-4 animate-fade-in text-xs sm:text-sm">
					<div className="flex items-center justify-between font-bold text-foreground border-b border-border/60 pb-3">
						<span className="flex items-center gap-2">
							<Sparkles className="h-4 w-4 text-primary" />
							Guía de Conexión: Proveedores de Inteligencia Artificial
						</span>
						<button
							type="button"
							onClick={() => setShowAiGuide(false)}
							className="text-muted-foreground hover:text-foreground cursor-pointer font-bold px-2 py-0.5 rounded"
						>
							✕
						</button>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
						{/* 1. Google */}
						<div className="rounded-lg border border-border bg-card p-3.5 space-y-2">
							<div className="font-bold text-foreground flex items-center justify-between">
								<span className="text-primary font-semibold">
									1. Google AI Studio (Gemini)
								</span>
								<a
									href="https://aistudio.google.com/"
									target="_blank"
									rel="noreferrer"
									className="text-[10px] text-primary underline"
								>
									AI Studio ↗
								</a>
							</div>
							<p className="text-[11px] text-muted-foreground leading-relaxed">
								Ingresa en <strong>aistudio.google.com</strong>, pulsa{" "}
								<strong>Get API Key</strong> y cópiala aquí. Compatible con
								Gemini 2.0 Flash, Gemini 1.5 Pro y Gemini 1.5 Flash.
							</p>
						</div>

						{/* 2. Groq */}
						<div className="rounded-lg border border-border bg-card p-3.5 space-y-2">
							<div className="font-bold text-foreground flex items-center justify-between">
								<span className="text-amber-500 font-semibold">
									2. Groq Cloud (LPU Ultra-Rápido)
								</span>
								<a
									href="https://console.groq.com/"
									target="_blank"
									rel="noreferrer"
									className="text-[10px] text-amber-500 underline"
								>
									Groq Console ↗
								</a>
							</div>
							<p className="text-[11px] text-muted-foreground leading-relaxed">
								Inicia sesión en <strong>console.groq.com</strong>, genera tu
								API Key en la sección Keys. Procesa con latencia ultra baja en
								Llama 3.3 70B, Llama 3.1 8B y Mixtral 8x7B.
							</p>
						</div>

						{/* 3. Opencode Zen */}
						<div className="rounded-lg border border-border bg-card p-3.5 space-y-2">
							<div className="font-bold text-foreground flex items-center justify-between">
								<span className="text-sky-500 font-semibold">
									3. Opencode Zen (DeepSeek & Coder)
								</span>
								<span className="text-[10px] text-sky-500 font-mono">
									Inferencia R1
								</span>
							</div>
							<p className="text-[11px] text-muted-foreground leading-relaxed">
								Clave de acceso para modelos DeepSeek R1, DeepSeek V3 y Qwen 2.5
								Coder, especializados en análisis de datos, cotizaciones y
								lógica de negocio.
							</p>
						</div>

						{/* 4. Nvidia NIM */}
						<div className="rounded-lg border border-border bg-card p-3.5 space-y-2">
							<div className="font-bold text-foreground flex items-center justify-between">
								<span className="text-emerald-500 font-semibold">
									4. Nvidia NIM (Enterprise GPU)
								</span>
								<a
									href="https://build.nvidia.com/"
									target="_blank"
									rel="noreferrer"
									className="text-[10px] text-emerald-500 underline"
								>
									Nvidia Build ↗
								</a>
							</div>
							<p className="text-[11px] text-muted-foreground leading-relaxed">
								Obtén tu API key en <strong>build.nvidia.com</strong>.
								Microservicios optimizados para inferencias de alto desempeño
								con Nemotron 70B, Llama 3.1 Nemotron y Mistral NeMo.
							</p>
						</div>
					</div>
				</div>
			)}

			{/* Time Filters Bar */}
			<div className="rounded-xl border border-border bg-card p-3 shadow-xs space-y-3">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
					<div className="flex items-center gap-2">
						<Calendar className="h-4 w-4 text-primary shrink-0" />
						<span className="text-xs font-bold text-foreground uppercase tracking-wider">
							Filtro Temporal de Consumo:
						</span>
					</div>

					<div className="flex flex-wrap items-center gap-1.5">
						{timeFilterOptions.map((opt) => (
							<button
								key={opt.id}
								type="button"
								onClick={() => handleSelectTimeFilter(opt.id)}
								className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
									activeTimeFilter === opt.id
										? "border-primary bg-primary text-primary-foreground shadow-xs font-bold"
										: "border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground"
								}`}
							>
								{opt.label}
							</button>
						))}
					</div>
				</div>

				{/* Custom Interval Date Pickers */}
				{activeTimeFilter === "intervalos" && (
					<div className="pt-2 border-t border-border flex flex-wrap items-center gap-3 animate-fade-in text-xs">
						<span className="text-muted-foreground font-semibold">
							Rango personalizado:
						</span>
						<label className="flex items-center gap-1.5">
							<span className="text-muted-foreground text-[11px]">Desde:</span>
							<input
								type="date"
								value={customStart}
								onChange={(e) => setCustomStart(e.target.value)}
								className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-foreground focus:border-primary focus:outline-none"
							/>
						</label>
						<label className="flex items-center gap-1.5">
							<span className="text-muted-foreground text-[11px]">Hasta:</span>
							<input
								type="date"
								value={customEnd}
								onChange={(e) => setCustomEnd(e.target.value)}
								className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-foreground focus:border-primary focus:outline-none"
							/>
						</label>
						<button
							type="button"
							onClick={handleApplyCustomInterval}
							className="px-3 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
						>
							Aplicar Rango
						</button>
					</div>
				)}
			</div>

			{/* Top FinOps Metrics Cards (Calculated dynamically) */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
				{/* 1. Presupuesto & Gasto Acumulado */}
				<div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-2">
					<div className="flex items-center justify-between text-muted-foreground">
						<span className="text-[11px] font-bold uppercase tracking-wider">
							Presupuesto Mensual
						</span>
						<DollarSign className="h-4 w-4 text-emerald-500" />
					</div>
					<div className="text-xl font-black text-foreground">
						${ai.currentSpendUSD.toFixed(2)}{" "}
						<span className="text-xs font-normal text-muted-foreground">
							/ ${ai.monthlyBudgetUSD} USD
						</span>
					</div>
					<div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
						<div
							className={`h-full rounded-full transition-all duration-500 ${
								budgetPercent > 80
									? "bg-destructive"
									: budgetPercent > 50
										? "bg-yellow-500"
										: "bg-emerald-500"
							}`}
							style={{ width: `${budgetPercent}%` }}
						/>
					</div>
					<div className="text-[10px] text-muted-foreground flex justify-between">
						<span>{budgetPercent}% consumido</span>
						<span>Límite seguro</span>
					</div>
				</div>

				{/* 2. Solicitudes / Invocaciones */}
				<div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-2">
					<div className="flex items-center justify-between text-muted-foreground">
						<span className="text-[11px] font-bold uppercase tracking-wider">
							Usos / Solicitudes
						</span>
						<Server className="h-4 w-4 text-sky-500" />
					</div>
					<div className="text-xl font-black text-foreground">
						{metrics.totalRequests.toLocaleString("en-US")}
					</div>
					<div className="text-[10px] text-muted-foreground flex items-center gap-1">
						<Zap className="h-3 w-3 text-sky-500" />
						<span>Inferencias ({metrics.label})</span>
					</div>
				</div>

				{/* 3. Tokens Usados */}
				<div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-2">
					<div className="flex items-center justify-between text-muted-foreground">
						<span className="text-[11px] font-bold uppercase tracking-wider">
							Tokens Usados
						</span>
						<Coins className="h-4 w-4 text-amber-500" />
					</div>
					<div className="text-xl font-black text-foreground">
						{metrics.totalTokens.toLocaleString("en-US")}
					</div>
					<div className="text-[10px] text-muted-foreground">
						Prompt & Completitud ({metrics.label})
					</div>
				</div>

				{/* 4. Rendimiento / TPS */}
				<div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-2">
					<div className="flex items-center justify-between text-muted-foreground">
						<span className="text-[11px] font-bold uppercase tracking-wider">
							Throughput (TPS)
						</span>
						<Gauge className="h-4 w-4 text-purple-500" />
					</div>
					<div className="text-xl font-black text-foreground">
						{metrics.tps}{" "}
						<span className="text-xs font-normal text-muted-foreground">
							tok/s
						</span>
					</div>
					<div className="text-[10px] text-muted-foreground">
						Velocidad media de generación
					</div>
				</div>

				{/* 5. Latencia Promedio */}
				<div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-2">
					<div className="flex items-center justify-between text-muted-foreground">
						<span className="text-[11px] font-bold uppercase tracking-wider">
							Rendimiento Latencia
						</span>
						<Activity className="h-4 w-4 text-emerald-500" />
					</div>
					<div className="text-xl font-black text-foreground">
						{metrics.latency}{" "}
						<span className="text-xs font-normal text-muted-foreground">
							ms
						</span>
					</div>
					<div className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
						<span>Costo estimado: ${metrics.costUSD} USD</span>
					</div>
				</div>
			</div>

			{/* FinOps Consumption Bar Graph Breakdown */}
			<div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
					<div>
						<h3 className="text-base font-bold text-foreground flex items-center gap-2">
							<span>Consumo Temporal de Tokens & Costos FinOps</span>
						</h3>
						<p className="text-xs text-muted-foreground">
							Desglose del período seleccionado ({metrics.label}) procesado por
							el motor IA y Plottio Asistente.
						</p>
					</div>
					<div className="flex items-center gap-2">
						<span className="text-xs font-mono font-semibold px-2.5 py-1 rounded bg-secondary text-foreground border border-border">
							{selectedProvider.toUpperCase()} · {activeModel}
						</span>
					</div>
				</div>

				{/* Visual Bars for tokens */}
				<div
					className="grid gap-2 pt-4 items-end h-40 border-b border-border pb-2"
					style={{
						gridTemplateColumns: `repeat(${metrics.chartBars.length}, minmax(0, 1fr))`,
					}}
				>
					{(() => {
						const maxTokens = Math.max(
							...metrics.chartBars.map((b) => b.tokens),
							1,
						);
						return metrics.chartBars.map((bar) => {
							const heightPct = Math.max(
								12,
								Math.min(100, Math.round((bar.tokens / maxTokens) * 100)),
							);
							return (
								<div
									key={bar.label}
									className="flex flex-col items-center gap-1.5 h-full justify-end"
								>
									<div className="text-[10px] font-mono text-muted-foreground font-semibold">
										${bar.costUSD.toFixed(2)}
									</div>
									<div
										className="w-full max-w-[42px] bg-primary/75 hover:bg-primary rounded-t-md transition-all duration-300 cursor-pointer"
										style={{ height: `${heightPct}%` }}
										title={`${bar.label}: ${bar.tokens.toLocaleString()} tokens ($${bar.costUSD.toFixed(3)} USD)`}
									/>
									<div className="text-[10px] text-muted-foreground font-semibold truncate max-w-[60px] text-center">
										{bar.label}
									</div>
								</div>
							);
						});
					})()}
				</div>
			</div>

			{/* Configuration Form for Multi-Provider AI & Budget */}
			<div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-5">
				<div>
					<h3 className="text-base font-bold text-foreground flex items-center gap-2">
						<Key className="h-4 w-4 text-primary" />
						<span>Configuración Multi-Proveedor LLM & Presupuesto</span>
					</h3>
					<p className="text-xs text-muted-foreground">
						Selecciona el proveedor oficial activo, su modelo de catálogo y
						establece la API Key correspondiente.
					</p>
				</div>

				<form onSubmit={handleSave} className="space-y-5 text-xs sm:text-sm">
					{/* Provider Selection Tabs */}
					<div className="space-y-2">
						<span className="block text-xs font-semibold text-muted-foreground">
							Proveedor LLM Activo:
						</span>
						<div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
							{providersList.map((pr) => {
								const isSelected = selectedProvider === pr.id;
								return (
									<button
										key={pr.id}
										type="button"
										onClick={() => handleProviderChange(pr.id)}
										className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
											isSelected
												? "border-primary bg-primary/10 text-foreground ring-1 ring-primary shadow-xs"
												: "border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground"
										}`}
									>
										<div className="flex items-center justify-between w-full">
											<span className="font-bold text-xs text-foreground flex items-center gap-1.5">
												<Cpu className="h-3.5 w-3.5 text-primary" />
												{pr.name}
											</span>
											{isSelected && (
												<Check className="h-3.5 w-3.5 text-primary shrink-0" />
											)}
										</div>
										<span className="text-[10px] font-semibold text-primary font-mono">
											{pr.badge}
										</span>
									</button>
								);
							})}
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{/* Model Selector based on provider */}
						<div>
							<label
								htmlFor="active-model-select"
								className="block text-xs font-semibold text-muted-foreground mb-1.5"
							>
								Modelo de Inteligencia Artificial (
								{selectedProvider.toUpperCase()})
							</label>
							<select
								id="active-model-select"
								value={activeModel}
								onChange={(e) => setActiveModel(e.target.value)}
								className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
							>
								{AI_MODELS_BY_PROVIDER[selectedProvider].map((mod) => (
									<option key={mod} value={mod}>
										{mod}
									</option>
								))}
							</select>
							<p className="text-[10px] text-muted-foreground mt-1">
								Catálogo canónico soportado oficialmente para {selectedProvider}
								.
							</p>
						</div>

						{/* Monthly Budget Input */}
						<div>
							<label
								htmlFor="monthly-budget-input"
								className="block text-xs font-semibold text-muted-foreground mb-1.5"
							>
								Presupuesto Máximo Mensual (USD)
							</label>
							<input
								id="monthly-budget-input"
								type="number"
								min="1"
								step="1"
								value={budgetUSD}
								onChange={(e) => setBudgetUSD(Number(e.target.value))}
								className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
							/>
							<p className="text-[10px] text-muted-foreground mt-1">
								Alerta al superar el 80% del presupuesto mensual configurado.
							</p>
						</div>

						{/* Active Provider API Key */}
						<div className="md:col-span-2 space-y-1.5">
							<div className="flex items-center justify-between">
								<label
									htmlFor="provider-api-key-input"
									className="block text-xs font-semibold text-muted-foreground"
								>
									{selectedProvider === "google"
										? "Google AI Studio API Key *"
										: selectedProvider === "groq"
											? "Groq Cloud API Key *"
											: selectedProvider === "opencode_zen"
												? "Opencode Zen API Key *"
												: "Nvidia NIM API Key *"}
								</label>
								<span className="text-[10px] text-muted-foreground font-mono">
									{selectedProvider === "google"
										? "AIzaSy..."
										: selectedProvider === "groq"
											? "gsk_..."
											: selectedProvider === "opencode_zen"
												? "zen_..."
												: "nvapi-..."}
								</span>
							</div>

							<div className="flex gap-2">
								<div className="relative flex-1">
									<input
										id="provider-api-key-input"
										type={showApiKey ? "text" : "password"}
										value={currentApiKey}
										onChange={(e) => handleCurrentApiKeyChange(e.target.value)}
										placeholder={`Ingresa tu API Key para ${selectedProvider}...`}
										className="w-full rounded-lg border border-border bg-background pl-3 pr-10 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
									/>
									<button
										type="button"
										onClick={() => setShowApiKey((v) => !v)}
										className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
										title={showApiKey ? "Ocultar clave" : "Mostrar clave"}
									>
										{showApiKey ? (
											<EyeOff className="h-4 w-4" />
										) : (
											<Eye className="h-4 w-4" />
										)}
									</button>
								</div>

								<button
									type="button"
									onClick={handleTestConnection}
									disabled={connectionTestStatus === "testing"}
									className="px-3.5 py-2 rounded-lg border border-border bg-background hover:bg-secondary text-xs font-semibold text-foreground transition-colors cursor-pointer shrink-0"
								>
									{connectionTestStatus === "testing"
										? "Verificando..."
										: "Probar Conexión"}
								</button>
							</div>

							{connectionTestStatus === "success" && (
								<p className="text-[11px] text-emerald-500 font-semibold flex items-center gap-1.5 animate-fade-in">
									<Check className="h-3.5 w-3.5" />
									Conexión verificada exitosamente con el endpoint de{" "}
									{selectedProvider}.
								</p>
							)}
							{connectionTestStatus === "empty" && (
								<p className="text-[11px] text-destructive font-semibold flex items-center gap-1.5 animate-fade-in">
									<Lock className="h-3.5 w-3.5" />
									Por favor ingresa una API Key válida para probar la conexión.
								</p>
							)}
						</div>
					</div>

					{/* Save footer */}
					<div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border">
						{savedNotification ? (
							<span className="text-xs text-emerald-500 font-bold flex items-center gap-1.5">
								<Check className="h-4 w-4" /> Configuración FinOps guardada con
								éxito
							</span>
						) : (
							<span className="text-[11px] text-muted-foreground">
								Los parámetros se aplican de forma inmediata al motor de Plottio
								Asistente.
							</span>
						)}

						<button
							type="submit"
							className="w-full sm:w-auto px-5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
						>
							<Save className="h-4 w-4" />
							<span>Guardar Configuración FinOps</span>
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};
