import { ShieldCheck, Loader2, Mail, Lock, ArrowRight, CheckCircle2, Eye, EyeOff } from "lucide-react";
import React, { useState } from "react";
import { useSessionStore } from "../store/useSessionStore";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export const LoginView: React.FC = () => {
	const setCurrentUser = useSessionStore((s) => s.setCurrentUser);
	const loginAction = useAction(api.usuarios.login);

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!email || !password) return;

		setIsLoading(true);
		try {
			const usuario = await loginAction({ email, password });
			// Convex login devuelve el usuario con _id; el SessionStore lo adapta.
			setCurrentUser({
				id: (usuario as { _id: string })._id,
				nombre: (usuario as { nombre?: string }).nombre ?? "",
				email: (usuario as { email?: string }).email ?? email,
				rol: (usuario as { rol?: string }).rol ?? "Cotizador",
				sucursalId: (usuario as { sucursalId?: string | null }).sucursalId ?? null,
				pvId: (usuario as { pvId?: string | null }).pvId ?? null,
				activo: (usuario as { activo?: boolean }).activo ?? true,
			});
			toast.success("¡Bienvenido a Plottio!");
		} catch (error) {
			toast.error(
				(error as Error).message || "Error al iniciar sesión",
			);
		} finally {
			setIsLoading(false);
		}
	};

	const beneficios = [
		"Control centralizado multi-sucursal",
		"Gestión avanzada de inventario",
		"Cotizaciones y reportes automatizados",
		"Asignación y seguimiento de órdenes",
	];

	return (
		<div className="min-h-screen bg-background flex flex-col md:flex-row w-full animate-fade-in">
			{/* Panel Izquierdo - Información */}
			<div className="hidden md:flex md:w-1/2 lg:w-5/12 bg-secondary/30 border-r border-border flex-col justify-between p-12 relative overflow-hidden">
				{/* Elemento de fondo decorativo */}
				<div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
				<div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

				<div className="relative z-10">
					<div className="flex items-center gap-3 mb-16">
						<div className="w-12 h-12 bg-primary text-primary-foreground flex items-center justify-center rounded-xl shadow-lg">
							<ShieldCheck className="h-6 w-6" />
						</div>
						<h1 className="text-3xl font-black tracking-widest text-foreground">
							PLOTTIO
						</h1>
					</div>

					<div className="space-y-8 max-w-md">
						<h2 className="text-4xl font-semibold tracking-tight text-foreground leading-tight">
							El sistema definitivo para tu taller de rotulación.
						</h2>
						
						<ul className="space-y-5 mt-8">
							{beneficios.map((beneficio, index) => (
								<li key={index} className="flex items-center gap-4 text-muted-foreground font-medium">
									<div className="flex-shrink-0 w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center">
										<CheckCircle2 className="h-4 w-4 text-primary" />
									</div>
									<span className="text-lg">{beneficio}</span>
								</li>
							))}
						</ul>
					</div>
				</div>

				<div className="relative z-10 mt-12 text-sm text-muted-foreground/80 font-medium">
					&copy; {new Date().getFullYear()} Plottio. Todos los derechos reservados.
				</div>
			</div>

			{/* Panel Derecho - Login */}
			<div className="flex-1 flex flex-col justify-between bg-background relative">
				<div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12">
					{/* Logo solo en móvil */}
					<div className="flex md:hidden items-center justify-center gap-3 mb-10">
						<div className="w-10 h-10 bg-primary text-primary-foreground flex items-center justify-center rounded-xl shadow-lg">
							<ShieldCheck className="h-5 w-5" />
						</div>
						<h1 className="text-2xl font-black tracking-widest text-foreground">
							PLOTTIO
						</h1>
					</div>

					<div className="w-full max-w-md space-y-8">
						<div className="text-center md:text-left">
							<h2 className="text-3xl font-bold tracking-tight text-foreground">
								Iniciar sesión
							</h2>
							<p className="text-muted-foreground mt-2">
								Ingresa tus credenciales para acceder a tu panel.
							</p>
						</div>

						<form onSubmit={handleSubmit} className="space-y-6 mt-8">
							<div className="space-y-2">
								<label className="text-xs font-bold text-foreground uppercase tracking-wider">
									Correo Electrónico
								</label>
								<div className="relative">
									<div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
										<Mail className="h-5 w-5" />
									</div>
									<input
										type="email"
										name="email"
										autoComplete="username"
										required
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										className="w-full pl-11 pr-4 py-3 bg-secondary/20 border border-border rounded-xl text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-medium"
										placeholder="tu@empresa.com"
									/>
								</div>
							</div>

							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<label className="text-xs font-bold text-foreground uppercase tracking-wider">
										Contraseña
									</label>
									<button type="button" className="text-xs text-primary hover:underline font-medium">
										¿Olvidaste tu contraseña?
									</button>
								</div>
								<div className="relative">
									<div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
										<Lock className="h-5 w-5" />
									</div>
									<input
										type={showPassword ? "text" : "password"}
										name="password"
										autoComplete="current-password"
										required
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										className="w-full pl-11 pr-12 py-3 bg-secondary/20 border border-border rounded-xl text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-medium"
										placeholder="••••••••"
									/>
									<button
										type="button"
										onClick={() => setShowPassword(!showPassword)}
										className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
									>
										{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
									</button>
								</div>
							</div>

							<button
								type="submit"
								disabled={isLoading}
								className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-primary-foreground font-bold rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-md transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none cursor-pointer mt-4"
							>
								{isLoading ? (
									<Loader2 className="h-5 w-5 animate-spin" />
								) : (
									<>
										Entrar a mi cuenta
										<ArrowRight className="h-5 w-5" />
									</>
								)}
							</button>
						</form>
					</div>
				</div>

				{/* Footer Developer */}
				<div className="py-6 px-8 flex justify-center md:justify-end text-sm text-muted-foreground/80 font-medium">
					Diseñado y desarrollado por{" "}
					<a
						href="https://www.linkedin.com/in/pablo-cesar-torres/"
						target="_blank"
						rel="noopener noreferrer"
						className="text-primary hover:underline ml-1 font-semibold flex items-center gap-1"
					>
						Pablo Torres
					</a>
				</div>
			</div>
		</div>
	);
};
