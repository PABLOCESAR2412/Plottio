import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";

import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	plugins: [
		devtools(),
		tailwindcss(),
		TanStackRouterVite(),
		viteReact(),
		VitePWA({
			registerType: "autoUpdate",
			manifest: {
				name: "Plottio - Gestión de Rotulado Vehicular",
				short_name: "Plottio",
				description:
					"Sistema premium de control y gestión para talleres de rotulación de buses, taxis y camiones.",
				display: "standalone",
				start_url: "/",
				theme_color: "#18181b",
				background_color: "#ffffff",
				lang: "es",
				icons: [
					{
						src: "favicon.ico",
						sizes: "64x64 32x32 24x24 16x16",
						type: "image/x-icon",
					},
				],
			},
			workbox: {
				globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,json}"],
				navigateFallback: "/index.html",
			},
			devOptions: {
				enabled: true,
				type: "module",
			},
		}),
	],
	build: {
		target: "esnext",
		minify: "esbuild",
		cssMinify: "lightningcss",
		rollupOptions: {
			output: {
				manualChunks: (id) => {
					if (id.includes("node_modules")) {
						if (id.includes("react")) return "vendor-react";
						if (id.includes("@tanstack")) return "vendor-tanstack";
						if (id.includes("gsap") || id.includes("motion"))
							return "vendor-animation";
						if (id.includes("lucide-react")) return "vendor-icons";
						return "vendor";
					}
				},
			},
		},
	},
});

export default config;
