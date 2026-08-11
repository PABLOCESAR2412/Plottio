import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";

import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	plugins: [devtools(), tailwindcss(), TanStackRouterVite(), viteReact()],
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
