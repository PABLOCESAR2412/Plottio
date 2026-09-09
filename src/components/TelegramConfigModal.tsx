import { Bot, Check, Code, Send, Terminal, X } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useIntegrationsStore } from "../store/useIntegrationsStore";

interface TelegramConfigModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export const TelegramConfigModal: React.FC<TelegramConfigModalProps> = ({
	isOpen,
	onClose,
}) => {
	const { telegram, updateTelegramConfig, testTelegramAlert } =
		useIntegrationsStore();

	const [token, setToken] = useState(telegram.botToken);
	const [chatId, setChatId] = useState(telegram.chatId);
	const [username, setUsername] = useState(telegram.botUsername);
	const [webhook, setWebhook] = useState(telegram.webhookUrl);
	const [chatOps, setChatOps] = useState(telegram.enableChatOps);
	const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success">(
		"idle",
	);

	if (!isOpen) return null;

	const handleSave = (e: React.FormEvent) => {
		e.preventDefault();
		updateTelegramConfig({
			botToken: token,
			chatId,
			botUsername: username,
			webhookUrl: webhook,
			enableChatOps: chatOps,
			status: token ? "connected" : "disconnected",
		});
		onClose();
	};

	const handleTestAlert = async () => {
		setTestStatus("testing");
		await testTelegramAlert();
		setTimeout(() => {
			setTestStatus("success");
			setTimeout(() => setTestStatus("idle"), 3000);
		}, 800);
	};

	const chatOpsCommands = [
		{
			command: "/status",
			desc: "Reporte de salud de la plataforma, API y convex sync",
		},
		{
			command: "/ordenes",
			desc: "Resumen de órdenes activas (Pendientes y En Proceso)",
		},
		{
			command: "/alertas",
			desc: "Verificar stock crítico en vinilos y plotters",
		},
		{
			command: "/ventas",
			desc: "Métricas de cotizaciones emitidas y aprobadas hoy",
		},
	];

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
			<button
				type="button"
				className="fixed inset-0 w-full h-full cursor-default"
				onClick={onClose}
				aria-label="Cerrar modal"
			/>
			<div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl z-10 animate-slide-in p-5 sm:p-6 space-y-6">
				{/* Modal Header */}
				<div className="flex items-center justify-between border-b border-border pb-4">
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#229ED9]/15 text-[#229ED9]">
							<Bot className="h-6 w-6" />
						</div>
						<div>
							<h3 className="text-lg font-bold text-foreground flex items-center gap-2">
								<span>Telegram Bot & ChatOps</span>
								<span
									className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
										telegram.status === "connected"
											? "bg-green-500/15 text-green-500"
											: "bg-muted text-muted-foreground"
									}`}
								>
									{telegram.status === "connected" ? "En Línea" : "Inactivo"}
								</span>
							</h3>
							<p className="text-xs text-muted-foreground">
								Notificaciones push directas para administradores y técnicos de
								taller.
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

				{/* Configuration Form */}
				<form onSubmit={handleSave} className="space-y-4 text-xs sm:text-sm">
					<div>
						<label
							htmlFor="tg-token"
							className="block text-xs font-semibold text-muted-foreground mb-1"
						>
							Bot Token (proporcionado por @BotFather) *
						</label>
						<input
							id="tg-token"
							type="password"
							required
							value={token}
							onChange={(e) => setToken(e.target.value)}
							placeholder="123456789:ABCdefGHIjklMNOpqrSTUv..."
							className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-foreground focus:border-[#229ED9] focus:outline-none"
						/>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div>
							<label
								htmlFor="tg-username"
								className="block text-xs font-semibold text-muted-foreground mb-1"
							>
								Usuario del Bot
							</label>
							<input
								id="tg-username"
								type="text"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								placeholder="@MiTallerBot"
								className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-[#229ED9] focus:outline-none"
							/>
						</div>
						<div>
							<label
								htmlFor="tg-chatid"
								className="block text-xs font-semibold text-muted-foreground mb-1"
							>
								Chat ID / Canal de Operaciones *
							</label>
							<input
								id="tg-chatid"
								type="text"
								value={chatId}
								onChange={(e) => setChatId(e.target.value)}
								placeholder="-1001234567890"
								className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-foreground focus:border-[#229ED9] focus:outline-none"
							/>
						</div>
					</div>

					<div>
						<label
							htmlFor="tg-webhook"
							className="block text-xs font-semibold text-muted-foreground mb-1"
						>
							Webhook Endpoint (Automático)
						</label>
						<input
							id="tg-webhook"
							type="text"
							value={webhook}
							onChange={(e) => setWebhook(e.target.value)}
							className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-muted-foreground focus:border-[#229ED9] focus:outline-none"
						/>
					</div>

					{/* ChatOps Switch */}
					<div className="flex items-center justify-between rounded-xl border border-border bg-secondary/15 p-3.5">
						<div>
							<div className="font-semibold text-foreground text-xs flex items-center gap-1.5">
								<Terminal className="h-4 w-4 text-[#229ED9]" />
								Habilitar ChatOps Bidireccional
							</div>
							<div className="text-[11px] text-muted-foreground mt-0.5">
								Permite consultar el estado del taller mediante comandos de
								Telegram.
							</div>
						</div>
						<input
							type="checkbox"
							checked={chatOps}
							onChange={(e) => setChatOps(e.target.checked)}
							className="h-4 w-4 rounded border-border text-[#229ED9] focus:ring-[#229ED9] cursor-pointer"
						/>
					</div>

					{/* ChatOps Commands Reference */}
					<div className="space-y-2 rounded-xl border border-border bg-secondary/10 p-3.5">
						<div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
							<Code className="h-3.5 w-3.5 text-primary" />
							Comandos ChatOps Disponibles
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
							{chatOpsCommands.map((cmd) => (
								<div
									key={cmd.command}
									className="p-2 rounded-lg border border-border/70 bg-card flex flex-col gap-0.5"
								>
									<span className="font-mono font-bold text-[#229ED9]">
										{cmd.command}
									</span>
									<span className="text-[11px] text-muted-foreground">
										{cmd.desc}
									</span>
								</div>
							))}
						</div>
					</div>

					{/* Actions row */}
					<div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border">
						<button
							type="button"
							onClick={handleTestAlert}
							disabled={testStatus === "testing"}
							className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-[#229ED9]/40 bg-[#229ED9]/10 text-[#229ED9] hover:bg-[#229ED9]/20 text-xs font-semibold transition-colors cursor-pointer"
						>
							{testStatus === "testing" ? (
								<span>Enviando prueba...</span>
							) : testStatus === "success" ? (
								<>
									<Check className="h-4 w-4 text-green-500" />
									<span>¡Alerta Enviada a Telegram!</span>
								</>
							) : (
								<>
									<Send className="h-4 w-4" />
									<span>Probar Alerta ChatOps</span>
								</>
							)}
						</button>

						<div className="flex items-center gap-2 w-full sm:w-auto">
							<button
								type="button"
								onClick={onClose}
								className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-border bg-card text-foreground text-xs font-semibold hover:bg-secondary transition-colors cursor-pointer"
							>
								Cancelar
							</button>
							<button
								type="submit"
								className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-[#229ED9] text-white text-xs font-semibold hover:bg-[#1f8ec4] transition-colors cursor-pointer shadow-sm"
							>
								Guardar Configuración
							</button>
						</div>
					</div>
				</form>
			</div>
		</div>
	);
};
