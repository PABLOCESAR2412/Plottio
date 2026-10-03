import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createRootRoute,
	type ErrorComponentProps,
	Outlet,
} from "@tanstack/react-router";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { Toaster } from "sonner";
import { Loader } from "../components/Loader";
import { ThemeProvider } from "../components/ThemeProvider";

const convexUrl = import.meta.env.VITE_CONVEX_URL || "";
if (!convexUrl) {
	console.warn(
		"ADVERTENCIA: VITE_CONVEX_URL no está configurado en las variables de entorno.",
	);
}

export const convexClient = new ConvexReactClient(
	convexUrl || "https://unconfigured.convex.cloud",
);

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 60 * 1000,
		},
	},
});

export function RootErrorFallback({ error, reset }: ErrorComponentProps) {
	const errorMessage =
		error instanceof Error
			? error.message
			: typeof error === "string"
				? error
				: "Ocurrió un error inesperado al cargar la aplicación.";

	return (
		<div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background text-foreground p-6">
			<div className="max-w-md w-full bg-card border border-destructive/30 rounded-2xl p-6 shadow-xl text-center space-y-4">
				<div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<title>Error icon</title>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
						/>
					</svg>
				</div>
				<h2 className="text-xl font-bold text-foreground">
					Error en la Aplicación
				</h2>
				<p className="text-sm text-muted-foreground">
					Ha ocurrido un problema inesperado. Puedes intentar reintentar la
					acción o recargar la aplicación completa.
				</p>
				{errorMessage && (
					<div className="p-3 bg-muted/60 rounded-lg text-xs font-mono text-left overflow-auto max-h-32 text-destructive border border-destructive/20">
						{errorMessage}
					</div>
				)}
				<div className="flex gap-3 justify-center pt-2">
					<button
						type="button"
						onClick={() => {
							if (reset) {
								reset();
							} else {
								window.location.reload();
							}
						}}
						className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
					>
						Reintentar
					</button>
					<button
						type="button"
						onClick={() => window.location.reload()}
						className="px-4 py-2 border border-border text-foreground text-sm font-semibold rounded-lg hover:bg-secondary transition-colors cursor-pointer"
					>
						Recargar aplicación
					</button>
				</div>
			</div>
		</div>
	);
}

export const Route = createRootRoute({
	component: RootComponent,
	pendingComponent: Loader,
	errorComponent: RootErrorFallback,
});

function RootComponent() {
	return (
		<ConvexProvider client={convexClient}>
			<QueryClientProvider client={queryClient}>
				<ThemeProvider>
					<Outlet />
					<Toaster position="top-right" richColors />
				</ThemeProvider>
			</QueryClientProvider>
		</ConvexProvider>
	);
}
