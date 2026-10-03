import { describe, expect, it } from "vitest";
import { checkPermission, requirePermission, getCurrentUserContext } from "../convex/auth";
import {
	getRoles,
	createRole,
	updateRole,
	deleteRole,
	assignRoleToUsuario,
	revokeRoleFromUsuario,
} from "../convex/roles";
import {
	createEmpresa,
	updateEmpresa,
	deleteEmpresa,
	createSucursal,
	updateSucursal,
	deleteSucursal,
	createPuntoVenta,
	updatePuntoVenta,
	deletePuntoVenta,
} from "../convex/organizacion";
import { updateCita, deleteCita } from "../convex/citas";
import { marcarLeida } from "../convex/notificaciones";
import { registrarAccion } from "../convex/auditoria";

type Doc = Record<string, any>;

function createMockCtx(initialData: Record<string, Doc[]>) {
	const store: Record<string, Doc[]> = {};
	for (const [table, docs] of Object.entries(initialData)) {
		store[table] = docs.map((d) => ({ ...d }));
	}

	let idCounter = 2000;

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

	return { ctx: ctx as any, store };
}

describe("RBAC: Unificación de nombres canónicos y funciones de permisos", () => {
	it("reconoce SuperAdmin como rol todopoderoso sin permisos explícitos", async () => {
		const { ctx } = createMockCtx({
			usuarios: [
				{
					_id: "u_super",
					nombre: "Super Admin",
					email: "super@admin.com",
					empresaId: "emp_1",
					sucursalId: "suc_1",
					activo: true,
				},
			],
			empresas: [{ _id: "emp_1", nombre: "Empresa 1", activa: true }],
			sucursales: [{ _id: "suc_1", nombre: "Sucursal 1", empresaId: "emp_1", activa: true }],
			roles: [{ _id: "rol_super", nombre: "SuperAdmin", activo: true }],
			usuariosRolesSucursal: [
				{
					_id: "urs_1",
					usuarioId: "u_super",
					roleId: "rol_super",
					sucursalId: "suc_1",
					activo: true,
				},
			],
			permisos: [],
			rolePermisos: [],
		});

		const context = await getCurrentUserContext(ctx, "u_super" as any);
		expect(context.roles.some((r) => r.roleNombre === "SuperAdmin")).toBe(true);

		const tienePermiso = await checkPermission(ctx, "u_super" as any, "accion_inventada");
		expect(tienePermiso).toBe(true);

		await expect(
			requirePermission(ctx, "u_super" as any, "accion_inventada"),
		).resolves.toBeUndefined();
	});

	it("valida permisos granulares en usuarios regulares y bloquea sin permiso", async () => {
		const { ctx } = createMockCtx({
			usuarios: [
				{
					_id: "u_reg",
					nombre: "Operador",
					email: "op@taller.com",
					empresaId: "emp_1",
					sucursalId: "suc_1",
					activo: true,
				},
			],
			empresas: [{ _id: "emp_1", nombre: "Empresa 1", activa: true }],
			sucursales: [{ _id: "suc_1", nombre: "Sucursal 1", empresaId: "emp_1", activa: true }],
			roles: [{ _id: "rol_op", nombre: "Cotizador", activo: true }],
			permisos: [
				{ _id: "perm_1", clave: "ver_cotizaciones", nombre: "Ver Cotizaciones" },
			],
			rolePermisos: [{ _id: "rp_1", roleId: "rol_op", permisoId: "perm_1" }],
			usuariosRolesSucursal: [
				{
					_id: "urs_op",
					usuarioId: "u_reg",
					roleId: "rol_op",
					sucursalId: "suc_1",
					activo: true,
				},
			],
		});

		// Permiso concedido
		expect(await checkPermission(ctx, "u_reg" as any, "ver_cotizaciones")).toBe(true);
		await expect(
			requirePermission(ctx, "u_reg" as any, "ver_cotizaciones"),
		).resolves.toBeUndefined();

		// Permiso denegado
		expect(await checkPermission(ctx, "u_reg" as any, "crear_usuarios")).toBe(false);
		await expect(
			requirePermission(ctx, "u_reg" as any, "crear_usuarios"),
		).rejects.toThrow(/\[403 Forbidden\]/);
	});

	it("respeta el alcance (scope) por sucursal salvo con ver_todas_sucursales", async () => {
		const { ctx } = createMockCtx({
			usuarios: [
				{
					_id: "u_scoped",
					nombre: "Gerente Sucursal 1",
					email: "g1@taller.com",
					empresaId: "emp_1",
					sucursalId: "suc_1",
					activo: true,
				},
			],
			empresas: [{ _id: "emp_1", nombre: "Empresa 1", activa: true }],
			sucursales: [
				{ _id: "suc_1", nombre: "Sucursal 1", empresaId: "emp_1", activa: true },
				{ _id: "suc_2", nombre: "Sucursal 2", empresaId: "emp_1", activa: true },
			],
			roles: [{ _id: "rol_g1", nombre: "Gerente Local", activo: true }],
			permisos: [{ _id: "p_orden", clave: "editar_orden", nombre: "Editar Orden" }],
			rolePermisos: [{ _id: "rp_g1", roleId: "rol_g1", permisoId: "p_orden" }],
			usuariosRolesSucursal: [
				{
					_id: "urs_g1",
					usuarioId: "u_scoped",
					roleId: "rol_g1",
					sucursalId: "suc_1",
					activo: true,
				},
			],
		});

		// En sucursal 1 tiene permiso
		expect(
			await checkPermission(ctx, "u_scoped" as any, "editar_orden", "suc_1" as any),
		).toBe(true);

		// En sucursal 2 NO tiene permiso
		expect(
			await checkPermission(ctx, "u_scoped" as any, "editar_orden", "suc_2" as any),
		).toBe(false);
	});
});

describe("RBAC: Control de acceso en convex/roles.ts", () => {
	function setupRolesFixture() {
		return createMockCtx({
			usuarios: [
				{
					_id: "u_super",
					nombre: "Super Admin",
					empresaId: "emp_1",
					sucursalId: "suc_1",
					activo: true,
				},
				{
					_id: "u_admin_emp1",
					nombre: "Admin Empresa 1",
					empresaId: "emp_1",
					sucursalId: "suc_1",
					activo: true,
				},
				{
					_id: "u_sin_permiso",
					nombre: "Operador Simple",
					empresaId: "emp_1",
					sucursalId: "suc_1",
					activo: true,
				},
			],
			empresas: [
				{ _id: "emp_1", nombre: "Empresa 1", activa: true },
				{ _id: "emp_2", nombre: "Empresa 2", activa: true },
			],
			sucursales: [
				{ _id: "suc_1", nombre: "Sucursal 1", empresaId: "emp_1", activa: true },
				{ _id: "suc_2", nombre: "Sucursal 2", empresaId: "emp_2", activa: true },
			],
			permisos: [
				{ _id: "p_crear_u", clave: "crear_usuarios", nombre: "Crear Usuarios" },
			],
			roles: [
				{ _id: "r_super", nombre: "SuperAdmin", activo: true },
				{ _id: "r_admin1", nombre: "Admin Local", empresaId: "emp_1", activo: true },
				{ _id: "r_emp2", nombre: "Rol Privado Emp 2", empresaId: "emp_2", activo: true },
				{ _id: "r_global", nombre: "Rol Global", empresaId: undefined, activo: true },
			],
			rolePermisos: [
				{ _id: "rp_admin", roleId: "r_admin1", permisoId: "p_crear_u" },
			],
			usuariosRolesSucursal: [
				{ _id: "urs_s", usuarioId: "u_super", roleId: "r_super", sucursalId: "suc_1", activo: true },
				{ _id: "urs_a1", usuarioId: "u_admin_emp1", roleId: "r_admin1", sucursalId: "suc_1", activo: true },
			],
		});
	}

	it("getRoles filtra por empresa para usuarios regulares y muestra todo para SuperAdmin", async () => {
		const { ctx } = setupRolesFixture();

		// SuperAdmin ve todos los roles
		const rolesSuper = await (getRoles as any)._handler(ctx, {
			usuarioId: "u_super",
		});
		expect(rolesSuper.map((r: any) => r._id)).toContain("r_admin1");
		expect(rolesSuper.map((r: any) => r._id)).toContain("r_emp2");
		expect(rolesSuper.map((r: any) => r._id)).toContain("r_global");

		// Admin de Empresa 1 sólo ve roles de su empresa y globales
		const rolesAdmin1 = await (getRoles as any)._handler(ctx, {
			usuarioId: "u_admin_emp1",
		});
		expect(rolesAdmin1.map((r: any) => r._id)).toContain("r_admin1");
		expect(rolesAdmin1.map((r: any) => r._id)).toContain("r_global");
		expect(rolesAdmin1.map((r: any) => r._id)).not.toContain("r_emp2");
	});

	it("createRole: exige crear_usuarios y restringe a la empresa del usuario salvo SuperAdmin", async () => {
		const { ctx, store } = setupRolesFixture();

		// Usuario sin permisos falla
		await expect(
			(createRole as any)._handler(ctx, {
				usuarioId: "u_sin_permiso",
				nombre: "Nuevo Rol",
				permisosIds: [],
			}),
		).rejects.toThrow(/\[403 Forbidden\]/);

		// Admin de Empresa 1 intentando crear rol para Empresa 2 es rechazado
		await expect(
			(createRole as any)._handler(ctx, {
				usuarioId: "u_admin_emp1",
				empresaId: "emp_2",
				nombre: "Hack Rol",
				permisosIds: [],
			}),
		).rejects.toThrow("No tiene permisos para crear roles en otra empresa");

		// Admin de Empresa 1 crea rol para su empresa con éxito
		const nuevoRolId = await (createRole as any)._handler(ctx, {
			usuarioId: "u_admin_emp1",
			nombre: "Técnico Empresa 1",
			permisosIds: ["p_crear_u"],
		});
		expect(nuevoRolId).toBeTruthy();
		const doc = store.roles.find((r) => r._id === nuevoRolId);
		expect(doc?.empresaId).toBe("emp_1");
	});

	it("updateRole & deleteRole: impide modificar roles de otra empresa o del sistema", async () => {
		const { ctx } = setupRolesFixture();

		// Admin de Empresa 1 no puede modificar rol de Empresa 2
		await expect(
			(updateRole as any)._handler(ctx, {
				usuarioId: "u_admin_emp1",
				roleId: "r_emp2",
				nombre: "Cambio Malicioso",
				permisosIds: [],
			}),
		).rejects.toThrow(/No tiene permisos para modificar roles de otra empresa/);

		// Admin de Empresa 1 no puede eliminar rol del sistema (empresaId nulo)
		await expect(
			(deleteRole as any)._handler(ctx, {
				usuarioId: "u_admin_emp1",
				roleId: "r_global",
			}),
		).rejects.toThrow(/No tiene permisos para eliminar roles de otra empresa/);
	});

	it("deleteRole: impide eliminar roles con usuarios asignados activos", async () => {
		const { ctx } = setupRolesFixture();

		// r_admin1 tiene a u_admin_emp1 asignado y activo
		await expect(
			(deleteRole as any)._handler(ctx, {
				usuarioId: "u_super",
				roleId: "r_admin1",
			}),
		).rejects.toThrow(/el rol tiene 1 usuario\(s\) asignado\(s\)/);
	});

	it("assignRoleToUsuario y revokeRoleFromUsuario: aíslan asignaciones por empresa", async () => {
		const { ctx } = setupRolesFixture();

		// Intento de asignar rol de Empresa 2 por parte de Admin de Empresa 1
		await expect(
			(assignRoleToUsuario as any)._handler(ctx, {
				usuarioId: "u_admin_emp1",
				targetUsuarioId: "u_sin_permiso",
				roleId: "r_emp2",
				sucursalId: "suc_1",
			}),
		).rejects.toThrow(/No tiene permisos para asignar roles de otra empresa/);

		// Revocar asignación vinculada a otra empresa
		const fixture2 = setupRolesFixture();
		fixture2.store.usuariosRolesSucursal.push({
			_id: "urs_emp2",
			usuarioId: "u_emp2",
			roleId: "r_emp2",
			sucursalId: "suc_2",
			activo: true,
		});

		await expect(
			(revokeRoleFromUsuario as any)._handler(fixture2.ctx, {
				usuarioId: "u_admin_emp1",
				asignacionId: "urs_emp2",
			}),
		).rejects.toThrow(/No tiene permisos para revocar roles de otra empresa/);
	});
});

describe("RBAC: Protección en convex/organizacion.ts", () => {
	function setupOrgFixture() {
		return createMockCtx({
			usuarios: [
				{
					_id: "u_super",
					nombre: "Super Admin",
					empresaId: "emp_1",
					sucursalId: "suc_1",
					activo: true,
				},
				{
					_id: "u_regular",
					nombre: "Gerente Empresa 1",
					empresaId: "emp_1",
					sucursalId: "suc_1",
					activo: true,
				},
			],
			empresas: [
				{ _id: "emp_1", nombre: "Empresa 1", ruc: "1790011111001", activa: true },
				{ _id: "emp_2", nombre: "Empresa 2", ruc: "1790022222001", activa: true },
			],
			sucursales: [
				{ _id: "suc_1", nombre: "Sucursal 1", empresaId: "emp_1", activa: true },
				{ _id: "suc_2", nombre: "Sucursal 2", empresaId: "emp_2", activa: true },
			],
			puntosVenta: [
				{ _id: "pv_1", nombre: "PV 1", sucursalId: "suc_1", codigo: "PV1", activo: true },
				{ _id: "pv_2", nombre: "PV 2", sucursalId: "suc_2", codigo: "PV2", activo: true },
			],
			roles: [
				{ _id: "r_super", nombre: "SuperAdmin", activo: true },
				{ _id: "r_gerente", nombre: "Gerente", empresaId: "emp_1", activo: true },
			],
			usuariosRolesSucursal: [
				{ _id: "urs_s", usuarioId: "u_super", roleId: "r_super", sucursalId: "suc_1", activo: true },
				{ _id: "urs_g", usuarioId: "u_regular", roleId: "r_gerente", sucursalId: "suc_1", activo: true },
			],
		});
	}

	it("createEmpresa, updateEmpresa y deleteEmpresa sólo permitidos para SuperAdmin", async () => {
		const { ctx } = setupOrgFixture();

		// Usuario regular falla al crear empresa
		await expect(
			(createEmpresa as any)._handler(ctx, {
				usuarioId: "u_regular",
				nombre: "Nueva Co",
				ruc: "0999999999001",
				razonSocial: "Nueva Co S.A.",
			}),
		).rejects.toThrow("Solo SuperAdmin puede crear empresas");

		// Usuario regular falla al actualizar empresa
		await expect(
			(updateEmpresa as any)._handler(ctx, {
				usuarioId: "u_regular",
				id: "emp_1",
				nombre: "Empresa Modificada",
			}),
		).rejects.toThrow("Solo SuperAdmin puede actualizar empresas");

		// Usuario regular falla al eliminar empresa
		await expect(
			(deleteEmpresa as any)._handler(ctx, {
				usuarioId: "u_regular",
				id: "emp_1",
			}),
		).rejects.toThrow("Solo SuperAdmin puede desactivar empresas");

		// SuperAdmin puede crear empresa
		const nuevaId = await (createEmpresa as any)._handler(ctx, {
			usuarioId: "u_super",
			nombre: "Nueva Co",
			ruc: "0999999999001",
			razonSocial: "Nueva Co S.A.",
		});
		expect(nuevaId).toBeTruthy();
	});

	it("sucursales y puntos de venta aíslan permisos por empresa", async () => {
		const { ctx } = setupOrgFixture();

		// Usuario de Empresa 1 no puede crear sucursal en Empresa 2
		await expect(
			(createSucursal as any)._handler(ctx, {
				usuarioId: "u_regular",
				empresaId: "emp_2",
				nombre: "Sucursal Infiltrada",
				direccion: "Calle 123",
				esMatriz: false,
			}),
		).rejects.toThrow("No tiene permisos para crear sucursales en otra empresa");

		// Usuario de Empresa 1 no puede modificar sucursal de Empresa 2
		await expect(
			(updateSucursal as any)._handler(ctx, {
				usuarioId: "u_regular",
				id: "suc_2",
				nombre: "Cambio no autorizado",
			}),
		).rejects.toThrow("No tiene permisos para modificar sucursales de otra empresa");

		// Usuario de Empresa 1 no puede eliminar sucursal de Empresa 2
		await expect(
			(deleteSucursal as any)._handler(ctx, {
				usuarioId: "u_regular",
				id: "suc_2",
			}),
		).rejects.toThrow("No tiene permisos para eliminar sucursales de otra empresa");

		// Usuario de Empresa 1 no puede crear punto de venta en sucursal de Empresa 2
		await expect(
			(createPuntoVenta as any)._handler(ctx, {
				usuarioId: "u_regular",
				sucursalId: "suc_2",
				nombre: "PV Infiltrado",
				codigo: "PVI",
			}),
		).rejects.toThrow("No tiene permisos para crear puntos de venta en otra empresa");

		// Usuario de Empresa 1 no puede modificar punto de venta de Empresa 2
		await expect(
			(updatePuntoVenta as any)._handler(ctx, {
				usuarioId: "u_regular",
				id: "pv_2",
				nombre: "PV Modificado",
			}),
		).rejects.toThrow("No tiene permisos para modificar puntos de venta de otra empresa");

		// Usuario de Empresa 1 no puede eliminar punto de venta de Empresa 2
		await expect(
			(deletePuntoVenta as any)._handler(ctx, {
				usuarioId: "u_regular",
				id: "pv_2",
			}),
		).rejects.toThrow("No tiene permisos para eliminar puntos de venta de otra empresa");
	});
});

describe("RBAC: Aislamiento en convex/citas.ts", () => {
	function setupCitasFixture() {
		return createMockCtx({
			usuarios: [
				{
					_id: "u_super",
					nombre: "Super Admin",
					empresaId: "emp_1",
					sucursalId: "suc_1",
					activo: true,
				},
				{
					_id: "u_emp1",
					nombre: "Operador Empresa 1",
					empresaId: "emp_1",
					sucursalId: "suc_1",
					activo: true,
				},
				{
					_id: "u_emp2",
					nombre: "Operador Empresa 2",
					empresaId: "emp_2",
					sucursalId: "suc_2",
					activo: true,
				},
			],
			empresas: [
				{ _id: "emp_1", nombre: "Empresa 1", activa: true },
				{ _id: "emp_2", nombre: "Empresa 2", activa: true },
			],
			sucursales: [
				{ _id: "suc_1", nombre: "Sucursal 1", empresaId: "emp_1", activa: true },
				{ _id: "suc_2", nombre: "Sucursal 2", empresaId: "emp_2", activa: true },
			],
			roles: [
				{ _id: "r_super", nombre: "SuperAdmin", activo: true },
				{ _id: "r_op", nombre: "Operador", activo: true },
			],
			usuariosRolesSucursal: [
				{ _id: "urs_s", usuarioId: "u_super", roleId: "r_super", sucursalId: "suc_1", activo: true },
				{ _id: "urs_1", usuarioId: "u_emp1", roleId: "r_op", sucursalId: "suc_1", activo: true },
				{ _id: "urs_2", usuarioId: "u_emp2", roleId: "r_op", sucursalId: "suc_2", activo: true },
			],
			citas: [
				{
					_id: "cita_emp1",
					clienteNombre: "Cliente A",
					empresaId: "emp_1",
					sucursalId: "suc_1",
					fecha: "2026-06-05",
					hora: "10:00",
					estado: "Pendiente",
				},
				{
					_id: "cita_emp2",
					clienteNombre: "Cliente B",
					empresaId: "emp_2",
					sucursalId: "suc_2",
					fecha: "2026-06-05",
					hora: "11:00",
					estado: "Pendiente",
				},
			],
		});
	}

	it("updateCita y deleteCita bloquean modificaciones a citas de otra empresa", async () => {
		const { ctx } = setupCitasFixture();

		// Usuario de Empresa 1 intentando modificar cita de Empresa 2
		await expect(
			(updateCita as any)._handler(ctx, {
				usuarioId: "u_emp1",
				citaId: "cita_emp2",
				estado: "Confirmada",
			}),
		).rejects.toThrow("No tiene permisos para modificar esta cita");

		// Usuario de Empresa 1 intentando eliminar cita de Empresa 2
		await expect(
			(deleteCita as any)._handler(ctx, {
				usuarioId: "u_emp1",
				citaId: "cita_emp2",
			}),
		).rejects.toThrow("No tiene permisos para eliminar esta cita");

		// Usuario de Empresa 1 modifica exitosamente su propia cita
		await expect(
			(updateCita as any)._handler(ctx, {
				usuarioId: "u_emp1",
				citaId: "cita_emp1",
				estado: "Confirmada",
			}),
		).resolves.toBe(true);

		// SuperAdmin puede modificar citas de cualquier empresa
		await expect(
			(updateCita as any)._handler(ctx, {
				usuarioId: "u_super",
				citaId: "cita_emp2",
				estado: "Confirmada",
			}),
		).resolves.toBe(true);
	});
});

describe("RBAC: Notificaciones y Auditoría Segura", () => {
	it("marcarLeida permite al usuario marcar su propia notificación sin requerir ver_ordenes", async () => {
		const { ctx, store } = createMockCtx({
			usuarios: [
				{ _id: "u_destinatario", nombre: "Dueño Notif", activo: true },
				{ _id: "u_otro", nombre: "Intruso", activo: true },
			],
			notificaciones: [
				{
					_id: "notif_1",
					usuarioId: "u_destinatario",
					empresaId: "emp_1",
					titulo: "Aviso",
					leida: false,
				},
			],
		});

		// Intruso no puede marcar la notificación de otro
		await expect(
			(marcarLeida as any)._handler(ctx, {
				usuarioId: "u_otro",
				notificacionId: "notif_1",
			}),
		).rejects.toThrow("No autorizado para marcar esta notificación");

		// Propietario marca su notificación exitosamente
		const res = await (marcarLeida as any)._handler(ctx, {
			usuarioId: "u_destinatario",
			notificacionId: "notif_1",
		});
		expect(res).toBe(true);
		expect(store.notificaciones[0].leida).toBe(true);
	});

	it("registrarAccion es internalMutation (no expuesta públicamente a clientes)", () => {
		// En Convex, las mutations públicas tienen isPublic = true,
		// mientras que las internalMutations tienen isPublic = undefined o false.
		expect((registrarAccion as any).isPublic).not.toBe(true);
	});
});
