import {
	Activity,
	Coins,
	DollarSign,
	Gauge,
	Key,
	Save,
	Zap,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useIntegrationsStore } from "../store/useIntegrationsStore";

export const FinOpsMetricsPanel: React.FC = () => {
	const { ai, updateAiConfig } = useIntegrationsStore();

	const [provider, setProvider] = useState(ai.provider);
	const [geminiKey, setGeminiKey] = useState(ai.geminiApiKey);
	const [openaiKey, setOpenaiKey] = useState(ai.openaiApiKey);
	const [customEndpoint, setCustomEndpoint] = useState(ai.customEndpoint);
	const [activeModel, setActiveModel] = useState(ai.activeModel);
	const [budgetUSD, setBudgetUSD] = useState(ai.monthlyBudgetUSD);
	const [savedNotification, setSavedNotification] = useState(false);

	const handleSave = (e: React.FormEvent) => {
		e.preventDefault();
		updateAiConfig({
			provider,
			geminiApiKey: geminiKey,
			openaiApiKey: openaiKey,
			customEndpoint,
			activeModel,
			monthlyBudgetUSD: Number(budgetUSD),
		});
		setSavedNotification(true);
		setTimeout(() => setSavedNotification(false), 2500);
	};

	const budgetPercent = Math.min(
		100,
		Math.round((ai.currentSpendUSD / ai.monthlyBudgetUSD) * 100),
	);

	return (
		<div className="space-y-6">
			{/* Top FinOps Metrics Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-2">
					<div className="flex items-center justify-between text-muted-foreground">
						<span className="text-xs font-semibold uppercase tracking-wider">
							Gasto Acumulado (Mes)
						</span>
						<DollarSign className="h-4 w-4 text-emerald-500" />
					</div>
					<div className="text-2xl font-black text-foreground">
						${ai.currentSpendUSD.toFixed(2)}{" "}
						<span className="text-xs font-normal text-muted-foreground">
							/ ${ai.monthlyBudgetUSD} USD
						</span>
					</div>
					{/* Budget Progress Bar */}
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

				<div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-2">
					<div className="flex items-center justify-between text-muted-foreground">
						<span className="text-xs font-semibold uppercase tracking-wider">
							Tokens Hoy
						</span>
						<Coins className="h-4 w-4 text-amber-500" />
					</div>
					<div className="text-2xl font-black text-foreground">
						{ai.tokensToday.toLocaleString("en-US")}
					</div>
					<div className="text-[11px] text-muted-foreground flex items-center gap-1">
						<Zap className="h-3 w-3 text-amber-500" />
						<span>{ai.totalRequests} llamadas inferenciales</span>
					</div>
				</div>

				<div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-2">
					<div className="flex items-center justify-between text-muted-foreground">
						<span className="text-xs font-semibold uppercase tracking-wider">
							Throughput (TPS)
						</span>
						<Gauge className="h-4 w-4 text-sky-500" />
					</div>
					<div className="text-2xl font-black text-foreground">
						{ai.tps}{" "}
						<span className="text-xs font-normal text-muted-foreground">
							tok/s
						</span>
					</div>
					<div className="text-[11px] text-muted-foreground">
						Velocidad media de generación
					</div>
				</div>

				<div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-2">
					<div className="flex items-center justify-between text-muted-foreground">
						<span className="text-xs font-semibold uppercase tracking-wider">
							Latencia P95
						</span>
						<Activity className="h-4 w-4 text-purple-500" />
					</div>
					<div className="text-2xl font-black text-foreground">
						{ai.latencyMs}{" "}
						<span className="text-xs font-normal text-muted-foreground">
							ms
						</span>
					</div>
					<div className="text-[11px] text-emerald-500 font-semibold flex items-center gap-1">
						<span>Óptimo para cotizaciones en vivo</span>
					</div>
				</div>
			</div>

			{/* FinOps Hourly Consumption Graph Simulation */}
			<div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
				<div className="flex items-center justify-between">
					<div>
						<h3 className="text-base font-bold text-foreground flex items-center gap-2">
							<span>Consumo Horario de Tokens & Costos FinOps</span>
						</h3>
						<p className="text-xs text-muted-foreground">
							Monitoreo de tokens inferenciales procesados por el motor de
							cotización y RAG.
						</p>
					</div>
					<span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-secondary text-foreground">
						{ai.activeModel}
					</span>
				</div>

				{/* Visual Bars for hourly tokens */}
				<div className="grid grid-cols-6 gap-2 pt-4 items-end h-36 border-b border-border pb-2">
					{ai.tokenUsageHourly.map((h) => {
						const heightPct = Math.min(
							100,
							Math.round((h.tokens / 70000) * 100),
						);
						return (
							<div
								key={h.hour}
								className="flex flex-col items-center gap-1.5 h-full justify-end"
							>
								<div className="text-[10px] font-mono text-muted-foreground">
									${h.costUSD.toFixed(3)}
								</div>
								<div
									className="w-full max-w-[36px] bg-primary/70 hover:bg-primary rounded-t-md transition-all duration-300"
									style={{ height: `${heightPct}%` }}
									title={`${h.tokens.toLocaleString()} tokens`}
								/>
								<div className="text-[10px] text-muted-foreground font-semibold">
									{h.hour}
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{/* Configuration Form for AI Models */}
			<div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-5">
				<div>
					<h3 className="text-base font-bold text-foreground flex items-center gap-2">
						<Key className="h-4 w-4 text-primary" />
						<span>Configuración de Proveedores LLM & Presupuesto</span>
					</h3>
					<p className="text-xs text-muted-foreground">
						Gestiona llaves de API, endpoints custom y presupuestos máximos
						mensuales.
					</p>
				</div>

				<form onSubmit={handleSave} className="space-y-4 text-xs sm:text-sm">
					{/* Provider tabs */}
					<div>
						<span className="block text-xs font-semibold text-muted-foreground mb-2">
							Proveedor Activo:
						</span>
						<div className="grid grid-cols-3 gap-2">
							{(["gemini", "openai", "custom"] as const).map((pr) => (
								<button
									key={pr}
									type="button"
									onClick={() => {
										setProvider(pr);
										if (pr === "gemini") setActiveModel("gemini-1.5-flash");
										else if (pr === "openai") setActiveModel("gpt-4o-mini");
										else setActiveModel("custom-llama-3");
									}}
									className={`py-2 px-3 rounded-lg border text-xs font-bold uppercase transition-colors cursor-pointer ${
										provider === pr
											? "border-primary bg-primary/10 text-primary"
											: "border-border bg-background text-muted-foreground hover:bg-secondary"
									}`}
								>
									{pr}
								</button>
							))}
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						{provider === "gemini" && (
							<div>
								<label
									htmlFor="gemini-key"
									className="block text-xs font-semibold text-muted-foreground mb-1"
								>
									Google Gemini API Key *
								</label>
								<input
									id="gemini-key"
									type="password"
									value={geminiKey}
									onChange={(e) => setGeminiKey(e.target.value)}
									className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
								/>
							</div>
						)}

						{provider === "openai" && (
							<div>
								<label
									htmlFor="openai-key"
									className="block text-xs font-semibold text-muted-foreground mb-1"
								>
									OpenAI API Key *
								</label>
								<input
									id="openai-key"
									type="password"
									value={openaiKey}
									onChange={(e) => setOpenaiKey(e.target.value)}
									className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
								/>
							</div>
						)}

						{provider === "custom" && (
							<div>
								<label
									htmlFor="custom-endpoint"
									className="block text-xs font-semibold text-muted-foreground mb-1"
								>
									Endpoint Propio (Compatible OpenAI / vLLM) *
								</label>
								<input
									id="custom-endpoint"
									type="text"
									value={customEndpoint}
									onChange={(e) => setCustomEndpoint(e.target.value)}
									className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
								/>
							</div>
						)}

						<div>
							<label
								htmlFor="active-model"
								className="block text-xs font-semibold text-muted-foreground mb-1"
							>
								Modelo Seleccionado
							</label>
							<input
								id="active-model"
								type="text"
								value={activeModel}
								onChange={(e) => setActiveModel(e.target.value)}
								className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
							/>
						</div>

						<div>
							<label
								htmlFor="monthly-budget"
								className="block text-xs font-semibold text-muted-foreground mb-1"
							>
								Presupuesto Máximo Mensual (USD)
							</label>
							<input
								id="monthly-budget"
								type="number"
								value={budgetUSD}
								onChange={(e) => setBudgetUSD(Number(e.target.value))}
								className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
							/>
						</div>
					</div>

					<div className="flex items-center justify-between pt-3 border-t border-border">
						{savedNotification ? (
							<span className="text-xs text-green-500 font-semibold">
								✓ Configuración FinOps guardada con éxito
							</span>
						) : (
							<span />
						)}

						<button
							type="submit"
							className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-sm flex items-center gap-1.5"
						>
							<Save className="h-4 w-4" />
							<span>Guardar Parámetros de IA</span>
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};
