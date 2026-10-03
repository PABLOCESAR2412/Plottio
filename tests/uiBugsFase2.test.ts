import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildWhatsAppUrl } from "../src/components/CotizacionesView";

describe("Tarea 10 (P1 - Fase 2): Corrección de bugs de render, inyección de URLs y colisiones de IDs", () => {
	describe("1. Keys de React estables en src/components/", () => {
		const componentsDir = path.resolve(__dirname, "../src/components");

		const getAllFiles = (dir: string): string[] => {
			let results: string[] = [];
			const list = fs.readdirSync(dir, { withFileTypes: true });
			for (const file of list) {
				const fullPath = path.join(dir, file.name);
				if (file.isDirectory()) {
					results = results.concat(getAllFiles(fullPath));
				} else if (file.name.endsWith(".tsx") || file.name.endsWith(".jsx")) {
					results.push(fullPath);
				}
			}
			return results;
		};

		it("ningún componente en src/components/ debe usar key={crypto.randomUUID()}", () => {
			const files = getAllFiles(componentsDir);
			const offendingFiles: string[] = [];

			for (const filePath of files) {
				const content = fs.readFileSync(filePath, "utf-8");
				if (/key=\{crypto\.randomUUID\(\)\}/.test(content)) {
					offendingFiles.push(path.relative(componentsDir, filePath));
				}
			}

			expect(
				offendingFiles,
				`Los siguientes componentes generan render bugs con key={crypto.randomUUID()}: ${offendingFiles.join(", ")}`,
			).toHaveLength(0);
		});

		it("KitsFlotaView, LotesProduccionView y VehiculosView no deben regenerar UUIDs en render loops", () => {
			const targets = ["KitsFlotaView.tsx", "LotesProduccionView.tsx", "VehiculosView.tsx"];
			for (const target of targets) {
				const filePath = path.join(componentsDir, target);
				expect(fs.existsSync(filePath), `${target} debe existir`).toBe(true);
				const content = fs.readFileSync(filePath, "utf-8");
				expect(content).not.toMatch(/key=\{crypto\.randomUUID\(\)\}/);
			}
		});
	});

	describe("2. Sanitización de URL de WhatsApp y prevención de URL Injection", () => {
		it("buildWhatsAppUrl codifica correctamente caracteres especiales, espacios y saltos de línea con encodeURIComponent", () => {
			const cotMock = {
				_id: "cot-12345",
				clienteNombre: "Juan Pérez & Asociados",
				clienteTelefono: "+52 (55) 1234-5678",
				vehiculoTipo: "Camioneta 4x4 / Pick-up #9",
				items: [
					{
						descripcion: "Vinilo premium & corte especial > 100cm",
						cantidad: 2,
						precioUnitario: 150,
					},
				],
				total: 300,
				estado: "Pendiente",
				fecha: "2026-10-03",
			};

			const url = buildWhatsAppUrl(cotMock as any);

			// El teléfono debe estar limpio
			expect(url).toContain("https://wa.me/+525512345678?text=");

			// La URL no debe tener caracteres no escapados que rompan el query string
			const queryString = url.split("?text=")[1];
			expect(queryString).toBeDefined();

			// No debe tener espacios crudos, saltos de línea crudos, o ampersands sin codificar
			expect(queryString).not.toContain(" ");
			expect(queryString).not.toContain("\n");
			expect(queryString).not.toContain("& Asociados");
			expect(queryString).toContain(encodeURIComponent("Juan Pérez & Asociados"));
			expect(queryString).toContain(encodeURIComponent("Camioneta 4x4 / Pick-up #9"));
			expect(queryString).toContain(encodeURIComponent("Vinilo premium & corte especial > 100cm"));
		});

		it("CotizacionesView.tsx utiliza buildWhatsAppUrl y window.open con noopener,noreferrer", () => {
			const cotPath = path.resolve(__dirname, "../src/components/CotizacionesView.tsx");
			const content = fs.readFileSync(cotPath, "utf-8");

			expect(content).toContain('window.open(url, "_blank", "noopener,noreferrer")');
			expect(content).toContain("buildWhatsAppUrl(cot)");
		});
	});

	describe("3. Manejo de errores en mutaciones de OrdenesTrabajoView.tsx", () => {
		it("no contiene catch silenciosos en la eliminación y adición de tareas", () => {
			const ordenesPath = path.resolve(__dirname, "../src/components/OrdenesTrabajoView.tsx");
			const content = fs.readFileSync(ordenesPath, "utf-8");

			expect(content).not.toMatch(/catch\s*\(\s*err\s*\)\s*\{\s*console\.error\(err\);\s*\}/);
			expect(content).toContain('toast.error("Error al actualizar la orden", {');
		});

		it("mueve form.reset() adentro del bloque try al agregar tareas para evitar pérdida de datos si falla la red", () => {
			const ordenesPath = path.resolve(__dirname, "../src/components/OrdenesTrabajoView.tsx");
			const content = fs.readFileSync(ordenesPath, "utf-8");

			// Verifica que form.reset() esté dentro del try y antes del catch
			const tryBlockRegex = /try\s*\{[\s\S]*?await updateOrdenMut\([\s\S]*?\);[\s\S]*?form\.reset\(\);[\s\S]*?\}\s*catch\s*\(err\)/;
			expect(tryBlockRegex.test(content)).toBe(true);
		});
	});

	describe("4. Prevención de colisiones de IDs en backend (UUID vs Date.now)", () => {
		it("convex/vehiculos.ts genera IDs de servicios con crypto.randomUUID() en lugar de Date.now()", () => {
			const vehiculosPath = path.resolve(__dirname, "../convex/vehiculos.ts");
			const content = fs.readFileSync(vehiculosPath, "utf-8");

			expect(content).toContain('"srv-" + crypto.randomUUID()');
			expect(content).not.toContain('"srv-" + Date.now().toString()');
		});

		it("convex/bugs.ts genera IDs de comentarios con crypto.randomUUID() en lugar de Date.now()", () => {
			const bugsPath = path.resolve(__dirname, "../convex/bugs.ts");
			const content = fs.readFileSync(bugsPath, "utf-8");

			expect(content).toContain("`cmnt-${crypto.randomUUID()}`");
			expect(content).not.toContain("`cmnt-${Date.now()}`");
		});
	});
});
