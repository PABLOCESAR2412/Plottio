import { CheckCheck, FileText, Phone, Send, Sparkles, X } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useIntegrationsStore } from "../store/useIntegrationsStore";

interface WhatsAppClientChatModalProps {
	isOpen: boolean;
	onClose: () => void;
	cliente: {
		id: string;
		nombre: string;
		telefono: string;
	} | null;
}

export const WhatsAppClientChatModal: React.FC<
	WhatsAppClientChatModalProps
> = ({ isOpen, onClose, cliente }) => {
	const { whatsapp, sendWhatsAppMessage } = useIntegrationsStore();
	const [inputMessage, setInputMessage] = useState("");
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const chatKey = cliente?.telefono || cliente?.id || "default";
	const messages = whatsapp.chats[chatKey] || whatsapp.chats.default || [];

	// biome-ignore lint/correctness/useExhaustiveDependencies: auto-scroll when message count changes or modal opens
	useEffect(() => {
		if (isOpen) {
			messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
		}
	}, [isOpen, messages.length]);

	if (!isOpen || !cliente) return null;

	const handleSend = (textToSend?: string) => {
		const text = textToSend || inputMessage;
		if (!text.trim()) return;

		sendWhatsAppMessage(chatKey, text.trim(), "agent");
		setInputMessage("");
	};

	const quickTemplates = [
		{
			title: "Cotización Lista",
			text: `Hola ${cliente.nombre.split(" ")[0]}, tu cotización de rotulado vehicular en PLOTTIO ya está lista para tu revisión. ¿Deseas que te la enviemos en PDF?`,
		},
		{
			title: "Vehículo Terminado",
			text: `¡Buenas noticias, ${cliente.nombre.split(" ")[0]}! Tu vehículo ha completado el proceso de rotulado e instalación con éxito. Ya puedes retirarlo en nuestro taller.`,
		},
		{
			title: "Recordatorio Cita",
			text: `Hola ${cliente.nombre.split(" ")[0]}, te recordamos tu cita agendada en PLOTTIO para la instalación de vinilos. Por favor trae el vehículo limpio.`,
		},
	];

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
			<button
				type="button"
				className="fixed inset-0 w-full h-full cursor-default"
				onClick={onClose}
				aria-label="Cerrar chat"
			/>
			<div className="relative w-full max-w-lg h-[620px] max-h-[92vh] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden z-10 animate-slide-in">
				{/* Top Bar Header */}
				<div className="flex items-center justify-between px-4 py-3 bg-[#075E54] text-white shrink-0">
					<div className="flex items-center gap-3 min-w-0">
						<div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-white font-bold text-sm">
							{cliente.nombre.charAt(0).toUpperCase()}
							<span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-400 border-2 border-[#075E54]" />
						</div>
						<div className="truncate">
							<div className="text-sm font-bold truncate flex items-center gap-1.5">
								<span>{cliente.nombre}</span>
								<span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/30 text-amber-200 border border-amber-400/40 font-bold">
									Modo Demostración / Sandbox
								</span>
								<span className="text-[10px] px-1.5 py-0.2 rounded bg-white/20 font-mono">
									Evolution API
								</span>
							</div>
							<div className="text-[11px] opacity-85 flex items-center gap-1">
								<Phone className="h-3 w-3" />
								<span>{cliente.telefono || "Sin teléfono"}</span>
								<span className="text-green-300 font-medium">• En línea</span>
							</div>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
						aria-label="Cerrar"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* Sandbox Notice Banner */}
				<div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs text-amber-700 dark:text-amber-300 shrink-0">
					<div className="flex items-center gap-2">
						<span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 border border-amber-500/40 uppercase tracking-wide">
							Modo Demostración / Sandbox
						</span>
						<span className="text-[11px]">
							Simulado - Sin webhook real conectado. Mensajes entrantes
							ficticios desactivados.
						</span>
					</div>
				</div>

				{/* Quick Templates Drawer */}
				<div className="bg-secondary/40 border-b border-border px-3 py-2 flex items-center gap-2 overflow-x-auto text-xs shrink-0 scrollbar-none">
					<span className="text-[10px] font-bold text-muted-foreground uppercase shrink-0 flex items-center gap-1">
						<Sparkles className="h-3 w-3 text-primary" /> Plantillas:
					</span>
					{quickTemplates.map((tpl) => (
						<button
							key={tpl.title}
							type="button"
							onClick={() => handleSend(tpl.text)}
							className="shrink-0 px-2.5 py-1 rounded-full border border-border bg-background hover:bg-primary/10 hover:border-primary/40 text-foreground text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1"
						>
							<FileText className="h-3 w-3 text-primary/70" />
							{tpl.title}
						</button>
					))}
				</div>

				{/* Chat Messages Body */}
				<div className="flex-1 overflow-y-auto p-4 space-y-3 bg-secondary/15">
					<div className="text-center my-1">
						<span className="text-[10px] px-2.5 py-1 rounded-full bg-card border border-border text-muted-foreground shadow-xs">
							Canal seguro con Evolution API • Instancia {whatsapp.instanceName}
						</span>
					</div>

					{messages.map((m) => {
						const isAgent = m.sender === "agent";
						return (
							<div
								key={m.id}
								className={`flex flex-col ${isAgent ? "items-end" : "items-start"}`}
							>
								<div
									className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm shadow-xs ${
										isAgent
											? "bg-[#005c4b] text-white rounded-br-xs"
											: "bg-card text-foreground border border-border rounded-bl-xs"
									}`}
								>
									<p className="whitespace-pre-wrap leading-relaxed">
										{m.text}
									</p>
									<div
										className={`text-[10px] mt-1 flex items-center justify-end gap-1.5 ${
											isAgent ? "text-white/70" : "text-muted-foreground"
										}`}
									>
										{isAgent && (
											<span className="text-[9px] text-white/70 italic">
												Simulado - Sin webhook real conectado
											</span>
										)}
										<span>{m.timestamp}</span>
										{isAgent && (
											<CheckCheck className="h-3.5 w-3.5 text-sky-300" />
										)}
									</div>
								</div>
							</div>
						);
					})}
					<div ref={messagesEndRef} />
				</div>

				{/* Message Input Footer */}
				<div className="p-3 bg-card border-t border-border flex items-center gap-2 shrink-0">
					<input
						type="text"
						value={inputMessage}
						onChange={(e) => setInputMessage(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !e.shiftKey) {
								e.preventDefault();
								handleSend();
							}
						}}
						placeholder="Escribe un mensaje de WhatsApp..."
						className="flex-1 rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs sm:text-sm text-foreground focus:border-primary focus:outline-none"
					/>
					<button
						type="button"
						onClick={() => handleSend()}
						disabled={!inputMessage.trim()}
						className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00a884] hover:bg-[#008f70] text-white transition-colors cursor-pointer disabled:opacity-40 shrink-0"
						title="Enviar mensaje"
					>
						<Send className="h-4 w-4" />
					</button>
				</div>
			</div>
		</div>
	);
};
