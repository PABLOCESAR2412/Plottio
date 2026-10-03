import { describe, expect, it } from "vitest";
import schema from "../convex/schema";
import { calcularSiguienteNumeroLote, crearLoteProduccion } from "../convex/lotesProduccion";
import { getPlantillas, getCategorias, getCategoriasFull } from "../convex/plantillas";
import { createInventarioItems, transferirInventario, getInventarioConsolidado } from "../convex/inventario";
import { aceptarInvitacionInternal } from "../convex/usuarios";
import { liberarPlacaAsignada } from "../convex/placasStock";
import { createVehiculo, updateVehiculo } from "../convex/vehiculos";
import { createCliente, updateCliente } from "../convex/clientes";

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
							and: (...conditions: boolean[]) => conditions.every(Boolean),
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

describe("Consistencia de esquema, anti-race conditions e índices en Convex", () => {
	describe("1. Índices y tipado estricto en convex/schema.ts", () => {
		const tables = (schema as any).tables;

		it("tabla auditoria: cambios no usa v.any() y es un record tipado", () => {
			const cambiosField = tables.auditoria.validator.fields.cambios;
			expect(cambiosField).toBeDefined();
			// No debe ser kind "any"
			expect(cambiosField.kind).not.toBe("any");
			expect(cambiosField.kind).toBe("record");
			expect(cambiosField.isOptional).toBe("optional");
		});

		it("tabla usuarios: tiene índice by_invitation_token sobre invitationToken", () => {
			const index = tables.usuarios.indexes.find(
				(i: any) => i.indexDescriptor === "by_invitation_token",
			);
			expect(index).toBeDefined();
			expect(index.fields).toEqual(["invitationToken"]);

			const invitationTokenField = tables.usuarios.validator.fields.invitationToken;
			expect(invitationTokenField.isOptional).toBe("optional");
			expect(invitationTokenField.kind).toBe("union");
		});

		it("tabla vehiculos: tiene índice by_placa sobre placa", () => {
			const index = tables.vehiculos.indexes.find(
				(i: any) => i.indexDescriptor === "by_placa",
			);
			expect(index).toBeDefined();
			expect(index.fields).toEqual(["placa"]);
		});

		it("tabla clientes: tiene índice by_empresa_identificacion sobre empresaId e identificacion", () => {
			const index = tables.clientes.indexes.find(
				(i: any) => i.indexDescriptor === "by_empresa_identificacion",
			);
			expect(index).toBeDefined();
			expect(index.fields).toEqual(["empresaId", "identificacion"]);
		});

		it("tabla placasStock: tiene índice by_orden sobre ordenTrabajoId y tipado nullable en ordenTrabajoId y vehiculoId", () => {
			const index = tables.placasStock.indexes.find(
				(i: any) => i.indexDescriptor === "by_orden",
			);
			expect(index).toBeDefined();
			expect(index.fields).toEqual(["ordenTrabajoId"]);

			const ordenField = tables.placasStock.validator.fields.ordenTrabajoId;
			expect(ordenField.isOptional).toBe("optional");
			expect(ordenField.kind).toBe("union");

			const vehiculoField = tables.placasStock.validator.fields.vehiculoId;
			expect(vehiculoField.isOptional).toBe("optional");
			expect(vehiculoField.kind).toBe("union");
		});
	});

	describe("2. Generación determinista anti-race condition de folios de lotes", () => {
		it("calcularSiguienteNumeroLote: genera LOTE-0001 para lista vacía", () => {
			expect(calcularSiguienteNumeroLote([])).toBe("LOTE-0001");
		});

		it("calcularSiguienteNumeroLote: genera correlativo siguiente en secuencia normal", () => {
			const lotes = [{ numero: "LOTE-0001" }, { numero: "LOTE-0002" }];
			expect(calcularSiguienteNumeroLote(lotes)).toBe("LOTE-0003");
		});

		it("calcularSiguienteNumeroLote: maneja huecos causados por eliminación evitando colisiones", () => {
			// Existían lotes 1, 2, 3, 4, 5. Se borraron 2, 3, 4.
			// Quedan 2 lotes en la BD. La lógica antigua (length + 1 = 3) colisionaría.
			// La nueva calcula maxSecuencia (5) + 1 = 6.
			const lotesConHuecos = [{ numero: "LOTE-0001" }, { numero: "LOTE-0005" }];
			expect(calcularSiguienteNumeroLote(lotesConHuecos)).toBe("LOTE-0006");
		});

		it("calcularSiguienteNumeroLote: maneja lotes desordenados y números altos", () => {
			const lotes = [
				{ numero: "LOTE-0042" },
				{ numero: "LOTE-0003" },
				{ numero: "LOTE-0099" },
			];
			expect(calcularSiguienteNumeroLote(lotes)).toBe("LOTE-0100");
		});

		it("crearLoteProduccion: asigna número de lote determinista respetando huecos por eliminación", async () => {
			const { ctx, store } = createMockCtx({
				empresas: [{ _id: "emp_1", nombre: "Empresa 1", activa: true }],
				sucursales: [{ _id: "suc_1", empresaId: "emp_1", nombre: "Matriz", activa: true }],
				usuarios: [
					{
						_id: "u_prod",
						nombre: "Operador Lotes",
						email: "op@lotes.com",
						empresaId: "emp_1",
						sucursalId: "suc_1",
						activo: true,
					},
				],
				roles: [{ _id: "rol_prod", nombre: "Admin", activo: true }],
				permisos: [{ _id: "p_prod", clave: "producir_lotes", nombre: "producir_lotes" }],
				rolePermisos: [{ _id: "rp_1", roleId: "rol_prod", permisoId: "p_prod" }],
				usuariosRolesSucursal: [
					{ _id: "urs_1", usuarioId: "u_prod", roleId: "rol_prod", sucursalId: "suc_1", activo: true },
				],
				lotesProduccion: [
					{
						_id: "lote_1",
						empresaId: "emp_1",
						sucursalId: "suc_1",
						numero: "LOTE-0001",
						estado: "Terminado",
					},
					{
						// Supongamos que LOTE-0002 y LOTE-0003 fueron borrados previamente
						_id: "lote_4",
						empresaId: "emp_1",
						sucursalId: "suc_1",
						numero: "LOTE-0004",
						estado: "Terminado",
					},
				],
				placasStock: [],
			});

			const resultado = await (crearLoteProduccion as any)._handler(ctx, {
				usuarioId: "u_prod",
				placas: [{ material: "acrilico", ancho_cm: 20, alto_cm: 10, contenido_texto: "ABC-123" }],
			});

			// No debe ser LOTE-0003 (que sería length + 1), sino LOTE-0005
			expect(resultado.numero).toBe("LOTE-0005");
			expect(store.lotesProduccion).toHaveLength(3);
			expect(store.lotesProduccion.some((l) => l.numero === "LOTE-0005")).toBe(true);
		});
	});

	describe("3. Eliminación de fuga Multi-Tenant en convex/plantillas.ts", () => {
		it("getPlantillas: retorna array vacío si la empresa no tiene plantillas (sin fallback cross-tenant)", async () => {
			const { ctx } = createMockCtx({
				empresas: [
					{ _id: "emp_a", nombre: "Empresa A", activa: true },
					{ _id: "emp_b", nombre: "Empresa B", activa: true },
				],
				sucursales: [
					{ _id: "suc_a", empresaId: "emp_a", nombre: "Sucursal A", activa: true },
				],
				usuarios: [
					{
						_id: "u_a",
						nombre: "Usuario A",
						email: "a@empresa.com",
						empresaId: "emp_a",
						sucursalId: "suc_a",
						activo: true,
					},
				],
				roles: [],
				permisos: [],
				rolePermisos: [],
				usuariosRolesSucursal: [],
				plantillasPrecios: [
					// Plantillas exclusivas de la Empresa B
					{ _id: "plan_b1", empresaId: "emp_b", categoriaVehiculo: "Camioneta", concepto: "Rotulado", precioSugerido: 150 },
					{ _id: "plan_b2", empresaId: "emp_b", categoriaVehiculo: "Sedan", concepto: "Placas", precioSugerido: 50 },
				],
			});

			const plantillas = await (getPlantillas as any)._handler(ctx, { usuarioId: "u_a" });
			expect(plantillas).toEqual([]);
		});

		it("getCategorias y getCategoriasFull: retornan array vacío sin filtrar datos de otras empresas", async () => {
			const { ctx } = createMockCtx({
				empresas: [
					{ _id: "emp_a", nombre: "Empresa A", activa: true },
					{ _id: "emp_b", nombre: "Empresa B", activa: true },
				],
				sucursales: [
					{ _id: "suc_a", empresaId: "emp_a", nombre: "Sucursal A", activa: true },
				],
				usuarios: [
					{
						_id: "u_a",
						nombre: "Usuario A",
						email: "a@empresa.com",
						empresaId: "emp_a",
						sucursalId: "suc_a",
						activo: true,
					},
				],
				roles: [],
				permisos: [],
				rolePermisos: [],
				usuariosRolesSucursal: [],
				categoriasPrecios: [
					// Categorías exclusivas de Empresa B
					{ _id: "cat_b1", empresaId: "emp_b", nombre: "Camión Pesado" },
					{ _id: "cat_b2", empresaId: "emp_b", nombre: "Remolque" },
				],
			});

			const categorias = await (getCategorias as any)._handler(ctx, { usuarioId: "u_a" });
			expect(categorias).toEqual([]);

			const categoriasFull = await (getCategoriasFull as any)._handler(ctx, { usuarioId: "u_a" });
			expect(categoriasFull).toEqual([]);
		});
	});

	describe("4. Eliminación de asignaciones undefined a patches de base de datos", () => {
		it("aceptarInvitacionInternal: fija invitationToken en null (no undefined)", async () => {
			const { ctx, store } = createMockCtx({
				usuarios: [
					{
						_id: "u_invitado",
						nombre: "Nuevo Usuario",
						email: "inv@test.com",
						invitationToken: "token-seguro-1234",
						invitationAccepted: false,
						activo: false,
					},
				],
			});

			await (aceptarInvitacionInternal as any)._handler(ctx, {
				userId: "u_invitado",
				hashed: "$2a$10$hashedPasswordSample",
			});

			const u = store.usuarios.find((x) => x._id === "u_invitado");
			expect(u).toBeDefined();
			expect(u!.invitationAccepted).toBe(true);
			expect(u!.activo).toBe(true);
			expect(u!.invitationToken).toBeNull();
			expect(u!.invitationToken).not.toBeUndefined();
		});

		it("liberarPlacaAsignada: fija ordenTrabajoId y vehiculoId en null (no undefined)", async () => {
			const { ctx, store } = createMockCtx({
				empresas: [{ _id: "emp_1", nombre: "Empresa 1", activa: true }],
				sucursales: [{ _id: "suc_1", empresaId: "emp_1", nombre: "Matriz", activa: true }],
				usuarios: [
					{
						_id: "u_taller",
						nombre: "Mecánico",
						email: "mec@taller.com",
						empresaId: "emp_1",
						sucursalId: "suc_1",
						activo: true,
					},
				],
				roles: [{ _id: "rol_editor", nombre: "Editor", activo: true }],
				permisos: [{ _id: "p_edit", clave: "editar_orden", nombre: "editar_orden" }],
				rolePermisos: [{ _id: "rp_edit", roleId: "rol_editor", permisoId: "p_edit" }],
				usuariosRolesSucursal: [
					{ _id: "urs_1", usuarioId: "u_taller", roleId: "rol_editor", sucursalId: "suc_1", activo: true },
				],
				lotesProduccion: [
					{ _id: "lote_1", empresaId: "emp_1", sucursalId: "suc_1", numero: "LOTE-0001", estado: "Parcialmente Asignado" },
				],
				placasStock: [
					{
						_id: "placa_1",
						loteId: "lote_1",
						material: "acrilico",
						estado: "Asignada",
						ordenTrabajoId: "ot_123",
						vehiculoId: "veh_456",
						fechaAsignacion: "2026-10-01T10:00:00Z",
						fechaCreacion: "2026-10-01T09:00:00Z",
					},
				],
			});

			await (liberarPlacaAsignada as any)._handler(ctx, {
				usuarioId: "u_taller",
				placaStockId: "placa_1",
			});

			const p = store.placasStock.find((x) => x._id === "placa_1");
			expect(p).toBeDefined();
			expect(p!.estado).toBe("Disponible");
			expect(p!.ordenTrabajoId).toBeNull();
			expect(p!.ordenTrabajoId).not.toBeUndefined();
			expect(p!.vehiculoId).toBeNull();
			expect(p!.vehiculoId).not.toBeUndefined();
			expect(p!.fechaAsignacion).toBeNull();
		});
	});

	describe("5. Aislamiento multi-tenant en convex/inventario.ts", () => {
		it("createInventarioItems: lanza ConvexError si el usuario no tiene empresa asignada", async () => {
			const { ctx } = createMockCtx({
				empresas: [{ _id: "emp_default", nombre: "Empresa Ajena", activa: true }],
				usuarios: [
					{
						_id: "u_sin_empresa",
						nombre: "Usuario Huérfano",
						email: "huerfano@test.com",
						empresaId: undefined,
						activo: true,
					},
				],
				roles: [{ _id: "rol_admin", nombre: "Admin", activo: true }],
				permisos: [{ _id: "p_inv", clave: "editar_inventario", nombre: "editar_inventario" }],
				rolePermisos: [{ _id: "rp_inv", roleId: "rol_admin", permisoId: "p_inv" }],
				usuariosRolesSucursal: [
					{ _id: "urs_1", usuarioId: "u_sin_empresa", roleId: "rol_admin", activo: true },
				],
				inventarioItems: [],
			});

			await expect(
				(createInventarioItems as any)._handler(ctx, {
					usuarioId: "u_sin_empresa",
					items: [{ nombre: "Perno M8", costoUnitario: 0.5, unidadMedida: "unidad" }],
				}),
			).rejects.toThrow("Usuario sin empresa asignada");
		});

		it("transferirInventario: bloquea transferencias cross-tenant entre diferentes empresas", async () => {
			const { ctx } = createMockCtx({
				empresas: [
					{ _id: "emp_1", nombre: "Empresa 1", activa: true },
					{ _id: "emp_2", nombre: "Empresa 2", activa: true },
				],
				sucursales: [
					{ _id: "suc_1", empresaId: "emp_1", nombre: "Sucursal Empresa 1", activa: true },
					{ _id: "suc_2", empresaId: "emp_2", nombre: "Sucursal Empresa 2", activa: true },
				],
				usuarios: [
					{
						_id: "u_emp1",
						nombre: "Usuario Empresa 1",
						email: "u1@emp1.com",
						empresaId: "emp_1",
						sucursalId: "suc_1",
						activo: true,
					},
				],
				roles: [{ _id: "rol_admin", nombre: "Admin", activo: true }],
				permisos: [
					{ _id: "p_inv", clave: "editar_inventario", nombre: "editar_inventario" },
					{ _id: "p_all", clave: "ver_todas_sucursales", nombre: "ver_todas_sucursales" },
				],
				rolePermisos: [
					{ _id: "rp_inv", roleId: "rol_admin", permisoId: "p_inv" },
					{ _id: "rp_all", roleId: "rol_admin", permisoId: "p_all" },
				],
				usuariosRolesSucursal: [
					{ _id: "urs_1", usuarioId: "u_emp1", roleId: "rol_admin", sucursalId: "suc_1", activo: true },
				],
				inventarioItems: [
					{ _id: "item_1", empresaId: "emp_1", nombre: "Lámina Acrílica", costoUnitario: 12, unidadMedida: "m2", activo: true },
				],
				inventarioSucursal: [
					{ _id: "st_1", sucursalId: "suc_1", itemId: "item_1", cantidad: 50, cantidadMinima: 10 },
				],
				movimientosInventario: [],
			});

			await expect(
				(transferirInventario as any)._handler(ctx, {
					usuarioId: "u_emp1",
					desde: "suc_1",
					hacia: "suc_2",
					itemId: "item_1",
					cantidad: 10,
				}),
			).rejects.toThrow("No se permiten transferencias entre diferentes empresas o fuera de su empresa");
		});

		it("transferirInventario: SuperAdmin no puede transferir entre empresas distintas", async () => {
			const { ctx } = createMockCtx({
				empresas: [
					{ _id: "emp_1", nombre: "Empresa 1", activa: true },
					{ _id: "emp_2", nombre: "Empresa 2", activa: true },
				],
				sucursales: [
					{ _id: "suc_1", empresaId: "emp_1", nombre: "Sucursal Empresa 1", activa: true },
					{ _id: "suc_2", empresaId: "emp_2", nombre: "Sucursal Empresa 2", activa: true },
				],
				usuarios: [
					{
						_id: "u_super",
						nombre: "Super Administrador",
						email: "super@root.com",
						activo: true,
					},
				],
				roles: [{ _id: "rol_super", nombre: "SuperAdmin", activo: true }],
				permisos: [],
				rolePermisos: [],
				usuariosRolesSucursal: [
					{ _id: "urs_s", usuarioId: "u_super", roleId: "rol_super", activo: true },
				],
				inventarioItems: [
					{ _id: "item_1", empresaId: "emp_1", nombre: "Lámina", costoUnitario: 10, unidadMedida: "m2", activo: true },
				],
				inventarioSucursal: [
					{ _id: "st_1", sucursalId: "suc_1", itemId: "item_1", cantidad: 30, cantidadMinima: 5 },
				],
				movimientosInventario: [],
			});

			await expect(
				(transferirInventario as any)._handler(ctx, {
					usuarioId: "u_super",
					desde: "suc_1",
					hacia: "suc_2",
					itemId: "item_1",
					cantidad: 5,
				}),
			).rejects.toThrow("No se permiten transferencias entre diferentes empresas");
		});

		it("transferirInventario: permite transferencia legítima entre sucursales de la misma empresa", async () => {
			const { ctx, store } = createMockCtx({
				empresas: [{ _id: "emp_1", nombre: "Empresa 1", activa: true }],
				sucursales: [
					{ _id: "suc_origen", empresaId: "emp_1", nombre: "Matriz", activa: true },
					{ _id: "suc_destino", empresaId: "emp_1", nombre: "Norte", activa: true },
				],
				usuarios: [
					{
						_id: "u_oper",
						nombre: "Jefe de Bodega",
						email: "bodega@emp1.com",
						empresaId: "emp_1",
						sucursalId: "suc_origen",
						activo: true,
					},
				],
				roles: [{ _id: "rol_admin", nombre: "Admin", activo: true }],
				permisos: [
					{ _id: "p_inv", clave: "editar_inventario", nombre: "editar_inventario" },
					{ _id: "p_all", clave: "ver_todas_sucursales", nombre: "ver_todas_sucursales" },
				],
				rolePermisos: [
					{ _id: "rp_inv", roleId: "rol_admin", permisoId: "p_inv" },
					{ _id: "rp_all", roleId: "rol_admin", permisoId: "p_all" },
				],
				usuariosRolesSucursal: [
					{ _id: "urs_1", usuarioId: "u_oper", roleId: "rol_admin", sucursalId: "suc_origen", activo: true },
				],
				inventarioItems: [
					{ _id: "item_1", empresaId: "emp_1", nombre: "Rollo Vinil", costoUnitario: 25, unidadMedida: "m", activo: true },
				],
				inventarioSucursal: [
					{ _id: "st_orig", sucursalId: "suc_origen", itemId: "item_1", cantidad: 40, cantidadMinima: 10 },
					{ _id: "st_dest", sucursalId: "suc_destino", itemId: "item_1", cantidad: 5, cantidadMinima: 10 },
				],
				movimientosInventario: [],
			});

			await (transferirInventario as any)._handler(ctx, {
				usuarioId: "u_oper",
				desde: "suc_origen",
				hacia: "suc_destino",
				itemId: "item_1",
				cantidad: 15,
			});

			const stockOrig = store.inventarioSucursal.find((s) => s._id === "st_orig");
			const stockDest = store.inventarioSucursal.find((s) => s._id === "st_dest");
			expect(stockOrig).toBeDefined();
			expect(stockDest).toBeDefined();

			expect(stockOrig!.cantidad).toBe(25); // 40 - 15
			expect(stockDest!.cantidad).toBe(20); // 5 + 15
			expect(store.movimientosInventario).toHaveLength(2);
		});
	});

	describe("6. Conexión de nuevos índices en mutaciones de unicidad", () => {
		it("crearVehiculo: rechaza placa duplicada usando by_placa", async () => {
			const { ctx } = createMockCtx({
				empresas: [{ _id: "emp_1", nombre: "Empresa 1", activa: true }],
				sucursales: [{ _id: "suc_1", empresaId: "emp_1", nombre: "Matriz", activa: true }],
				usuarios: [
					{ _id: "u_1", nombre: "User 1", email: "u1@emp.com", empresaId: "emp_1", sucursalId: "suc_1", activo: true },
				],
				vehiculos: [
					{
						_id: "veh_1",
						placa: "ABC-1234",
						categoria: "Sedan",
						marca: "Toyota",
						modelo: "Yaris",
						anio: "2020",
						numeroSerie: "SERIE123",
						propietarioId: "cli_1",
						propietarioTipo: "cliente",
						estado: "Activo",
						empresaId: "emp_1",
						sucursalId: "suc_1",
					},
				],
			});

			await expect(
				(createVehiculo as any)._handler(ctx, {
					usuarioId: "u_1",
					placa: "ABC-1234",
					categoria: "Sedan",
					marca: "Nissan",
					modelo: "Versa",
					anio: "2021",
					numeroSerie: "SERIE456",
					propietarioId: "cli_1",
					propietarioTipo: "cliente",
					estado: "Activo",
				}),
			).rejects.toThrow("Ya existe un vehículo con la placa ABC-1234");
		});

		it("updateVehiculo: rechaza placa duplicada existente en otro vehículo", async () => {
			const { ctx } = createMockCtx({
				empresas: [{ _id: "emp_1", nombre: "Empresa 1", activa: true }],
				sucursales: [{ _id: "suc_1", empresaId: "emp_1", nombre: "Matriz", activa: true }],
				usuarios: [
					{ _id: "u_veh", nombre: "Operador", email: "op@emp.com", empresaId: "emp_1", sucursalId: "suc_1", activo: true },
				],
				roles: [{ _id: "r_veh", nombre: "Admin", activo: true }],
				usuariosRolesSucursal: [{ _id: "urs_veh", usuarioId: "u_veh", roleId: "r_veh", sucursalId: "suc_1", activo: true }],
				permisos: [{ _id: "p_veh", clave: "editar_orden", nombre: "editar_orden", activo: true }],
				rolePermisos: [{ _id: "rp_veh", roleId: "r_veh", permisoId: "p_veh" }],
				vehiculos: [
					{ _id: "veh_1", empresaId: "emp_1", placa: "ABC-1234", categoria: "Sedan", marca: "Toyota", modelo: "Yaris", anio: "2020", numeroSerie: "S1", propietarioId: "c1", propietarioTipo: "cliente", estado: "Activo" },
					{ _id: "veh_2", empresaId: "emp_1", placa: "XYZ-9876", categoria: "Camioneta", marca: "Ford", modelo: "F-150", anio: "2022", numeroSerie: "S2", propietarioId: "c2", propietarioTipo: "cliente", estado: "Activo" },
				],
			});

			await expect(
				(updateVehiculo as any)._handler(ctx, {
					usuarioId: "u_veh",
					vehiculoId: "veh_2",
					placa: "ABC-1234",
					categoria: "Camioneta",
					marca: "Ford",
					modelo: "F-150",
					anio: "2022",
					numeroSerie: "S2",
					propietarioId: "c2",
					propietarioTipo: "cliente",
					estado: "Activo",
				}),
			).rejects.toThrow("Ya existe un vehículo con la placa ABC-1234");
		});

		it("createCliente: rechaza identificación duplicada usando by_empresa_identificacion", async () => {
			const { ctx } = createMockCtx({
				empresas: [{ _id: "emp_1", nombre: "Empresa 1", activa: true }],
				sucursales: [{ _id: "suc_1", empresaId: "emp_1", nombre: "Matriz", activa: true }],
				usuarios: [
					{ _id: "u_cli", nombre: "Asesor", email: "cli@emp.com", empresaId: "emp_1", sucursalId: "suc_1", activo: true },
				],
				roles: [{ _id: "r_c", nombre: "Admin", activo: true }],
				permisos: [{ _id: "p_c", clave: "crear_cliente", nombre: "crear_cliente" }],
				rolePermisos: [{ _id: "rp_c", roleId: "r_c", permisoId: "p_c" }],
				usuariosRolesSucursal: [{ _id: "urs_c", usuarioId: "u_cli", roleId: "r_c", sucursalId: "suc_1", activo: true }],
				clientes: [
					{
						_id: "cli_existente",
						nombre: "Juan Perez",
						telefono: "0999999999",
						email: "juan@test.com",
						identificacion: "1710000001",
						empresaId: "emp_1",
						sucursalId: "suc_1",
						esClienteGlobal: false,
					},
				],
			});

			await expect(
				(createCliente as any)._handler(ctx, {
					usuarioId: "u_cli",
					nombre: "Juan Perez Duplicado",
					telefono: "0988888888",
					email: "juan2@test.com",
					identificacion: "1710000001",
				}),
			).rejects.toThrow("Ya existe un cliente con la identificación 1710000001");
		});

		it("updateCliente: rechaza identificación duplicada existente en otro cliente de la misma empresa", async () => {
			const { ctx } = createMockCtx({
				empresas: [{ _id: "emp_1", nombre: "Empresa 1", activa: true }],
				usuarios: [
					{ _id: "u_cli", nombre: "Asesor", email: "cli@emp.com", empresaId: "emp_1", activo: true },
				],
				clientes: [
					{ _id: "cli_1", nombre: "Cliente 1", telefono: "111", email: "c1@test.com", identificacion: "1710000001", empresaId: "emp_1" },
					{ _id: "cli_2", nombre: "Cliente 2", telefono: "222", email: "c2@test.com", identificacion: "1710000002", empresaId: "emp_1" },
				],
			});

			await expect(
				(updateCliente as any)._handler(ctx, {
					usuarioId: "u_cli",
					clienteId: "cli_2",
					nombre: "Cliente 2",
					telefono: "222",
					email: "c2@test.com",
					identificacion: "1710000001",
				}),
			).rejects.toThrow("Ya existe un cliente con la identificación 1710000001 en esta empresa");
		});
	});

	describe("7. Aislamiento en getInventarioConsolidado sin fallback cross-tenant", () => {
		it("getInventarioConsolidado: retorna únicamente items de la empresa del usuario", async () => {
			const { ctx } = createMockCtx({
				empresas: [
					{ _id: "emp_1", nombre: "Empresa 1", activa: true },
					{ _id: "emp_2", nombre: "Empresa 2", activa: true },
				],
				sucursales: [
					{ _id: "suc_1", empresaId: "emp_1", nombre: "Sucursal 1", activa: true },
				],
				usuarios: [
					{ _id: "u_gerente", nombre: "Gerente 1", email: "g1@emp1.com", empresaId: "emp_1", sucursalId: "suc_1", activo: true },
				],
				roles: [{ _id: "r_g", nombre: "Gerente", activo: true }],
				permisos: [{ _id: "p_vts", clave: "ver_todas_sucursales", nombre: "ver_todas_sucursales" }],
				rolePermisos: [{ _id: "rp_vts", roleId: "r_g", permisoId: "p_vts" }],
				usuariosRolesSucursal: [{ _id: "urs_g", usuarioId: "u_gerente", roleId: "r_g", sucursalId: "suc_1", activo: true }],
				inventarioItems: [
					{ _id: "item_emp1", empresaId: "emp_1", nombre: "Lámina Empresa 1", costoUnitario: 10, unidadMedida: "m2", activo: true },
					{ _id: "item_emp2", empresaId: "emp_2", nombre: "Lámina Empresa 2", costoUnitario: 20, unidadMedida: "m2", activo: true },
				],
				inventarioSucursal: [
					{ _id: "is_1", sucursalId: "suc_1", itemId: "item_emp1", cantidad: 100, cantidadMinima: 10 },
				],
			});

			const consolidado = await (getInventarioConsolidado as any)._handler(ctx, { usuarioId: "u_gerente" });
			expect(consolidado).toHaveLength(1);
			expect(consolidado[0].item_id).toBe("item_emp1");
			expect(consolidado[0].nombre).toBe("Lámina Empresa 1");
		});

		it("getInventarioConsolidado: retorna array vacío si el usuario no tiene empresa y no es SuperAdmin (sin fallback)", async () => {
			const { ctx } = createMockCtx({
				empresas: [{ _id: "emp_ajena", nombre: "Empresa Ajena", activa: true }],
				usuarios: [
					{ _id: "u_sin_emp", nombre: "Sin Empresa", email: "sin@emp.com", empresaId: undefined, activo: true },
				],
				roles: [{ _id: "r_inv", nombre: "Invitado", activo: true }],
				permisos: [{ _id: "p_vts", clave: "ver_todas_sucursales", nombre: "ver_todas_sucursales" }],
				rolePermisos: [{ _id: "rp_vts", roleId: "r_inv", permisoId: "p_vts" }],
				usuariosRolesSucursal: [{ _id: "urs_inv", usuarioId: "u_sin_emp", roleId: "r_inv", activo: true }],
				inventarioItems: [
					{ _id: "item_ajeno", empresaId: "emp_ajena", nombre: "Material Ajeno", costoUnitario: 50, unidadMedida: "kg", activo: true },
				],
				inventarioSucursal: [],
			});

			const consolidado = await (getInventarioConsolidado as any)._handler(ctx, { usuarioId: "u_sin_emp" });
			expect(consolidado).toEqual([]);
		});
	});
});
