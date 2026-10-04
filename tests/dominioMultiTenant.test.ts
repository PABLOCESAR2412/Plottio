import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
	createSucursal,
	deleteEmpresa,
	updateEmpresa,
} from "../convex/organizacion";

type Doc = Record<string, any>;

function createMockCtx(initialData: Record<string, Doc[]>) {
	const store: Record<string, Doc[]> = {};
	for (const [table, docs] of Object.entries(initialData)) {
		store[table] = docs.map((d) => ({ ...d }));
	}

	let idCounter = 3000;

	const db = {
		get: async (id: string) => {
			for (const table of Object.values(store)) {
				const found = table.find((item) => item._id === id);
				if (found) return { ...found };
			}
			return null;
		},
		insert: async (table: string, doc: Doc) => {
			if (!store[table]) store[table] = [];
			const _id = `${table}_${++idCounter}`;
			const newDoc = { _id, ...doc };
			store[table].push(newDoc);
			return _id as any;
		},
		patch: async (id: string, updates: Doc) => {
			for (const table of Object.values(store)) {
				const index = table.findIndex((item) => item._id === id);
				if (index !== -1) {
					table[index] = { ...table[index], ...updates };
					return;
				}
			}
		},
		delete: async (id: string) => {
			for (const table of Object.values(store)) {
				const index = table.findIndex((item) => item._id === id);
				if (index !== -1) {
					table.splice(index, 1);
					return;
				}
			}
		},
		query: (table: string) => {
			let items = [...(store[table] || [])];
			const qb = {
				withIndex: (_name: string, fn?: (q: any) => any) => {
					if (fn) {
						const cond: Record<string, any> = {};
						const q = {
							eq: (field: string, val: any) => {
								cond[field] = val;
								return q;
							},
						};
						fn(q);
						items = items.filter((it) =>
							Object.entries(cond).every(([k, v]) => it[k] === v),
						);
					}
					return qb;
				},
				filter: (fn: (q: any) => any) => {
					items = items.filter((it) => {
						const q = {
							field: (name: string) => ({ _isField: true, name }),
							eq: (left: any, right: any) => {
								const l = left?._isField ? it[left.name] : left;
								const r = right?._isField ? it[right.name] : right;
								return l === r;
							},
						};
						return fn(q);
					});
					return qb;
				},
				order: (_dir: string) => qb,
				take: (n: number) => items.slice(0, n),
				collect: async () => items.map((i) => ({ ...i })),
				first: async () => (items.length > 0 ? { ...items[0] } : null),
			};
			return qb;
		},
	};

	const ctx = {
		db,
		storage: {
			getUrl: async (storageId: string) => `https://storage.mock/${storageId}`,
			generateUploadUrl: async () => "https://upload.mock",
		},
		scheduler: {
			runAfter: async () => {},
		},
	};

	return { ctx, store };
}

describe("Tarea 22 (P2 - Fase 3): Clarificación de Dominio Multi-Tenant (Taller vs Clientes B2B)", () => {
	function setupFixture() {
		return createMockCtx({
			empresas: [
				{
					_id: "emp_taller",
					nombre: "Taller Mecánico Central",
					ruc: "1790011111001",
					razonSocial: "Taller Mecánico Central S.A.",
					activa: true,
				},
				{
					_id: "emp_cliente_b2b",
					nombre: "Cooperativa de Buses TransAndes",
					ruc: "1790022222001",
					razonSocial: "TransAndes Cía. Ltda.",
					activa: true,
				},
				{
					_id: "emp_cliente_b2b_2",
					nombre: "Flota Logística Rápida",
					ruc: "1790033333001",
					razonSocial: "Logística Rápida S.A.",
					activa: true,
				},
			],
			sucursales: [
				{
					_id: "suc_matriz",
					empresaId: "emp_taller",
					nombre: "Sede Norte Matriz",
					direccion: "Av. Principal 100",
					esMatriz: true,
					activa: true,
				},
			],
			puntosVenta: [
				{
					_id: "pv_1",
					sucursalId: "suc_matriz",
					nombre: "Caja 1",
					codigo: "PV01",
					activo: true,
				},
			],
			roles: [
				{ _id: "rol_super", nombre: "SuperAdmin", activo: true },
				{ _id: "rol_asesor", nombre: "Asesor de Servicio", activo: true },
				{ _id: "rol_mecanico", nombre: "Mecánico Operativo", activo: true },
			],
			permisos: [
				{ _id: "perm_crear_c", clave: "crear_cliente", nombre: "Crear Clientes y Cuentas" },
				{ _id: "perm_ver_c", clave: "ver_clientes", nombre: "Ver Clientes" },
			],
			rolePermisos: [
				{ _id: "rp_1", roleId: "rol_asesor", permisoId: "perm_crear_c" },
				{ _id: "rp_2", roleId: "rol_asesor", permisoId: "perm_ver_c" },
			],
			usuarios: [
				{
					_id: "u_superadmin",
					nombre: "Carlos SuperAdmin",
					email: "super@tallermecanico.com",
					empresaId: "emp_taller",
					sucursalId: "suc_matriz",
					activo: true,
				},
				{
					_id: "u_asesor",
					nombre: "Ana Asesora B2B",
					email: "ana@tallermecanico.com",
					empresaId: "emp_taller",
					sucursalId: "suc_matriz",
					activo: true,
				},
				{
					_id: "u_mecanico",
					nombre: "Juan Mecánico",
					email: "juan@tallermecanico.com",
					empresaId: "emp_taller",
					sucursalId: "suc_matriz",
					activo: true,
				},
			],
			usuariosRolesSucursal: [
				{
					_id: "urs_super",
					usuarioId: "u_superadmin",
					roleId: "rol_super",
					sucursalId: "suc_matriz",
					activo: true,
				},
				{
					_id: "urs_asesor",
					usuarioId: "u_asesor",
					roleId: "rol_asesor",
					sucursalId: "suc_matriz",
					activo: true,
				},
				{
					_id: "urs_mecanico",
					usuarioId: "u_mecanico",
					roleId: "rol_mecanico",
					sucursalId: "suc_matriz",
					activo: true,
				},
			],
		});
	}

	describe("1. Backend: Separación de permisos entre Empresa del Taller y Empresa Cliente B2B", () => {
		it("permite a usuario no-SuperAdmin con permiso 'crear_cliente' actualizar una empresa cliente B2B", async () => {
			const { ctx, store } = setupFixture();

			// Asesor actualiza los datos comerciales de la empresa cliente B2B
			await (updateEmpresa as any)._handler(ctx, {
				usuarioId: "u_asesor",
				id: "emp_cliente_b2b",
				nombre: "TransAndes Flotas Express",
				telefono: "+593998877665",
				direccion: "Nueva Terminal Terrestre",
			});

			const updated = store.empresas.find((e) => e._id === "emp_cliente_b2b");
			expect(updated?.nombre).toBe("TransAndes Flotas Express");
			expect(updated?.telefono).toBe("+593998877665");
			expect(updated?.direccion).toBe("Nueva Terminal Terrestre");
		});

		it("permite a usuario no-SuperAdmin con permiso 'crear_cliente' desactivar (archivar) una empresa cliente B2B", async () => {
			const { ctx, store } = setupFixture();

			// Asesor desactiva la empresa cliente B2B sin requerir SuperAdmin
			const result = await (deleteEmpresa as any)._handler(ctx, {
				usuarioId: "u_asesor",
				id: "emp_cliente_b2b_2",
			});

			expect(result).toEqual({ success: true, archived: true });

			const archived = store.empresas.find((e) => e._id === "emp_cliente_b2b_2");
			expect(archived?.activa).toBe(false);
		});

		it("BLOQUEA terminantemente que un usuario no-SuperAdmin actualice la empresa matriz del taller", async () => {
			const { ctx } = setupFixture();

			// Asesor intenta modificar la empresa matriz del taller (empresaId === args.id)
			await expect(
				(updateEmpresa as any)._handler(ctx, {
					usuarioId: "u_asesor",
					id: "emp_taller",
					nombre: "Taller Modificado Ilegalmente",
				}),
			).rejects.toThrow("Solo SuperAdmin puede actualizar la empresa del taller");
		});

		it("BLOQUEA terminantemente que un usuario no-SuperAdmin desactive la empresa matriz del taller", async () => {
			const { ctx } = setupFixture();

			// Asesor intenta desactivar la empresa matriz del taller (empresaId === args.id)
			await expect(
				(deleteEmpresa as any)._handler(ctx, {
					usuarioId: "u_asesor",
					id: "emp_taller",
				}),
			).rejects.toThrow("Solo SuperAdmin puede desactivar la empresa del taller");
		});

		it("BLOQUEA a usuarios sin permiso 'crear_cliente' ni SuperAdmin de actualizar o desactivar empresas clientes B2B", async () => {
			const { ctx } = setupFixture();

			// Mecánico sin permiso intenta actualizar empresa cliente B2B
			await expect(
				(updateEmpresa as any)._handler(ctx, {
					usuarioId: "u_mecanico",
					id: "emp_cliente_b2b",
					nombre: "Intento Mecanico",
				}),
			).rejects.toThrow(
				"Solo SuperAdmin o usuarios con permiso 'crear_cliente' pueden actualizar empresas clientes",
			);

			// Mecánico sin permiso intenta desactivar empresa cliente B2B
			await expect(
				(deleteEmpresa as any)._handler(ctx, {
					usuarioId: "u_mecanico",
					id: "emp_cliente_b2b",
				}),
			).rejects.toThrow(
				"Solo SuperAdmin o usuarios con permiso 'crear_cliente' pueden desactivar empresas clientes",
			);
		});

		it("SuperAdmin mantiene facultades completas sobre la empresa del taller y clientes B2B", async () => {
			const { ctx, store } = setupFixture();

			// SuperAdmin actualiza la empresa del taller
			await (updateEmpresa as any)._handler(ctx, {
				usuarioId: "u_superadmin",
				id: "emp_taller",
				nombre: "Taller Plottio Central",
			});
			const taller = store.empresas.find((e) => e._id === "emp_taller");
			expect(taller?.nombre).toBe("Taller Plottio Central");

			// SuperAdmin actualiza empresa cliente B2B
			await (updateEmpresa as any)._handler(ctx, {
				usuarioId: "u_superadmin",
				id: "emp_cliente_b2b",
				nombre: "TransAndes Corporativo",
			});
			const clienteB2b = store.empresas.find((e) => e._id === "emp_cliente_b2b");
			expect(clienteB2b?.nombre).toBe("TransAndes Corporativo");

			// SuperAdmin desactiva empresa cliente B2B
			const res = await (deleteEmpresa as any)._handler(ctx, {
				usuarioId: "u_superadmin",
				id: "emp_cliente_b2b",
			});
			expect(res.archived).toBe(true);
		});

		it("protege que las mutaciones de sucursales y puntos de venta pertenezcan a la estructura interna del taller", async () => {
			const { ctx } = setupFixture();

			// Asesor crea sucursal en su propio taller
			const nuevaSucursalId = await (createSucursal as any)._handler(ctx, {
				usuarioId: "u_asesor",
				empresaId: "emp_taller",
				nombre: "Sede Sur Taller",
				direccion: "Av. Sur 200",
				esMatriz: false,
			});
			expect(nuevaSucursalId).toBeTruthy();

			// Bloquea crear sucursal asignada a una empresa que no sea la del usuario
			await expect(
				(createSucursal as any)._handler(ctx, {
					usuarioId: "u_asesor",
					empresaId: "emp_cliente_b2b",
					nombre: "Sucursal Falsa en Cliente B2B",
					direccion: "Calle Falsa 123",
					esMatriz: false,
				}),
			).rejects.toThrow("No tiene permisos para crear sucursales en otra empresa");
		});
	});

	describe("2. Frontend: Clarificación y separación conceptual de UI", () => {
		const empresasViewPath = resolve(__dirname, "../src/components/EmpresasView.tsx");
		const sucursalesAdminPath = resolve(__dirname, "../src/components/SucursalesAdmin.tsx");

		const empresasViewCode = readFileSync(empresasViewPath, "utf-8");
		const sucursalesAdminCode = readFileSync(sucursalesAdminPath, "utf-8");

		it("EmpresasView.tsx expresa con claridad que se trata de 'Empresas Clientes & Flotas Corporativas (B2B)'", () => {
			expect(empresasViewCode).toContain("Empresas Clientes & Flotas Corporativas (B2B)");
			expect(empresasViewCode).toContain("Clientes B2B");
			expect(empresasViewCode).toContain(
				"Gestión de cuentas comerciales y flotas vehiculares atendidas en el",
			);
		});

		it("EmpresasView.tsx ofrece botones claros para operaciones comerciales B2B", () => {
			expect(empresasViewCode).toContain("Nueva Empresa Cliente");
			expect(empresasViewCode).toContain("Editar Empresa Cliente");
			expect(empresasViewCode).toContain("Desactivar Empresa Cliente");
			expect(empresasViewCode).toContain("¿Desactivar Empresa Cliente?");
		});

		it("SucursalesAdmin.tsx marca los componentes de sucursales como deprecados para la migración Single-Org", () => {
			expect(sucursalesAdminCode).toContain("@deprecated");
			expect(sucursalesAdminCode).toContain("Single-Org");
		});

		it("garantiza la separación conceptual: EmpresasView no gestiona sucursales internas del taller y se enfoca en flotas", () => {
			// En EmpresasView se habla de flota vehicular, RUC comercial y vehículos
			expect(empresasViewCode).toContain("Vehículos Activos");
			expect(empresasViewCode).toContain("En Mantenimiento");
			expect(empresasViewCode).toContain("Inversión Total");
		});
	});
});
