import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { ConvexReactClient } from "convex/react";
import { convexClient } from "../src/routes/__root";

describe("Tarea 15: Configuración canónica de VITE_CONVEX_URL de producción y fallback resiliente", () => {
	const rootFilePath = path.resolve(__dirname, "../src/routes/__root.tsx");
	const envProdPath = path.resolve(__dirname, "../.env.production");
	const envPath = path.resolve(__dirname, "../.env");

	it("src/routes/__root.tsx no debe contener el string 'unconfigured'", () => {
		const content = fs.readFileSync(rootFilePath, "utf-8");
		expect(content).not.toContain("unconfigured");
	});

	it("src/routes/__root.tsx debe contener el fallback canónico de producción 'https://polished-ladybug-273.convex.cloud'", () => {
		const content = fs.readFileSync(rootFilePath, "utf-8");
		expect(content).toContain("https://polished-ladybug-273.convex.cloud");
	});

	it("la instanciación de ConvexReactClient con la URL canónica debe ser válida y no lanzar error fatal", () => {
		expect(() => {
			const client = new ConvexReactClient("https://polished-ladybug-273.convex.cloud");
			expect(client).toBeDefined();
		}).not.toThrow();
	});

	it("el singleton exportado convexClient debe estar inicializado y definido", () => {
		expect(convexClient).toBeDefined();
		expect(convexClient).toBeInstanceOf(ConvexReactClient);
	});

	it(".env.production debe existir y contener las variables canónicas de Convex", () => {
		expect(fs.existsSync(envProdPath)).toBe(true);
		const envProdContent = fs.readFileSync(envProdPath, "utf-8");
		expect(envProdContent).toContain("VITE_CONVEX_URL=https://polished-ladybug-273.convex.cloud");
		expect(envProdContent).toContain("VITE_CONVEX_SITE_URL=https://polished-ladybug-273.convex.site");
	});

	it(".env debe existir y contener las variables canónicas de Convex", () => {
		expect(fs.existsSync(envPath)).toBe(true);
		const envContent = fs.readFileSync(envPath, "utf-8");
		expect(envContent).toContain("VITE_CONVEX_URL=https://polished-ladybug-273.convex.cloud");
		expect(envContent).toContain("VITE_CONVEX_SITE_URL=https://polished-ladybug-273.convex.site");
	});
});
