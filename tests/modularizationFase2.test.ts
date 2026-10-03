import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { OrdenesTrabajoView } from "../src/components/OrdenesTrabajoView";
import { OrderMasterList } from "../src/components/ordenes/OrderMasterList";
import { OrderDetailPanel } from "../src/components/ordenes/OrderDetailPanel";
import { OrderCreateModal } from "../src/components/ordenes/OrderCreateModal";
import { VehiculosView } from "../src/components/VehiculosView";
import { VehiculoMasterList } from "../src/components/vehiculos/VehiculoMasterList";
import { VehiculoDetailPanel } from "../src/components/vehiculos/VehiculoDetailPanel";
import { VehiculoFormModal } from "../src/components/vehiculos/VehiculoFormModal";

describe("Tarea 12 (P2 - Fase 2): Modularización de God Components (OrdenesTrabajoView y VehiculosView)", () => {
	const componentsDir = path.resolve(__dirname, "../src/components");

	describe("1. Existencia y exportación de subcomponentes de Órdenes de Trabajo", () => {
		it("OrderMasterList, OrderDetailPanel y OrderCreateModal son componentes funcionales válidos", () => {
			expect(typeof OrderMasterList).toBe("function");
			expect(typeof OrderDetailPanel).toBe("function");
			expect(typeof OrderCreateModal).toBe("function");
			expect(typeof OrdenesTrabajoView).toBe("function");
		});

		it("los archivos existen en src/components/ordenes/", () => {
			const ordenesDir = path.join(componentsDir, "ordenes");
			expect(fs.existsSync(path.join(ordenesDir, "OrderMasterList.tsx"))).toBe(true);
			expect(fs.existsSync(path.join(ordenesDir, "OrderDetailPanel.tsx"))).toBe(true);
			expect(fs.existsSync(path.join(ordenesDir, "OrderCreateModal.tsx"))).toBe(true);
			expect(fs.existsSync(path.join(ordenesDir, "types.ts"))).toBe(true);
		});

		it("OrdenesTrabajoView redujo drásticamente su tamaño (< 500 líneas vs > 1800 original)", () => {
			const filePath = path.join(componentsDir, "OrdenesTrabajoView.tsx");
			const content = fs.readFileSync(filePath, "utf-8");
			const lineCount = content.split("\n").length;

			expect(lineCount).toBeLessThan(500);
			expect(content).toMatch(/import[\s\S]*?OrderMasterList[\s\S]*?from/);
			expect(content).toMatch(/import[\s\S]*?OrderDetailPanel[\s\S]*?from/);
			expect(content).toMatch(/import[\s\S]*?OrderCreateModal[\s\S]*?from/);
		});

		it("OrdenesTrabajoView exporta tipos para retrocompatibilidad", () => {
			const filePath = path.join(componentsDir, "OrdenesTrabajoView.tsx");
			const content = fs.readFileSync(filePath, "utf-8");

			expect(content).toMatch(/export type \{[\s\S]*?ClienteOption/);
			expect(content).toMatch(/EmpresaOption/);
			expect(content).toMatch(/VehiculoOption/);
		});
	});

	describe("2. Existencia y exportación de subcomponentes de Vehículos", () => {
		it("VehiculoMasterList, VehiculoDetailPanel y VehiculoFormModal son componentes funcionales válidos", () => {
			expect(typeof VehiculoMasterList).toBe("function");
			expect(typeof VehiculoDetailPanel).toBe("function");
			expect(typeof VehiculoFormModal).toBe("function");
			expect(typeof VehiculosView).toBe("function");
		});

		it("los archivos existen en src/components/vehiculos/", () => {
			const vehiculosDir = path.join(componentsDir, "vehiculos");
			expect(fs.existsSync(path.join(vehiculosDir, "VehiculoMasterList.tsx"))).toBe(true);
			expect(fs.existsSync(path.join(vehiculosDir, "VehiculoDetailPanel.tsx"))).toBe(true);
			expect(fs.existsSync(path.join(vehiculosDir, "VehiculoFormModal.tsx"))).toBe(true);
			expect(fs.existsSync(path.join(vehiculosDir, "types.ts"))).toBe(true);
		});

		it("VehiculosView redujo drásticamente su tamaño (< 500 líneas vs > 1700 original)", () => {
			const filePath = path.join(componentsDir, "VehiculosView.tsx");
			const content = fs.readFileSync(filePath, "utf-8");
			const lineCount = content.split("\n").length;

			expect(lineCount).toBeLessThan(500);
			expect(content).toMatch(/import[\s\S]*?VehiculoMasterList[\s\S]*?from/);
			expect(content).toMatch(/import[\s\S]*?VehiculoDetailPanel[\s\S]*?from/);
			expect(content).toMatch(/import[\s\S]*?VehiculoFormModal[\s\S]*?from/);
		});

		it("VehiculosView exporta tipos para retrocompatibilidad", () => {
			const filePath = path.join(componentsDir, "VehiculosView.tsx");
			const content = fs.readFileSync(filePath, "utf-8");

			expect(content).toMatch(/export type \{[\s\S]*?VehiculoFormData/);
			expect(content).toMatch(/OwnerDetails/);
		});
	});

	describe("3. Higiene y buenas prácticas en los nuevos componentes", () => {
		it("ninguno de los nuevos componentes genera render bugs con key={crypto.randomUUID()}", () => {
			const files = [
				path.join(componentsDir, "ordenes/OrderMasterList.tsx"),
				path.join(componentsDir, "ordenes/OrderDetailPanel.tsx"),
				path.join(componentsDir, "ordenes/OrderCreateModal.tsx"),
				path.join(componentsDir, "vehiculos/VehiculoMasterList.tsx"),
				path.join(componentsDir, "vehiculos/VehiculoDetailPanel.tsx"),
				path.join(componentsDir, "vehiculos/VehiculoFormModal.tsx"),
			];

			for (const f of files) {
				const content = fs.readFileSync(f, "utf-8");
				expect(content).not.toMatch(/key=\{crypto\.randomUUID\(\)\}/);
			}
		});
	});
});
