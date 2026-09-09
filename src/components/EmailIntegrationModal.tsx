import { Check, Mail, Send, X } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useIntegrationsStore } from "../store/useIntegrationsStore";

interface EmailIntegrationModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export const EmailIntegrationModal: React.FC<EmailIntegrationModalProps> = ({
	isOpen,
	onClose,
}) => {
	const { email, updateEmailConfig } = useIntegrationsStore();

	const [host, setHost] = useState(email.smtpHost);
	const [port, setPort] = useState(email.smtpPort);
	const [user, setUser] = useState(email.smtpUser);
	const [pass, setPass] = useState(email.smtpPass);
	const [senderName, setSenderName] = useState(email.senderName);
	const [provider, setProvider] = useState<"smtp" | "gmail" | "outlook">(
		email.provider,
	);
	const [testEmail, setTestEmail] = useState("");
	const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success">(
		"idle",
	);

	if (!isOpen) return null;

	const handleSave = (e: React.FormEvent) => {
		e.preventDefault();
		updateEmailConfig({
			smtpHost: host,
			smtpPort: port,
			smtpUser: user,
			smtpPass: pass,
			senderName,
			provider,
			status: user ? "connected" : "disconnected",
		});
		onClose();
	};

	const handleTestEmail = () => {
		setTestStatus("testing");
		setTimeout(() => {
			setTestStatus("success");
			setTimeout(() => setTestStatus("idle"), 3000);
		}, 1000);
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
			<button
				type="button"
				className="fixed inset-0 w-full h-full cursor-default"
				onClick={onClose}
				aria-label="Cerrar modal"
			/>
			<div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl z-10 animate-slide-in p-5 sm:p-6 space-y-6">
				{/* Header */}
				<div className="flex items-center justify-between border-b border-border pb-4">
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
							<Mail className="h-6 w-6" />
						</div>
						<div>
							<h3 className="text-lg font-bold text-foreground flex items-center gap-2">
								<span>Correo Corporativo (OAuth2 & SMTP)</span>
								<span
									className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
										email.status === "connected"
											? "bg-green-500/15 text-green-500"
											: "bg-muted text-muted-foreground"
									}`}
								>
									{email.status === "connected" ? "Conectado" : "Desconectado"}
								</span>
							</h3>
							<p className="text-xs text-muted-foreground">
								Envío de presupuestos en PDF y seguimiento de órdenes a
								clientes.
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

				<form onSubmit={handleSave} className="space-y-4 text-xs sm:text-sm">
					{/* Provider tabs */}
					<div>
						<span className="block text-xs font-semibold text-muted-foreground mb-2">
							Tipo de Conexión:
						</span>
						<div className="grid grid-cols-3 gap-2">
							{(["outlook", "gmail", "smtp"] as const).map((pr) => (
								<button
									key={pr}
									type="button"
									onClick={() => {
										setProvider(pr);
										if (pr === "outlook") {
											setHost("smtp.office365.com");
											setPort(587);
										} else if (pr === "gmail") {
											setHost("smtp.gmail.com");
											setPort(465);
										}
									}}
									className={`py-2 px-3 rounded-lg border text-xs font-bold capitalize transition-colors cursor-pointer ${
										provider === pr
											? "border-primary bg-primary/10 text-primary"
											: "border-border bg-background text-muted-foreground hover:bg-secondary"
									}`}
								>
									{pr === "smtp" ? "Custom SMTP" : pr}
								</button>
							))}
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
						<div className="sm:col-span-2">
							<label
								htmlFor="email-host"
								className="block text-xs font-semibold text-muted-foreground mb-1"
							>
								Servidor SMTP Host *
							</label>
							<input
								id="email-host"
								type="text"
								required
								value={host}
								onChange={(e) => setHost(e.target.value)}
								className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
							/>
						</div>
						<div>
							<label
								htmlFor="email-port"
								className="block text-xs font-semibold text-muted-foreground mb-1"
							>
								Puerto *
							</label>
							<input
								id="email-port"
								type="number"
								required
								value={port}
								onChange={(e) => setPort(Number(e.target.value))}
								className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
							/>
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div>
							<label
								htmlFor="email-user"
								className="block text-xs font-semibold text-muted-foreground mb-1"
							>
								Usuario / Correo Electrónico *
							</label>
							<input
								id="email-user"
								type="email"
								required
								value={user}
								onChange={(e) => setUser(e.target.value)}
								className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
							/>
						</div>
						<div>
							<label
								htmlFor="email-pass"
								className="block text-xs font-semibold text-muted-foreground mb-1"
							>
								Contraseña / App Password *
							</label>
							<input
								id="email-pass"
								type="password"
								required
								value={pass}
								onChange={(e) => setPass(e.target.value)}
								className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
							/>
						</div>
					</div>

					<div>
						<label
							htmlFor="email-sender"
							className="block text-xs font-semibold text-muted-foreground mb-1"
						>
							Nombre de Remitente (Display Name)
						</label>
						<input
							id="email-sender"
							type="text"
							value={senderName}
							onChange={(e) => setSenderName(e.target.value)}
							placeholder="Plottio Taller Central"
							className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
						/>
					</div>

					{/* Test Section */}
					<div className="rounded-xl border border-border bg-secondary/15 p-3 space-y-2">
						<span className="block text-xs font-semibold text-foreground">
							Probar Entrega de Correo:
						</span>
						<div className="flex gap-2">
							<input
								type="email"
								value={testEmail}
								onChange={(e) => setTestEmail(e.target.value)}
								placeholder="tu-correo@empresa.com"
								className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none"
							/>
							<button
								type="button"
								onClick={handleTestEmail}
								disabled={!testEmail || testStatus === "testing"}
								className="px-3 py-1.5 rounded-lg border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-1 shrink-0"
							>
								{testStatus === "testing" ? (
									"Probando..."
								) : testStatus === "success" ? (
									<>
										<Check className="h-3.5 w-3.5 text-green-500" />
										<span>¡Enviado!</span>
									</>
								) : (
									<>
										<Send className="h-3.5 w-3.5" />
										<span>Enviar Test</span>
									</>
								)}
							</button>
						</div>
					</div>

					{/* Actions footer */}
					<div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 rounded-lg border border-border bg-card text-foreground text-xs font-semibold hover:bg-secondary transition-colors cursor-pointer"
						>
							Cancelar
						</button>
						<button
							type="submit"
							className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
						>
							Guardar Credenciales
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};
