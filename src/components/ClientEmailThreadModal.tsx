import { FileText, Mail, Paperclip, Send, X } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useIntegrationsStore } from "../store/useIntegrationsStore";

interface ClientEmailThreadModalProps {
	isOpen: boolean;
	onClose: () => void;
	cliente: {
		id: string;
		nombre: string;
		email: string;
	} | null;
}

export const ClientEmailThreadModal: React.FC<ClientEmailThreadModalProps> = ({
	isOpen,
	onClose,
	cliente,
}) => {
	const { email, sendEmailMessage } = useIntegrationsStore();

	const [subject, setSubject] = useState("");
	const [body, setBody] = useState("");
	const [attachPdf, setAttachPdf] = useState(true);
	const [isSending, setIsSending] = useState(false);

	if (!isOpen || !cliente) return null;

	const clientEmail =
		cliente.email ||
		`${cliente.nombre.toLowerCase().replace(/\s+/g, ".")}@empresa.com`;
	const thread = email.threads[clientEmail] || email.threads.default || [];

	const handleSend = (e: React.FormEvent) => {
		e.preventDefault();
		if (!subject.trim() || !body.trim()) return;

		setIsSending(true);
		setTimeout(() => {
			sendEmailMessage(
				clientEmail,
				subject.trim(),
				body.trim(),
				attachPdf
					? `Presupuesto_Plottio_${cliente.nombre.replace(/\s+/g, "_")}.pdf`
					: undefined,
			);
			setIsSending(false);
			setSubject("");
			setBody("");
		}, 600);
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
			<button
				type="button"
				className="fixed inset-0 w-full h-full cursor-default"
				onClick={onClose}
				aria-label="Cerrar modal"
			/>
			<div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl z-10 animate-slide-in flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
							<Mail className="h-5 w-5" />
						</div>
						<div>
							<h3 className="text-base font-bold text-foreground flex items-center gap-2">
								<span>Bandeja de Correo: {cliente.nombre}</span>
							</h3>
							<p className="text-xs text-muted-foreground font-mono">
								{clientEmail}
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

				{/* Thread Messages */}
				<div className="p-5 space-y-4 max-h-[260px] overflow-y-auto bg-secondary/15">
					{thread.map((msg) => (
						<div
							key={msg.id}
							className="rounded-xl border border-border bg-card p-4 space-y-2 shadow-xs"
						>
							<div className="flex items-center justify-between text-xs text-muted-foreground">
								<span className="font-semibold text-foreground">
									De: {msg.from}
								</span>
								<span>{msg.date}</span>
							</div>
							<div className="text-sm font-bold text-foreground">
								{msg.subject}
							</div>
							<p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">
								{msg.body}
							</p>
							{msg.hasAttachment && (
								<div className="pt-2 border-t border-border flex items-center gap-2">
									<div className="px-2.5 py-1 rounded-md bg-secondary/40 border border-border text-[11px] font-medium flex items-center gap-1.5 text-foreground">
										<FileText className="h-3.5 w-3.5 text-red-500" />
										<span>{msg.attachmentName || "Documento.pdf"}</span>
									</div>
								</div>
							)}
						</div>
					))}

					{thread.length === 0 && (
						<div className="text-center py-6 text-xs text-muted-foreground">
							No hay intercambios previos por correo con este cliente.
						</div>
					)}
				</div>

				{/* Composer Form */}
				<form
					onSubmit={handleSend}
					className="p-5 border-t border-border space-y-3 bg-card"
				>
					<div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
						Redactar Nuevo Correo
					</div>

					<div>
						<input
							type="text"
							required
							placeholder="Asunto (ej. Cotización de Vinilo para Camioneta)..."
							value={subject}
							onChange={(e) => setSubject(e.target.value)}
							className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
						/>
					</div>

					<div>
						<textarea
							rows={4}
							required
							placeholder="Escribe el cuerpo del mensaje..."
							value={body}
							onChange={(e) => setBody(e.target.value)}
							className="w-full rounded-lg border border-border bg-background p-3 text-xs text-foreground focus:border-primary focus:outline-none resize-none leading-relaxed"
						/>
					</div>

					{/* Attachment Option */}
					<div className="flex items-center justify-between rounded-lg border border-border bg-secondary/15 px-3 py-2">
						<label
							htmlFor="attach-pdf"
							className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer"
						>
							<Paperclip className="h-3.5 w-3.5 text-primary" />
							<span>Adjuntar última cotización generada en PDF</span>
						</label>
						<input
							id="attach-pdf"
							type="checkbox"
							checked={attachPdf}
							onChange={(e) => setAttachPdf(e.target.checked)}
							className="h-4 w-4 rounded border-border text-primary cursor-pointer"
						/>
					</div>

					{/* Actions */}
					<div className="flex items-center justify-end gap-2 pt-2">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 rounded-lg border border-border bg-card text-foreground text-xs font-semibold hover:bg-secondary transition-colors cursor-pointer"
						>
							Cerrar
						</button>
						<button
							type="submit"
							disabled={isSending || !subject.trim() || !body.trim()}
							className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40 flex items-center gap-1.5 shadow-sm"
						>
							<Send className="h-3.5 w-3.5" />
							<span>{isSending ? "Enviando..." : "Enviar Correo"}</span>
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};
