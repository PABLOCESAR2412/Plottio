import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import type React from "react";
import { useState } from "react";
import { Toaster } from "sonner";
import { ThemeProvider } from "../components/ThemeProvider";
import { Loader } from "../components/Loader";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "plottio - Gestión de Rotulado Vehicular",
			},
			{
				name: "description",
				content:
					"Sistema premium de control y gestión para talleres de rotulación de buses, taxis y camiones.",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
			{
				rel: "icon",
				href: "/favicon.ico",
			},
		],
	}),
	pendingComponent: Loader,
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	// Safe instantiation of Convex Client for SSR and hydration
	const [convexClient] = useState(
		() =>
			new ConvexReactClient(
				typeof import.meta !== "undefined" &&
					import.meta.env &&
					import.meta.env.VITE_CONVEX_URL
					? import.meta.env.VITE_CONVEX_URL
					: "https://useful-koala-184.convex.cloud",
			),
	);

	// Safe instantiation of QueryClient for SSR and hydration
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 60 * 1000,
					},
				},
			}),
	);

	return (
		<html lang="es">
			<head>
				<HeadContent />
			</head>
			<body className="bg-background text-foreground min-h-screen">
				<ConvexProvider client={convexClient}>
					<QueryClientProvider client={queryClient}>
						<ThemeProvider>
							{children}
							<Toaster position="top-right" richColors />
						</ThemeProvider>
					</QueryClientProvider>
				</ConvexProvider>
				<Scripts />
			</body>
		</html>
	);
}
