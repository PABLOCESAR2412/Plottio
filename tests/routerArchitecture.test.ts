import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { Route, RootErrorFallback, convexClient, queryClient } from "../src/routes/__root";

describe("Tarea 7: Arquitectura frontend, TanStack Router y Error Boundaries", () => {
	describe("1. Error Boundary e Inversión de Dependencias en __root.tsx", () => {
		it("__root.tsx debe definir y asignar errorComponent a la ruta raíz", () => {
			expect(Route.options).toHaveProperty("errorComponent");
			expect(Route.options.errorComponent).toBe(RootErrorFallback);
		});

		it("debe exportar singletons de convexClient y queryClient", () => {
			expect(convexClient).toBeDefined();
			expect(queryClient).toBeDefined();
		});

		it("no debe contener la URL de Convex hardcodeada (useful-koala-184)", () => {
			const rootPath = path.resolve(__dirname, "../src/routes/__root.tsx");
			const content = fs.readFileSync(rootPath, "utf-8");

			expect(content).not.toContain("useful-koala-184.convex.cloud");
			expect(content).toContain('import.meta.env.VITE_CONVEX_URL || ""');
			expect(content).toContain("console.warn");
		});

		it("RootErrorFallback debe ser un componente funcional exportado", () => {
			expect(typeof RootErrorFallback).toBe("function");
		});
	});

	describe("2. Erradicación de loading muerto en src/routes/index.tsx", () => {
		it("no debe contener setTimeout con 1500ms ni bloquear el TTI", () => {
			const indexPath = path.resolve(__dirname, "../src/routes/index.tsx");
			const content = fs.readFileSync(indexPath, "utf-8");

			expect(content).not.toMatch(/setTimeout\s*\(\s*\(\)\s*=>\s*setLoading\s*\(\s*false\s*\)\s*,\s*1500\s*\)/);
			expect(content).not.toContain("1500");
		});

		it("el estado muerto loading y su splash screen deben estar eliminados", () => {
			const indexPath = path.resolve(__dirname, "../src/routes/index.tsx");
			const content = fs.readFileSync(indexPath, "utf-8");

			expect(content).not.toMatch(/const\s*\[\s*loading\s*,\s*setLoading\s*\]/);
			expect(content).not.toMatch(/if\s*\(\s*loading\s*\)/);
		});
	});

	describe("3. Fechas dinámicas en la Agenda (AgendaView.tsx)", () => {
		it("no debe contener fechas fijas 2026-06-03 ni año/mes hardcodeados", () => {
			const agendaPath = path.resolve(__dirname, "../src/components/AgendaView.tsx");
			const content = fs.readFileSync(agendaPath, "utf-8");

			expect(content).not.toContain("2026-06-03");
			expect(content).not.toContain("2026");
			expect(content).not.toMatch(/useState\s*\(\s*2026\s*\)/);
			expect(content).not.toMatch(/useState\s*\(\s*5\s*\)/);
		});

		it("debe calcular año, mes y día actual dinámicamente con Date", () => {
			const agendaPath = path.resolve(__dirname, "../src/components/AgendaView.tsx");
			const content = fs.readFileSync(agendaPath, "utf-8");

			expect(content).toContain("new Date()");
			expect(content).toContain("getFullYear()");
			expect(content).toContain("getMonth()");
			expect(content).toContain('toISOString().split("T")[0]');
		});
	});

	describe("4. Modal de edición en el Catálogo de Servicios (CatalogoView.tsx)", () => {
		it("debe importar y usar la mutación updateServicio", () => {
			const catalogoPath = path.resolve(__dirname, "../src/components/CatalogoView.tsx");
			const content = fs.readFileSync(catalogoPath, "utf-8");

			expect(content).toContain("api.catalogoServicios.updateServicio");
			expect(content).toContain("updateServicio(");
		});

		it("debe renderizar el modal de edición para editingServicio", () => {
			const catalogoPath = path.resolve(__dirname, "../src/components/CatalogoView.tsx");
			const content = fs.readFileSync(catalogoPath, "utf-8");

			expect(content).toContain("showEditModal && editingServicio");
			expect(content).toContain("Editar Servicio");
			expect(content).toContain("Guardar Cambios");
		});

		it("debe permitir editar campos de nombre, descripción, categoría y precio base", () => {
			const catalogoPath = path.resolve(__dirname, "../src/components/CatalogoView.tsx");
			const content = fs.readFileSync(catalogoPath, "utf-8");

			expect(content).toContain("edit-servicio-nombre");
			expect(content).toContain("edit-servicio-descripcion");
			expect(content).toContain("edit-servicio-categoria");
			expect(content).toContain("edit-servicio-precio");
		});
	});
});
