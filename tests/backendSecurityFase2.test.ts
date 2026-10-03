import { describe, expect, it } from "vitest";
import * as cotizacionesModule from "../convex/cotizaciones";
import {
	crearItemCotizacionConPlaca,
	fetchItemsCotizacionConPlacas,
} from "../convex/cotizaciones";
import {
	getServicios,
	toggleActivo,
	updateServicio,
	deleteServicio,
} from "../convex/catalogoServicios";
import {
	getAlertasStockMinimo,
	updateInventarioItem,
	deleteInventarioItem,
} from "../convex/inventario";
import {
	updateVehiculo,
	deleteVehiculo,
	addServicioVehiculo,
	updateServicioVehiculo,
	deleteServicioVehiculo,
} from "../convex/vehiculos";
import {
	actualizarEstadoLote,
	cambiarEstadoLote,
	agregarComentarioLote,
} from "../convex/lotesProduccion";
import {
	asignarPlacaStockAOrden,
	marcarPlacaInstalada,
	liberarPlacaAsignada,
} from "../convex/placasStock";
import { populate } from "../convex/seed";
import { seedPermisos } from "../convex/permisos";

type Doc = Record<string, any>;

function createMockCtx(initialData: Record<string, Doc[]>) {
	const store: Record<string, Doc[]> = {};
	for (const [table, docs] of Object.entries(initialData)) {
		store[table] = docs.map((d) => ({ ...d }));
	}

	let idCounter = 5000;

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
		runMutation: async () => {},
	};

	return { ctx: ctx as any, store };
}

function createSecurityFixture() {
	return {
		empresas: [
			{ _id: "emp_1", nombre: "Empresa 1 (Alpha)", activa: true },
			{ _id: "emp_2", nombre: "Empresa 2 (Beta)", activa: true },
		],
		sucursales: [
			{ _id: "suc_1", empresaId: "emp_1", nombre: "Matriz Quito", activa: true },
			{ _id: "suc_2", empresaId: "emp_1", nombre: "Norte Quito", activa: true },
			{ _id: "suc_3", empresaId: "emp_2", nombre: "Guayaquil", activa: true },
		],
		usuarios: [
			{ _id: "u_emp1", nombre: "Operador Emp1", email: "op1@alpha.com", empresaId: "emp_1", sucursalId: "suc_1", activo: true },
			{ _id: "u_emp1_allbranches", nombre: "Gerente Emp1", email: "gerente@alpha.com", empresaId: "emp_1", sucursalId: "suc_1", activo: true },
			{ _id: "u_emp2", nombre: "Operador Emp2", email: "op2@beta.com", empresaId: "emp_2", sucursalId: "suc_3", activo: true },
			{ _id: "u_superadmin", nombre: "SuperAdmin Global", email: "super@admin.com", activo: true },
			{ _id: "u_noperms", nombre: "Sin Permisos", email: "sin@nada.com", empresaId: "emp_1", sucursalId: "suc_1", activo: true },
		],
		roles: [
			{ _id: "r_op", nombre: "Operador", activo: true },
			{ _id: "r_gerente", nombre: "Gerente", activo: true },
			{ _id: "r_super", nombre: "SuperAdmin", activo: true },
		],
		usuariosRolesSucursal: [
			{ _id: "urs_1", usuarioId: "u_emp1", roleId: "r_op", sucursalId: "suc_1", activo: true },
			{ _id: "urs_2", usuarioId: "u_emp1_allbranches", roleId: "r_gerente", sucursalId: "suc_1", activo: true },
			{ _id: "urs_3", usuarioId: "u_emp2", roleId: "r_op", sucursalId: "suc_3", activo: true },
			{ _id: "urs_4", usuarioId: "u_superadmin", roleId: "r_super", sucursalId: "suc_1", activo: true },
		],
		permisos: [
			{ _id: "p_cot_ver", clave: "ver_cotizaciones", nombre: "ver_cotizaciones", activo: true },
			{ _id: "p_cot_crear", clave: "crear_cotizacion", nombre: "crear_cotizacion", activo: true },
			{ _id: "p_cat_edit", clave: "editar_catalogo", nombre: "editar_catalogo", activo: true },
			{ _id: "p_inv_ver", clave: "ver_inventario", nombre: "ver_inventario", activo: true },
			{ _id: "p_inv_edit", clave: "editar_inventario", nombre: "editar_inventario", activo: true },
			{ _id: "p_ord_ver", clave: "ver_ordenes", nombre: "ver_ordenes", activo: true },
			{ _id: "p_ord_edit", clave: "editar_orden", nombre: "editar_orden", activo: true },
			{ _id: "p_lot_prod", clave: "producir_lotes", nombre: "producir_lotes", activo: true },
			{ _id: "p_todas_suc", clave: "ver_todas_sucursales", nombre: "ver_todas_sucursales", activo: true },
		],
		rolePermisos: [
			{ _id: "rp_1", roleId: "r_op", permisoId: "p_cot_ver" },
			{ _id: "rp_2", roleId: "r_op", permisoId: "p_cot_crear" },
			{ _id: "rp_3", roleId: "r_op", permisoId: "p_cat_edit" },
			{ _id: "rp_4", roleId: "r_op", permisoId: "p_inv_ver" },
			{ _id: "rp_5", roleId: "r_op", permisoId: "p_inv_edit" },
			{ _id: "rp_6", roleId: "r_op", permisoId: "p_ord_ver" },
			{ _id: "rp_7", roleId: "r_op", permisoId: "p_ord_edit" },
			{ _id: "rp_8", roleId: "r_op", permisoId: "p_lot_prod" },
			{ _id: "rp_9", roleId: "r_gerente", permisoId: "p_inv_ver" },
			{ _id: "rp_10", roleId: "r_gerente", permisoId: "p_todas_suc" },
		],
	};
}

describe("Fase 2 - Tarea 9: Blindaje Backend y Eliminación de Fugas Multi-tenant", () => {
	describe("1. convex/cotizaciones.ts", () => {
		it("elimina la query pública global getCotizaciones del módulo", () => {
			expect((cotizacionesModule as any).getCotizaciones).toBeUndefined();
		});

		it("crearItemCotizacionConPlaca: rechaza llamadas si no pertenece a la misma empresa", async () => {
			const fixture = createSecurityFixture();
			const { ctx } = createMockCtx({
				...fixture,
				cotizaciones: [
					{
						_id: "cot_emp2",
						empresaId: "emp_2",
						sucursalId: "suc_3",
						clienteNombre: "Cliente Beta",
						clienteTelefono: "099999999",
						items: [],
						total: 0,
						estado: "Pendiente",
						fecha: "2026-10-01",
					},
				],
			});

			await expect(
				(crearItemCotizacionConPlaca as any)._handler(ctx, {
					usuarioId: "u_emp1",
					cotizacionId: "cot_emp2",
					cantidad: 2,
					precioUnitario: 50,
				}),
			).rejects.toThrow("No autorizado para modificar esta cotización");
		});

		it("crearItemCotizacionConPlaca: permite llamada si la cotización pertenece a su empresa o es SuperAdmin", async () => {
			const fixture = createSecurityFixture();
			const { ctx, store } = createMockCtx({
				...fixture,
				cotizaciones: [
					{
						_id: "cot_emp1",
						empresaId: "emp_1",
						sucursalId: "suc_1",
						clienteNombre: "Cliente Alpha",
						clienteTelefono: "098888888",
						items: [],
						total: 0,
						estado: "Pendiente",
						fecha: "2026-10-01",
					},
				],
			});

			const itemCreado = await (crearItemCotizacionConPlaca as any)._handler(ctx, {
				usuarioId: "u_emp1",
				cotizacionId: "cot_emp1",
				descripcion: "Placa Alum",
				cantidad: 3,
				precioUnitario: 20,
			});

			expect(itemCreado.descripcion).toBe("Placa Alum");
			const cot = store.cotizaciones.find((c) => c._id === "cot_emp1");
			expect(cot?.total).toBe(60);
			expect(cot?.items).toHaveLength(1);

			// SuperAdmin también puede modificar
			await expect(
				(crearItemCotizacionConPlaca as any)._handler(ctx, {
					usuarioId: "u_superadmin",
					cotizacionId: "cot_emp1",
					descripcion: "Placa Acrilico",
					cantidad: 1,
					precioUnitario: 40,
				}),
			).resolves.toBeDefined();
		});

		it("fetchItemsCotizacionConPlacas: rechaza acceso si la cotización es de otra empresa", async () => {
			const fixture = createSecurityFixture();
			const { ctx } = createMockCtx({
				...fixture,
				cotizaciones: [
					{
						_id: "cot_emp2",
						empresaId: "emp_2",
						sucursalId: "suc_3",
						clienteNombre: "Cliente Beta",
						clienteTelefono: "099999999",
						items: [{ descripcion: "Item Secreto", cantidad: 1, precioUnitario: 100 }],
						total: 100,
						estado: "Pendiente",
						fecha: "2026-10-01",
					},
				],
			});

			await expect(
				(fetchItemsCotizacionConPlacas as any)._handler(ctx, {
					usuarioId: "u_emp1",
					cotizacionId: "cot_emp2",
				}),
			).rejects.toThrow("No autorizado para ver esta cotización");

			// SuperAdmin sí puede consultar
			const itemsAdmin = await (fetchItemsCotizacionConPlacas as any)._handler(ctx, {
				usuarioId: "u_superadmin",
				cotizacionId: "cot_emp2",
			});
			expect(itemsAdmin).toHaveLength(1);
			expect(itemsAdmin[0].descripcion).toBe("Item Secreto");
		});
	});

	describe("2. convex/catalogoServicios.ts", () => {
		it("getServicios: exige usuarioId y filtra estrictamente por empresa sin fugar otros tenants", async () => {
			const fixture = createSecurityFixture();
			const { ctx } = createMockCtx({
				...fixture,
				catalogoServicios: [
					{ _id: "srv_1", empresaId: "emp_1", nombre: "Rotulado Alpha 1", categoria: "rotulacion", precioBase: 100, activo: true },
					{ _id: "srv_2", empresaId: "emp_1", nombre: "Rotulado Alpha 2", categoria: "rotulacion", precioBase: 200, activo: true },
					{ _id: "srv_3", empresaId: "emp_2", nombre: "Rotulado Beta", categoria: "rotulacion", precioBase: 300, activo: true },
				],
			});

			// u_emp1 sólo debe ver srv_1 y srv_2
			const serviciosEmp1 = await (getServicios as any)._handler(ctx, {
				usuarioId: "u_emp1",
			});
			expect(serviciosEmp1.map((s: any) => s._id)).toEqual(["srv_1", "srv_2"]);

			// u_emp2 sólo debe ver srv_3
			const serviciosEmp2 = await (getServicios as any)._handler(ctx, {
				usuarioId: "u_emp2",
			});
			expect(serviciosEmp2.map((s: any) => s._id)).toEqual(["srv_3"]);

			// SuperAdmin ve todos
			const serviciosAdmin = await (getServicios as any)._handler(ctx, {
				usuarioId: "u_superadmin",
			});
			expect(serviciosAdmin).toHaveLength(3);
		});

		it("toggleActivo, updateServicio y deleteServicio: bloquean modificaciones cross-tenant", async () => {
			const fixture = createSecurityFixture();
			const { ctx, store } = createMockCtx({
				...fixture,
				catalogoServicios: [
					{ _id: "srv_emp2", empresaId: "emp_2", nombre: "Servicio Beta", categoria: "placas", precioBase: 50, activo: true },
					{ _id: "srv_emp1", empresaId: "emp_1", nombre: "Servicio Alpha", categoria: "placas", precioBase: 50, activo: true },
				],
			});

			// toggleActivo
			await expect(
				(toggleActivo as any)._handler(ctx, {
					usuarioId: "u_emp1",
					id: "srv_emp2",
					activo: false,
				}),
			).rejects.toThrow("No autorizado para modificar este servicio");

			// updateServicio
			await expect(
				(updateServicio as any)._handler(ctx, {
					usuarioId: "u_emp1",
					id: "srv_emp2",
					nombre: "Hackeado",
				}),
			).rejects.toThrow("No autorizado para modificar este servicio");

			// deleteServicio
			await expect(
				(deleteServicio as any)._handler(ctx, {
					usuarioId: "u_emp1",
					id: "srv_emp2",
				}),
			).rejects.toThrow("No autorizado para eliminar este servicio");

			// u_emp1 sí puede modificar su propio servicio
			await (toggleActivo as any)._handler(ctx, {
				usuarioId: "u_emp1",
				id: "srv_emp1",
				activo: false,
			});
			expect(store.catalogoServicios.find((s) => s._id === "srv_emp1")?.activo).toBe(false);

			// SuperAdmin sí puede modificar cualquier servicio
			await (updateServicio as any)._handler(ctx, {
				usuarioId: "u_superadmin",
				id: "srv_emp2",
				precioBase: 75,
			});
			expect(store.catalogoServicios.find((s) => s._id === "srv_emp2")?.precioBase).toBe(75);
		});
	});

	describe("3. convex/inventario.ts", () => {
		it("getAlertasStockMinimo: con ver_todas_sucursales, no fuga stock de sucursales de otras empresas", async () => {
			const fixture = createSecurityFixture();
			const { ctx } = createMockCtx({
				...fixture,
				inventarioItems: [
					{ _id: "item_1", empresaId: "emp_1", nombre: "Vinil Blanco", tipo: "vinil", costoUnitario: 10 },
					{ _id: "item_2", empresaId: "emp_2", nombre: "Acrílico Rojo", tipo: "acrilico", costoUnitario: 25 },
				],
				inventarioSucursal: [
					// Sucursal 1 (empresa 1)
					{ _id: "st_1", sucursalId: "suc_1", itemId: "item_1", cantidad: 2, cantidadMinima: 10 },
					// Sucursal 2 (empresa 1)
					{ _id: "st_2", sucursalId: "suc_2", itemId: "item_1", cantidad: 4, cantidadMinima: 15 },
					// Sucursal 3 (empresa 2 - OTRA EMPRESA)
					{ _id: "st_3", sucursalId: "suc_3", itemId: "item_2", cantidad: 1, cantidadMinima: 20 },
				],
			});

			// u_emp1_allbranches tiene permiso ver_todas_sucursales pero pertenece a emp_1
			const alertas = await (getAlertasStockMinimo as any)._handler(ctx, {
				usuarioId: "u_emp1_allbranches",
			});

			// Debe retornar únicamente alertas de suc_1 y suc_2, jamás de suc_3
			expect(alertas).toHaveLength(2);
			const sucursalesEnAlertas = alertas.map((a: any) => a.sucursal_nombre);
			expect(sucursalesEnAlertas).toContain("Matriz Quito");
			expect(sucursalesEnAlertas).toContain("Norte Quito");
			expect(sucursalesEnAlertas).not.toContain("Guayaquil");
		});

		it("updateInventarioItem y deleteInventarioItem: validan pertenencia a userContext.empresa", async () => {
			const fixture = createSecurityFixture();
			const { ctx, store } = createMockCtx({
				...fixture,
				inventarioItems: [
					{ _id: "inv_emp1", empresaId: "emp_1", nombre: "Item Alpha", costoUnitario: 10 },
					{ _id: "inv_emp2", empresaId: "emp_2", nombre: "Item Beta", costoUnitario: 20 },
				],
				inventarioSucursal: [
					{ _id: "st_emp1", sucursalId: "suc_1", itemId: "inv_emp1", cantidad: 5, cantidadMinima: 10 },
				],
			});

			// update cross-tenant
			await expect(
				(updateInventarioItem as any)._handler(ctx, {
					usuarioId: "u_emp1",
					itemId: "inv_emp2",
					nombre: "Item Modificado",
				}),
			).rejects.toThrow("No autorizado para modificar este item");

			// delete cross-tenant
			await expect(
				(deleteInventarioItem as any)._handler(ctx, {
					usuarioId: "u_emp1",
					itemId: "inv_emp2",
				}),
			).rejects.toThrow("No autorizado para eliminar este item");

			// update legítimo
			await (updateInventarioItem as any)._handler(ctx, {
				usuarioId: "u_emp1",
				itemId: "inv_emp1",
				costoUnitario: 15,
			});
			expect(store.inventarioItems.find((i) => i._id === "inv_emp1")?.costoUnitario).toBe(15);

			// delete legítimo (elimina item y stock)
			await (deleteInventarioItem as any)._handler(ctx, {
				usuarioId: "u_emp1",
				itemId: "inv_emp1",
			});
			expect(store.inventarioItems.find((i) => i._id === "inv_emp1")).toBeUndefined();
			expect(store.inventarioSucursal.find((s) => s.itemId === "inv_emp1")).toBeUndefined();
		});
	});

	describe("4. convex/vehiculos.ts", () => {
		it("updateVehiculo y deleteVehiculo: exigen permiso editar_orden y validan empresa", async () => {
			const fixture = createSecurityFixture();
			const { ctx, store } = createMockCtx({
				...fixture,
				vehiculos: [
					{ _id: "veh_emp1", empresaId: "emp_1", placa: "PAA-1111", categoria: "Sedan", marca: "Toyota", modelo: "Corolla", anio: "2020", numeroSerie: "123", propietarioId: "c1", propietarioTipo: "cliente", estado: "Activo" },
					{ _id: "veh_emp2", empresaId: "emp_2", placa: "PBB-2222", categoria: "Camion", marca: "Hino", modelo: "GH", anio: "2021", numeroSerie: "456", propietarioId: "c2", propietarioTipo: "cliente", estado: "Activo" },
				],
			});

			// Sin permiso
			await expect(
				(updateVehiculo as any)._handler(ctx, {
					usuarioId: "u_noperms",
					vehiculoId: "veh_emp1",
					placa: "PAA-1111",
					categoria: "Sedan",
					marca: "Toyota",
					modelo: "Corolla",
					anio: "2020",
					numeroSerie: "123",
					propietarioId: "c1",
					propietarioTipo: "cliente",
					estado: "Activo",
				}),
			).rejects.toThrow("No tienes permiso para realizar esta acción: editar_orden");

			// Cross-tenant update
			await expect(
				(updateVehiculo as any)._handler(ctx, {
					usuarioId: "u_emp1",
					vehiculoId: "veh_emp2",
					placa: "PBB-2222",
					categoria: "Camion",
					marca: "Hino",
					modelo: "GH",
					anio: "2021",
					numeroSerie: "456",
					propietarioId: "c2",
					propietarioTipo: "cliente",
					estado: "Inactivo",
				}),
			).rejects.toThrow("No autorizado para modificar este vehículo");

			// Cross-tenant delete
			await expect(
				(deleteVehiculo as any)._handler(ctx, {
					usuarioId: "u_emp1",
					vehiculoId: "veh_emp2",
				}),
			).rejects.toThrow("No autorizado para eliminar este vehículo");

			// Legítimo delete
			await (deleteVehiculo as any)._handler(ctx, {
				usuarioId: "u_emp1",
				vehiculoId: "veh_emp1",
			});
			expect(store.vehiculos.find((v) => v._id === "veh_emp1")).toBeUndefined();
		});

		it("addServicioVehiculo, updateServicioVehiculo, deleteServicioVehiculo: exigen editar_orden y validan empresa", async () => {
			const fixture = createSecurityFixture();
			const { ctx, store } = createMockCtx({
				...fixture,
				vehiculos: [
					{
						_id: "veh_emp1",
						empresaId: "emp_1",
						placa: "PAA-1111",
						servicios: [{ id: "srv-1", descripcion: "Rotulado inicial", costo: 100, fecha: "2026-10-01", estado: "Completado" }],
					},
					{
						_id: "veh_emp2",
						empresaId: "emp_2",
						placa: "PBB-2222",
						servicios: [{ id: "srv-2", descripcion: "Rotulado beta", costo: 200, fecha: "2026-10-01", estado: "Completado" }],
					},
				],
			});

			// Cross-tenant add servicio
			await expect(
				(addServicioVehiculo as any)._handler(ctx, {
					usuarioId: "u_emp1",
					vehiculoId: "veh_emp2",
					descripcion: "Servicio no autorizado",
					costo: 50,
					fecha: "2026-10-02",
					estado: "Pendiente",
				}),
			).rejects.toThrow("No autorizado para modificar este vehículo");

			// Cross-tenant update servicio
			await expect(
				(updateServicioVehiculo as any)._handler(ctx, {
					usuarioId: "u_emp1",
					vehiculoId: "veh_emp2",
					servicioId: "srv-2",
					descripcion: "Modificación no autorizada",
					costo: 300,
					fecha: "2026-10-02",
					estado: "Completado",
				}),
			).rejects.toThrow("No autorizado para modificar este vehículo");

			// Cross-tenant delete servicio
			await expect(
				(deleteServicioVehiculo as any)._handler(ctx, {
					usuarioId: "u_emp1",
					vehiculoId: "veh_emp2",
					servicioId: "srv-2",
				}),
			).rejects.toThrow("No autorizado para modificar este vehículo");

			// Legítimo add servicio
			await (addServicioVehiculo as any)._handler(ctx, {
				usuarioId: "u_emp1",
				vehiculoId: "veh_emp1",
				descripcion: "Mantenimiento vinil",
				costo: 80,
				fecha: "2026-10-02",
				estado: "Completado",
			});
			const veh1 = store.vehiculos.find((v) => v._id === "veh_emp1");
			expect(veh1?.servicios).toHaveLength(2);
		});
	});

	describe("5. convex/lotesProduccion.ts y convex/placasStock.ts", () => {
		it("actualizarEstadoLote es internalMutation (no expuesta públicamente)", () => {
			expect((actualizarEstadoLote as any).isPublic).not.toBe(true);
		});

		it("cambiarEstadoLote y agregarComentarioLote: exigen producir_lotes y validan empresa", async () => {
			const fixture = createSecurityFixture();
			const { ctx, store } = createMockCtx({
				...fixture,
				lotesProduccion: [
					{ _id: "lote_emp1", empresaId: "emp_1", sucursalId: "suc_1", numero: "LOTE-0001", estado: "En Producción", comentarios: [] },
					{ _id: "lote_emp2", empresaId: "emp_2", sucursalId: "suc_3", numero: "LOTE-0002", estado: "En Producción", comentarios: [] },
				],
			});

			// Sin permiso
			await expect(
				(cambiarEstadoLote as any)._handler(ctx, {
					usuarioId: "u_noperms",
					loteId: "lote_emp1",
					estado: "Terminado",
				}),
			).rejects.toThrow("No tienes permiso para realizar esta acción: producir_lotes");

			// Cross-tenant cambiarEstadoLote
			await expect(
				(cambiarEstadoLote as any)._handler(ctx, {
					usuarioId: "u_emp1",
					loteId: "lote_emp2",
					estado: "Terminado",
				}),
			).rejects.toThrow("No autorizado para modificar este lote");

			// Cross-tenant agregarComentarioLote
			await expect(
				(agregarComentarioLote as any)._handler(ctx, {
					usuarioId: "u_emp1",
					loteId: "lote_emp2",
					texto: "Comentario espía",
				}),
			).rejects.toThrow("No autorizado para comentar en este lote");

			// Legítimo cambiarEstadoLote
			await (cambiarEstadoLote as any)._handler(ctx, {
				usuarioId: "u_emp1",
				loteId: "lote_emp1",
				estado: "Terminado",
			});
			expect(store.lotesProduccion.find((l) => l._id === "lote_emp1")?.estado).toBe("Terminado");

			// Legítimo agregarComentarioLote
			await (agregarComentarioLote as any)._handler(ctx, {
				usuarioId: "u_emp1",
				loteId: "lote_emp1",
				texto: "Lote finalizado correctamente",
			});
			const loteActual = store.lotesProduccion.find((l) => l._id === "lote_emp1");
			expect(loteActual?.comentarios).toHaveLength(1);
			expect(loteActual?.comentarios[0].texto).toBe("Lote finalizado correctamente");
		});

		it("placasStock: asignar, marcar instalada y liberar validan que el lote pertenezca a la empresa", async () => {
			const fixture = createSecurityFixture();
			const { ctx, store } = createMockCtx({
				...fixture,
				lotesProduccion: [
					{ _id: "lote_emp1", empresaId: "emp_1", sucursalId: "suc_1", numero: "LOTE-0001", estado: "Terminado" },
					{ _id: "lote_emp2", empresaId: "emp_2", sucursalId: "suc_3", numero: "LOTE-0002", estado: "Terminado" },
				],
				ordenesTrabajo: [
					{ _id: "ord_emp1", empresaId: "emp_1", sucursalId: "suc_1", numero: "OT-0001", estado: "En Proceso" },
					{ _id: "ord_emp2", empresaId: "emp_2", sucursalId: "suc_3", numero: "OT-0002", estado: "En Proceso" },
				],
				vehiculos: [
					{ _id: "veh_1", empresaId: "emp_1", placa: "PAA-1111" },
				],
				placasStock: [
					{ _id: "plk_emp1", loteId: "lote_emp1", material: "acrilico", estado: "Disponible" },
					{ _id: "plk_emp2", loteId: "lote_emp2", material: "acrilico", estado: "Disponible" },
					{ _id: "plk_emp2_asig", loteId: "lote_emp2", material: "acrilico", estado: "Asignada", ordenTrabajoId: "ord_emp2" },
				],
			});

			// u_emp1 intentando asignar placa de lote de emp_2
			await expect(
				(asignarPlacaStockAOrden as any)._handler(ctx, {
					usuarioId: "u_emp1",
					placaStockId: "plk_emp2",
					ordenTrabajoId: "ord_emp1",
					vehiculoId: "veh_1",
				}),
			).rejects.toThrow("No autorizado para asignar placas de otra empresa");

			// u_emp1 intentando marcar instalada placa de emp_2
			await expect(
				(marcarPlacaInstalada as any)._handler(ctx, {
					usuarioId: "u_emp1",
					placaStockId: "plk_emp2_asig",
				}),
			).rejects.toThrow("No autorizado para modificar placas de otra empresa");

			// u_emp1 intentando liberar placa de emp_2
			await expect(
				(liberarPlacaAsignada as any)._handler(ctx, {
					usuarioId: "u_emp1",
					placaStockId: "plk_emp2_asig",
				}),
			).rejects.toThrow("No autorizado para liberar placas de otra empresa");

			// Asignación legítima
			await (asignarPlacaStockAOrden as any)._handler(ctx, {
				usuarioId: "u_emp1",
				placaStockId: "plk_emp1",
				ordenTrabajoId: "ord_emp1",
				vehiculoId: "veh_1",
			});
			expect(store.placasStock.find((p) => p._id === "plk_emp1")?.estado).toBe("Asignada");

			// Marcar instalada legítima
			await (marcarPlacaInstalada as any)._handler(ctx, {
				usuarioId: "u_emp1",
				placaStockId: "plk_emp1",
			});
			expect(store.placasStock.find((p) => p._id === "plk_emp1")?.estado).toBe("Instalada");
		});
	});

	describe("6. convex/seed.ts y convex/permisos.ts", () => {
		it("populate en seed.ts es internalMutation (no expuesta públicamente)", () => {
			expect((populate as any).isPublic).not.toBe(true);
		});

		it("seedPermisos en permisos.ts es internalMutation (no expuesta públicamente)", () => {
			expect((seedPermisos as any).isPublic).not.toBe(true);
		});
	});
});
