import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import * as clientesModule from "../convex/clientes";

describe("Tarea 4: Limpieza de código basura y archivos huérfanos", () => {
	it("el directorio src/components/landing no debe existir", () => {
		const landingDir = path.resolve(__dirname, "../src/components/landing");
		expect(fs.existsSync(landingDir)).toBe(false);
	});

	it("no deben existir archivos .astro en src/components", () => {
		const componentsDir = path.resolve(__dirname, "../src/components");
		const findAstroFiles = (dir: string): string[] => {
			let results: string[] = [];
			const list = fs.readdirSync(dir, { withFileTypes: true });
			for (const file of list) {
				const fullPath = path.join(dir, file.name);
				if (file.isDirectory()) {
					results = results.concat(findAstroFiles(fullPath));
				} else if (file.name.endsWith(".astro")) {
					results.push(fullPath);
				}
			}
			return results;
		};
		const astroFiles = findAstroFiles(componentsDir);
		expect(astroFiles).toHaveLength(0);
	});

	it("convex/clientes no debe exportar repararClientesHuerfanos ni debugAllClientes", () => {
		const exportedKeys = Object.keys(clientesModule);
		expect(exportedKeys).not.toContain("repararClientesHuerfanos");
		expect(exportedKeys).not.toContain("debugAllClientes");
	});

	it("convex/clientes conserva las funciones oficiales requeridas", () => {
		expect(clientesModule).toHaveProperty("fetchClientes");
		expect(clientesModule).toHaveProperty("createCliente");
		expect(clientesModule).toHaveProperty("fetchClienteGlobal");
		expect(clientesModule).toHaveProperty("updateCliente");
		expect(clientesModule).toHaveProperty("deleteCliente");
	});

	it("src/routes/index.tsx no contiene bloques de loader ni splash inalcanzables", () => {
		const indexPath = path.resolve(__dirname, "../src/routes/index.tsx");
		const content = fs.readFileSync(indexPath, "utf-8");

		// Verifica que no exista condición if (loading)
		const loadingMatches = content.match(/if\s*\(\s*loading\s*\)/g);
		expect(loadingMatches).toBeNull();

		// Verifica que no se importe Loader innecesariamente
		expect(content).not.toMatch(/import\s*\{\s*Loader\s*\}\s*from/);
	});
});
