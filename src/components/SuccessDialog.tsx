import { AlertTriangle, Check, Info, Trash2, X } from "lucide-react";
import type React from "react";
import { useEffect } from "react";

interface SuccessDialogProps {
	isOpen: boolean;
	onClose: () => void;
	title: string;
	message: string;
	type?: "success" | "alert" | "info" | "delete";
	confirmText?: string;
	onConfirm?: () => void;
}

export const SuccessDialog: React.FC<SuccessDialogProps> = ({
	isOpen,
	onClose,
	title,
	message,
	type = "success",
	confirmText = "Entendido",
	onConfirm,
}) => {
	// Listen for Escape key
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isOpen) {
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const handleConfirm = () => {
		if (onConfirm) {
			onConfirm();
		}
		onClose();
	};

	const getIcon = () => {
		switch (type) {
			case "delete":
				return (
					<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/15 text-destructive animate-bounce">
						<Trash2 className="h-7 w-7" />
					</div>
				);
			case "alert":
				return (
					<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-yellow-500/15 text-yellow-500 animate-pulse">
						<AlertTriangle className="h-7 w-7" />
					</div>
				);
			case "info":
				return (
					<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/15 text-blue-500">
						<Info className="h-7 w-7" />
					</div>
				);
			case "success":
			default:
				return (
					<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-500/15 text-green-500">
						<Check className="h-8 w-8 animate-scale-in" />
					</div>
				);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			{/* Overlay background glass */}
			<div
				className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
				onClick={onClose}
			/>

			{/* Dialog box */}
			<div className="relative w-full max-w-md overflow-hidden rounded-xl border border-border bg-card p-6 text-center shadow-xl transition-all animate-slide-in">
				{/* Close Button */}
				<button
					onClick={onClose}
					className="absolute top-4 right-4 rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground focus:outline-none"
				>
					<X className="h-5 w-5" />
				</button>

				{/* Icon */}
				<div className="mb-4">{getIcon()}</div>

				{/* Content */}
				<h3 className="mb-2 text-xl font-semibold text-foreground">{title}</h3>
				<p className="mb-6 text-sm text-muted-foreground">{message}</p>

				{/* Actions */}
				<div className="flex gap-3 justify-center">
					{onConfirm && (
						<button
							onClick={onClose}
							className="w-full rounded-lg border border-border px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
						>
							Cancelar
						</button>
					)}
					<button
						onClick={handleConfirm}
						className={`w-full rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
							type === "delete"
								? "bg-destructive text-white hover:bg-destructive/95"
								: "bg-primary text-primary-foreground hover:opacity-90"
						}`}
					>
						{confirmText}
					</button>
				</div>
			</div>
		</div>
	);
};
