import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { useSessionStore } from "../src/store/useSessionStore";

describe("Tarea 11 (P1 - Fase 2): Limpieza de código muerto, dependencias zombi y tipado estricto", () => {
	describe("src/store/useSessionStore.ts", () => {
		it("useSessionStore solo acepta SessionUser | null y actualiza estado correctamente", () => {
			const store = useSessionStore.getState();
			store.setCurrentUser(null);
			expect(useSessionStore.getState().currentUser).toBeNull();

			store.setCurrentUser({
				id: "usr-123",
				nombre: "Admin",
				email: "admin@test.com",
				rol: "SuperAdmin",
				sucursalId: null,
				pvId: null,
				activo: true,
			});
			expect(useSessionStore.getState().currentUser?.id).toBe("usr-123");

			store.setCurrentUser(null);
			expect(useSessionStore.getState().currentUser).toBeNull();
		});

		it("toggleTheme no manipula directamente document.documentElement.classList", () => {
			const storeContent = fs.readFileSync(
				path.resolve(__dirname, "../src/store/useSessionStore.ts"),
				"utf-8",
			);
			expect(storeContent).not.toMatch(/classList\.(add|remove)/);
			expect(storeContent).not.toMatch(/typeof\s+(user|userOrId)\s*===\s*["']string["']/);
		});
	});

	describe("src/routes/index.tsx", () => {
		it("no contiene el estado muerto 'loading' ni el bloque inalcanzable de splash", () => {
			const indexContent = fs.readFileSync(
				path.resolve(__dirname, "../src/routes/index.tsx"),
				"utf-8",
			);
			expect(indexContent).not.toMatch(/const\s+\[loading,\s*setLoading\]\s*=\s*useState/);
			expect(indexContent).not.toMatch(/void\s+setLoading/);
			expect(indexContent).not.toMatch(/if\s*\(\s*loading\s*\)/);
			expect(indexContent).not.toMatch(/Cargando taller de rotulación\.\.\./);
		});
	});

	describe("Tipado estricto en componentes", () => {
		it("AgendaView.tsx no contiene casteos 'as any[]' y usa Doc<'clientes'>", () => {
			const agendaContent = fs.readFileSync(
				path.resolve(__dirname, "../src/components/AgendaView.tsx"),
				"utf-8",
			);
			expect(agendaContent).not.toMatch(/\(rawClientes\s+as\s+any\[\]\)/);
			expect(agendaContent).toMatch(/Doc<["']clientes["']>/);
			expect(agendaContent).not.toMatch(/as\s+any/);
		});

		it("OrdenesTrabajoView.tsx no contiene 'as any[]' en queries y tipa colecciones limpiamente", () => {
			const ordenesContent = fs.readFileSync(
				path.resolve(__dirname, "../src/components/OrdenesTrabajoView.tsx"),
				"utf-8",
			);
			expect(ordenesContent).not.toMatch(/rawClientes\s*=\s*useQuery[^;]+as\s+any\[\]/);
			expect(ordenesContent).not.toMatch(/rawEmpresas\s*=\s*useQuery[^;]+as\s+any\[\]/);
			expect(ordenesContent).not.toMatch(/clientes:\s*any\[\]/);
			expect(ordenesContent).not.toMatch(/empresas:\s*any\[\]/);
			expect(ordenesContent).not.toMatch(/vehiculos:\s*any\[\]/);
		});

		it("VehiculosView.tsx no contiene 'as unknown as Empresa[]', ni 'as any', y tipa catch con unknown/instanceof Error", () => {
			const vehiculosContent = fs.readFileSync(
				path.resolve(__dirname, "../src/components/VehiculosView.tsx"),
				"utf-8",
			);
			expect(vehiculosContent).not.toMatch(/as\s+unknown\s+as\s+Empresa\[\]/);
			expect(vehiculosContent).not.toMatch(/currentUser\.id\s+as\s+any/);
			expect(vehiculosContent).not.toMatch(/catch\s*\(\s*error:\s*any\s*\)/);
			expect(vehiculosContent).toMatch(/catch\s*\(\s*error:\s*unknown\s*\)/);
			expect(vehiculosContent).toMatch(/error\s+instanceof\s+Error/);
		});
	});
});
