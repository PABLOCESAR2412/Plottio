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
	component: RootComponent,
	pendingComponent: Loader,
});

function RootComponent() {
	// Safe instantiation of Convex Client
	const [convexClient] = useState(
		() =>
			new ConvexReactClient(
				import.meta.env.VITE_CONVEX_URL || "https://useful-koala-184.convex.cloud"
			),
	);

	// Safe instantiation of QueryClient
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
