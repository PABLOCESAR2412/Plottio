import { AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";

type InvitedUser = {
	id: string;
	nombre: string;
	email: string;
	invitationAccepted: boolean;
};

export const AceptarInvitacionView: React.FC<{
	token: string;
	onNavigateToLogin: () => void;
}> = ({ token, onNavigateToLogin }) => {
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isSuccess, setIsSuccess] = useState(false);

	const user = useQuery(api.usuarios.getUserByToken, { token }) as
		| InvitedUser
		| null
		| undefined;
	const aceptarInvitacionMut = useMutation(api.usuarios.aceptarInvitacion);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (password !== confirmPassword) {
			toast.error("Las contraseñas no coinciden");
			return;
		}
		if (password.length < 6) {
			toast.error("La contraseña debe tener al menos 6 caracteres");
			return;
		}

		setIsSubmitting(true);
		try {
			await aceptarInvitacionMut({ token, password });
			setIsSuccess(true);
			toast.success("Cuenta activada exitosamente");
			setTimeout(() => {
				onNavigateToLogin();
			}, 3000);
		} catch (error) {
			toast.error(
				(error as Error).message || "Error al aceptar invitación",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	if (user === undefined) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center p-4 text-foreground">
				Cargando verificación...
			</div>
		);
	}

	if (user === null) {
		return (
			<div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
				<div className="w-full max-w-md bg-card border border-border rounded-xl shadow-xl overflow-hidden p-8 text-center animate-fade-in">
					<AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
					<h2 className="text-xl font-bold text-foreground">
						Enlace inválido o expirado
					</h2>
					<p className="text-muted-foreground mt-2 mb-6">
						El enlace de invitación que usaste no es válido o ya fue utilizado
						anteriormente.
					</p>
					<button
						onClick={onNavigateToLogin}
						className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:opacity-90"
					>
						Ir al inicio
					</button>
				</div>
			</div>
		);
	}

	if (isSuccess) {
		return (
			<div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
				<div className="w-full max-w-md bg-card border border-border rounded-xl shadow-xl overflow-hidden p-8 text-center animate-fade-in">
					<CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
					<h2 className="text-2xl font-bold text-foreground">
						¡Cuenta Activada!
					</h2>
					<p className="text-muted-foreground mt-2">
						Tu cuenta ha sido configurada. Redirigiendo al inicio de sesión...
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
			<div className="w-full max-w-md bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-fade-in">
				<div className="p-6 border-b border-border text-center bg-secondary/30">
					<div className="mx-auto w-12 h-12 bg-primary text-primary-foreground flex items-center justify-center rounded-xl shadow-lg mb-4">
						<ShieldCheck className="h-6 w-6" />
					</div>
					<h1 className="text-2xl font-bold tracking-tight text-foreground">
						Bienvenido a Plottio
					</h1>
					<p className="text-sm text-muted-foreground mt-1 font-medium">
						Configura tu contraseña para {user.nombre}
					</p>
				</div>

				<form onSubmit={handleSubmit} className="p-6 space-y-4">
					<div>
						<label className="block text-sm font-semibold text-foreground mb-1.5">
							Correo Electrónico
						</label>
						<input
							type="email"
							disabled
							value={user.email}
							className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2.5 text-muted-foreground focus:outline-none cursor-not-allowed"
						/>
					</div>

					<div>
						<label className="block text-sm font-semibold text-foreground mb-1.5">
							Nueva Contraseña
						</label>
						<input
							type="password"
							required
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground focus:ring-1 focus:ring-primary outline-none"
							placeholder="Min. 6 caracteres"
						/>
					</div>

					<div>
						<label className="block text-sm font-semibold text-foreground mb-1.5">
							Confirmar Contraseña
						</label>
						<input
							type="password"
							required
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground focus:ring-1 focus:ring-primary outline-none"
							placeholder="Confirmar contraseña"
						/>
					</div>

					<button
						type="submit"
						disabled={isSubmitting}
						className="w-full mt-2 py-3 rounded-lg bg-primary text-primary-foreground font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
					>
						{isSubmitting ? "Guardando..." : "Activar Cuenta"}
					</button>
				</form>
			</div>
		</div>
	);
};
